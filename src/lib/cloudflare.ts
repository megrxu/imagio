import type { ImageMetaData, RemoteImage } from "$lib/types";

export interface R2ObjectLike {
	body?: ReadableStream | ArrayBuffer | string | null;
	httpMetadata?: { contentType?: string };
	customMetadata?: Record<string, string>;
}

export interface R2ListObjectLike {
	key: string;
	uploaded?: Date | string;
	customMetadata?: Record<string, string>;
}

export interface R2ListResultLike {
	objects: R2ListObjectLike[];
	truncated?: boolean;
	cursor?: string;
}

export interface R2BucketLike {
	put(
		key: string,
		value: ArrayBuffer | ReadableStream | string,
		options?: {
			httpMetadata?: { contentType?: string };
			customMetadata?: Record<string, string>;
		},
	): Promise<unknown>;
	get(key: string): Promise<R2ObjectLike | null>;
	delete(key: string): Promise<unknown>;
	list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<R2ListResultLike>;
}

interface D1StatementLike {
	bind(...values: unknown[]): D1StatementLike;
	first<T = Record<string, unknown>>(): Promise<T | null>;
	all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface D1DatabaseLike {
	prepare(query: string): D1StatementLike;
}

type CloudflareEnv = {
	S3_PUBLIC_ACCESS_ENDPOINT?: string;
	IMAGIO_R2?: R2BucketLike;
	IMAGIO_DB?: D1DatabaseLike;
	TOKEN?: string;
};

type PlatformLike = {
	env?: Record<string, unknown>;
} | undefined;

type LegacyTableInfo = {
	name: string;
	idColumn: "uuid" | "id";
};

export type ImageListPage = {
	items: RemoteImage[];
	nextCursor: string | null;
	source: "r2" | "d1-fallback" | "empty";
};

const legacyTableCacheKey = "__imagio_legacy_table_info";
const defaultCategoryCandidates = ["public", "private"];

function getEnv(platform: PlatformLike): CloudflareEnv {
	const env = platform?.env ?? {};
	return {
		S3_PUBLIC_ACCESS_ENDPOINT:
			typeof env.S3_PUBLIC_ACCESS_ENDPOINT === "string" ? env.S3_PUBLIC_ACCESS_ENDPOINT : undefined,
		IMAGIO_R2:
			typeof env.IMAGIO_R2 === "object" && env.IMAGIO_R2 !== null
				? (env.IMAGIO_R2 as R2BucketLike)
				: undefined,
		IMAGIO_DB:
			typeof env.IMAGIO_DB === "object" && env.IMAGIO_DB !== null
				? (env.IMAGIO_DB as D1DatabaseLike)
				: undefined,
		TOKEN: typeof env.TOKEN === "string" ? env.TOKEN : undefined,
	};
}

export function getR2Bucket(platform: PlatformLike): R2BucketLike | undefined {
	return getEnv(platform).IMAGIO_R2;
}

function getD1Database(platform: PlatformLike): D1DatabaseLike | undefined {
	return getEnv(platform).IMAGIO_DB;
}

export function isAdminRequest(request: Request, platform: PlatformLike): boolean {
	const token = getEnv(platform).TOKEN;
	if (!token) return false;
	const auth = request.headers.get("authorization") ?? "";
	return auth === `Bearer ${token}`;
}

function buildObjectKey(category: string, id: string, variant = "original") {
	return `images/${category}/${id}/${variant}`;
}

function buildPublicUrl(id: string, variant = "original") {
	return `/delivery/${id}/${variant}`;
}

function parseTags(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((item) => String(item)).filter(Boolean);
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return [];
		if (trimmed.startsWith("[")) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					return parsed.map((item) => String(item)).filter(Boolean);
				}
			} catch {
				// ignore and fallback to comma split
			}
		}
		return trimmed.split(",").map((tag) => tag.trim()).filter(Boolean);
	}
	return [];
}

function normalizeRemoteImage(input: Partial<RemoteImage> & { uuid: string; category: string }): RemoteImage {
	return {
		uuid: input.uuid,
		category: input.category,
		name: input.name ?? input.uuid,
		deliveryUrl: input.deliveryUrl ?? buildPublicUrl(input.uuid, "original"),
		uploadedAt: input.uploadedAt ?? new Date().toISOString(),
		meta: {
			tags: input.meta?.tags ?? [],
			category: input.meta?.category ?? input.category,
		},
	};
}

function sortImagesByUploadedAt(images: RemoteImage[]): RemoteImage[] {
	return [...images].sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
}

function parseOriginalKey(key: string): { category: string; uuid: string } | null {
	const match = key.match(/^images\/([^/]+)\/([^/]+)\/original$/i);
	if (!match) return null;
	return { category: match[1], uuid: match[2] };
}

function getUploadedIso(uploaded?: Date | string, customUploadedAt?: string) {
	if (typeof customUploadedAt === "string" && customUploadedAt) {
		return customUploadedAt;
	}
	if (!uploaded) return new Date().toISOString();
	if (uploaded instanceof Date) return uploaded.toISOString();
	return uploaded;
}

function imageFromListObject(item: R2ListObjectLike): RemoteImage | null {
	const parsed = parseOriginalKey(item.key);
	if (!parsed) return null;
	const tags = parseTags(item.customMetadata?.tags);
	const categoryFromMeta = item.customMetadata?.category;
	return normalizeRemoteImage({
		uuid: parsed.uuid,
		category: categoryFromMeta || parsed.category,
		name: item.customMetadata?.originalName || parsed.uuid,
		uploadedAt: getUploadedIso(item.uploaded, item.customMetadata?.uploadedAt),
		meta: {
			tags,
			category: categoryFromMeta || parsed.category,
		},
	});
}

async function listR2ImagesPageByCategory(
	platform: PlatformLike,
	category: string,
	limit: number,
	cursor?: string,
): Promise<ImageListPage> {
	const bucket = getR2Bucket(platform);
	if (!bucket) {
		return { items: [], nextCursor: null, source: "empty" };
	}

	let nextCursor: string | undefined = cursor;
	let truncated = true;
	const items: RemoteImage[] = [];
	const seen = new Set<string>();
	let loops = 0;
	const maxLoops = 6;

	while (items.length < limit && truncated && loops < maxLoops) {
		loops += 1;
		const response = await bucket.list({
			prefix: `images/${category}/`,
			limit: Math.max(limit * 2, 50),
			cursor: nextCursor,
		});

		for (const object of response.objects) {
			const image = imageFromListObject(object);
			if (!image) continue;
			if (seen.has(image.uuid)) continue;
			seen.add(image.uuid);
			items.push(image);
			if (items.length >= limit) break;
		}

		truncated = Boolean(response.truncated);
		nextCursor = response.cursor;
	}

	return {
		items: sortImagesByUploadedAt(items).slice(0, limit),
		nextCursor: truncated && nextCursor ? nextCursor : null,
		source: items.length > 0 ? "r2" : "empty",
	};
}

function safeIdentifier(name: string) {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function quoteIdentifier(name: string) {
	if (!safeIdentifier(name)) {
		throw new Error(`Unsafe SQL identifier: ${name}`);
	}
	return `"${name}"`;
}

async function runAll<T = Record<string, unknown>>(
	db: D1DatabaseLike,
	sql: string,
	params: unknown[] = [],
): Promise<T[]> {
	const statement = db.prepare(sql);
	const bound = params.length > 0 ? statement.bind(...params) : statement;
	const result = await bound.all<T>();
	return result.results ?? [];
}

async function runFirst<T = Record<string, unknown>>(
	db: D1DatabaseLike,
	sql: string,
	params: unknown[] = [],
): Promise<T | null> {
	const statement = db.prepare(sql);
	const bound = params.length > 0 ? statement.bind(...params) : statement;
	return await bound.first<T>();
}

function getLegacyTableCache(): LegacyTableInfo | null | undefined {
	const globalScope = globalThis as typeof globalThis & {
		[legacyTableCacheKey]?: LegacyTableInfo | null;
	};
	return globalScope[legacyTableCacheKey];
}

function setLegacyTableCache(info: LegacyTableInfo | null) {
	const globalScope = globalThis as typeof globalThis & {
		[legacyTableCacheKey]?: LegacyTableInfo | null;
	};
	globalScope[legacyTableCacheKey] = info;
}

async function discoverLegacyTable(db: D1DatabaseLike): Promise<LegacyTableInfo | null> {
	const cached = getLegacyTableCache();
	if (cached !== undefined) {
		return cached;
	}

	const tables = await runAll<{ name: string }>(
		db,
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
	);

	for (const table of tables) {
		if (!table.name || !safeIdentifier(table.name)) continue;
		if (table.name === "imagio_images") {
			const info: LegacyTableInfo = { name: table.name, idColumn: "uuid" };
			setLegacyTableCache(info);
			return info;
		}
	}

	for (const table of tables) {
		if (!table.name || !safeIdentifier(table.name)) continue;
		const pragma = await runAll<{ name: string }>(db, `PRAGMA table_info(${quoteIdentifier(table.name)})`);
		const columns = new Set(pragma.map((item) => item.name));
		if (!columns.has("category")) continue;
		if (columns.has("uuid")) {
			const info: LegacyTableInfo = { name: table.name, idColumn: "uuid" };
			setLegacyTableCache(info);
			return info;
		}
		if (columns.has("id")) {
			const info: LegacyTableInfo = { name: table.name, idColumn: "id" };
			setLegacyTableCache(info);
			return info;
		}
	}

	setLegacyTableCache(null);
	return null;
}

function normalizeLegacyRow(row: Record<string, unknown>, idColumn: "uuid" | "id"): RemoteImage | null {
	const rawId = row[idColumn] ?? row.uuid ?? row.id;
	if (typeof rawId !== "string" || !rawId) return null;

	const category = typeof row.category === "string" && row.category ? row.category : "public";
	const name = typeof row.name === "string" && row.name ? row.name : rawId;
	const uploadedAt =
		typeof row.uploaded_at === "string" && row.uploaded_at
			? row.uploaded_at
			: typeof row.create_time === "string" && row.create_time
				? row.create_time
				: new Date().toISOString();

	let tags: string[] = [];
	let metaCategory = category;
	if (typeof row.meta === "string" && row.meta.trim()) {
		try {
			const parsed = JSON.parse(row.meta) as Partial<ImageMetaData>;
			tags = parseTags(parsed.tags);
			metaCategory = parsed.category ?? category;
		} catch {
			tags = parseTags(row.tags);
		}
	} else {
		tags = parseTags(row.tags);
	}

	return normalizeRemoteImage({
		uuid: rawId,
		category,
		name,
		uploadedAt,
		meta: { tags, category: metaCategory },
	});
}

export async function listLegacyImagesByCategory(platform: PlatformLike, category: string): Promise<RemoteImage[]> {
	try {
		const db = getD1Database(platform);
		if (!db) return [];

		const legacy = await discoverLegacyTable(db);
		if (!legacy) return [];

		const tableName = quoteIdentifier(legacy.name);
		const rows = await runAll<Record<string, unknown>>(
			db,
			`SELECT * FROM ${tableName} WHERE category = ?`,
			[category],
		);

		return sortImagesByUploadedAt(
			rows
				.map((row) => normalizeLegacyRow(row, legacy.idColumn))
				.filter((item): item is RemoteImage => Boolean(item))
		);
	} catch (error) {
		console.error("listLegacyImagesByCategory failed", error);
		return [];
	}
}

export async function getLegacyImageById(platform: PlatformLike, id: string, categoryHint?: string): Promise<RemoteImage | null> {
	try {
		const db = getD1Database(platform);
		if (!db) return null;

		const legacy = await discoverLegacyTable(db);
		if (!legacy) return null;

		const tableName = quoteIdentifier(legacy.name);
		const idColumn = quoteIdentifier(legacy.idColumn);
		const sql = categoryHint
			? `SELECT * FROM ${tableName} WHERE ${idColumn} = ? AND category = ? LIMIT 1`
			: `SELECT * FROM ${tableName} WHERE ${idColumn} = ? LIMIT 1`;
		const row = await runFirst<Record<string, unknown>>(db, sql, categoryHint ? [id, categoryHint] : [id]);
		if (!row) return null;
		return normalizeLegacyRow(row, legacy.idColumn);
	} catch (error) {
		console.error("getLegacyImageById failed", error);
		return null;
	}
}

function getLegacyS3BaseUrl(platform: PlatformLike): string | undefined {
	const base = getEnv(platform).S3_PUBLIC_ACCESS_ENDPOINT;
	if (typeof base === "string" && base.trim()) {
		return base.trim();
	}
	return undefined;
}

async function tryReadLegacyObject(platform: PlatformLike, sourceKey: string): Promise<{ body: ArrayBuffer; contentType?: string } | null> {
	const baseUrl = getLegacyS3BaseUrl(platform);
	if (!baseUrl) {
		return null;
	}

	try {
		const source = sourceKey.startsWith("http://") || sourceKey.startsWith("https://")
			? sourceKey
			: new URL(sourceKey.replace(/^\/+/, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
		const response = await fetch(source);
		if (!response.ok) {
			return null;
		}
		return {
			body: await response.arrayBuffer(),
			contentType: response.headers.get("content-type") ?? undefined,
		};
	} catch {
		return null;
	}
}

export async function getOrMigrateObject(
	platform: PlatformLike,
	key: string,
	options?: { migrateFromLegacy?: boolean; legacySourceKeys?: string[] },
): Promise<R2ObjectLike | null> {
	const bucket = getR2Bucket(platform);
	if (!bucket) {
		return null;
	}

	const existing = await bucket.get(key);
	if (existing?.body) {
		return existing;
	}
	if (!options?.migrateFromLegacy) {
		return null;
	}

	const sources = [key, ...(options.legacySourceKeys ?? [])];
	for (const source of sources) {
		const legacy = await tryReadLegacyObject(platform, source);
		if (!legacy?.body) continue;

		await bucket.put(key, legacy.body, {
			httpMetadata: legacy.contentType ? { contentType: legacy.contentType } : undefined,
		});
		return {
			body: legacy.body,
			httpMetadata: legacy.contentType ? { contentType: legacy.contentType } : undefined,
		};
	}

	return null;
}

export async function uploadImageToCloudflare(
	file: File,
	category: string,
	platform: PlatformLike,
	metadata?: ImageMetaData,
): Promise<RemoteImage> {
	const bucket = getR2Bucket(platform);
	if (!bucket) {
		throw new Error("R2 bucket binding is not configured.");
	}

	const id = crypto.randomUUID();
	const key = buildObjectKey(category, id, "original");
	const uploadedAt = new Date().toISOString();
	const tags = metadata?.tags ?? [];

	await bucket.put(key, await file.arrayBuffer(), {
		httpMetadata: {
			contentType: file.type || "application/octet-stream",
		},
		customMetadata: {
			category,
			originalName: file.name,
			tags: JSON.stringify(tags),
			uploadedAt,
		},
	});

	return normalizeRemoteImage({
		uuid: id,
		category,
		name: file.name,
		meta: {
			tags,
			category,
		},
		uploadedAt,
		deliveryUrl: buildPublicUrl(id, "original"),
	});
}

export async function listImagesPage(
	platform: PlatformLike,
	category: string,
	limit: number,
	cursor?: string,
): Promise<ImageListPage> {
	try {
		const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 24;
		const fromR2 = await listR2ImagesPageByCategory(platform, category, safeLimit, cursor);
		if (fromR2.items.length > 0 || fromR2.nextCursor) {
			return fromR2;
		}

		if (cursor) {
			return { items: [], nextCursor: null, source: "empty" };
		}

		const fromD1 = await listLegacyImagesByCategory(platform, category);
		if (fromD1.length > 0) {
			return {
				items: fromD1.slice(0, safeLimit),
				nextCursor: null,
				source: "d1-fallback",
			};
		}

		return { items: [], nextCursor: null, source: "empty" };
	} catch (error) {
		console.error("listImagesPage failed", error);
		return { items: [], nextCursor: null, source: "empty" };
	}
}

export async function listImagesFromRegistry(platform: PlatformLike, category: string): Promise<RemoteImage[]> {
	const page = await listImagesPage(platform, category, 200);
	return page.items;
}

export async function getImageById(
	platform: PlatformLike,
	id: string,
	categoryHint?: string,
): Promise<RemoteImage | null> {
	try {
		if (categoryHint) {
			const key = buildObjectKey(categoryHint, id, "original");
			const object = await getR2Bucket(platform)?.get(key);
			if (object?.body) {
				return normalizeRemoteImage({
					uuid: id,
					category: categoryHint,
					name: object.customMetadata?.originalName ?? id,
					uploadedAt: object.customMetadata?.uploadedAt,
					meta: {
						tags: parseTags(object.customMetadata?.tags),
						category: categoryHint,
					},
				});
			}
		}

		const categories = categoryHint ? [categoryHint] : defaultCategoryCandidates;
		for (const category of categories) {
			const key = buildObjectKey(category, id, "original");
			const object = await getR2Bucket(platform)?.get(key);
			if (!object?.body) continue;
			return normalizeRemoteImage({
				uuid: id,
				category,
				name: object.customMetadata?.originalName ?? id,
				uploadedAt: object.customMetadata?.uploadedAt,
				meta: {
					tags: parseTags(object.customMetadata?.tags),
					category,
				},
			});
		}

		return await getLegacyImageById(platform, id, categoryHint);
	} catch (error) {
		console.error("getImageById failed", error);
		return null;
	}
}

export async function deleteImageFromCloudflare(platform: PlatformLike, id: string): Promise<void> {
	const bucket = getR2Bucket(platform);
	if (!bucket) return;

	const image = await getImageById(platform, id);
	if (!image) return;

	const listing = await bucket.list({ prefix: `images/${image.category}/${id}/` });
	for (const item of listing.objects) {
		await bucket.delete(item.key);
	}
}

export function getImageDeliveryUrl(
	image: RemoteImage | null,
	variant: string,
	platform: PlatformLike,
): string | null {
	void platform;
	if (!image?.uuid) {
		return null;
	}
	if (typeof image.deliveryUrl === "string" && image.deliveryUrl) {
		return image.deliveryUrl;
	}
	return buildPublicUrl(image.uuid, variant);
}

export async function updateImageMetadata(
	platform: PlatformLike,
	id: string,
	metadata: ImageMetaData,
): Promise<RemoteImage | null> {
	const bucket = getR2Bucket(platform);
	const existing = await getImageById(platform, id);
	if (!existing) {
		return null;
	}

	const nextCategory = metadata.category ?? existing.category;
	const nextTags = metadata.tags ?? existing.meta?.tags ?? [];
	const nextOriginalName = metadata.originalName ?? existing.name ?? id;
	const nextUploadedAt = metadata.uploadedAt ?? existing.uploadedAt ?? new Date().toISOString();

	if (bucket && existing.category !== nextCategory) {
		const oldPrefix = `images/${existing.category}/${id}/`;
		const listing = await bucket.list({ prefix: oldPrefix });
		for (const item of listing.objects) {
			const object = await bucket.get(item.key);
			if (!object?.body) continue;
			const newKey = item.key.replace(oldPrefix, `images/${nextCategory}/${id}/`);
			await bucket.put(newKey, object.body, {
				httpMetadata: object.httpMetadata,
				customMetadata: {
					...(object.customMetadata ?? {}),
					category: nextCategory,
					tags: JSON.stringify(nextTags),
					originalName: nextOriginalName,
					uploadedAt: nextUploadedAt,
				},
			});
			await bucket.delete(item.key);
		}
	} else if (bucket) {
		const originalKey = buildObjectKey(existing.category, id, "original");
		const object = await bucket.get(originalKey);
		if (object?.body) {
			await bucket.put(originalKey, object.body, {
				httpMetadata: object.httpMetadata,
				customMetadata: {
					...(object.customMetadata ?? {}),
					category: existing.category,
					tags: JSON.stringify(nextTags),
					originalName: nextOriginalName,
					uploadedAt: nextUploadedAt,
				},
			});
		}
	}

	return normalizeRemoteImage({
		...existing,
		category: nextCategory,
		name: nextOriginalName,
		uploadedAt: nextUploadedAt,
		meta: {
			...existing.meta,
			...metadata,
			category: nextCategory,
			tags: nextTags,
		},
	});
}

export async function migrateLegacyD1ToR2(platform: PlatformLike): Promise<{
	total: number;
	migrated: number;
	skipped: number;
	categories: string[];
}> {
	const bucket = getR2Bucket(platform);
	if (!bucket) {
		throw new Error("R2 bucket binding is not configured.");
	}

	const db = getD1Database(platform);
	if (!db) {
		return { total: 0, migrated: 0, skipped: 0, categories: [] };
	}

	const legacy = await discoverLegacyTable(db);
	if (!legacy) {
		return { total: 0, migrated: 0, skipped: 0, categories: [] };
	}

	const tableName = quoteIdentifier(legacy.name);
	const rows = await runAll<Record<string, unknown>>(db, `SELECT * FROM ${tableName}`);
	const images = rows
		.map((row) => normalizeLegacyRow(row, legacy.idColumn))
		.filter((item): item is RemoteImage => Boolean(item));

	let migrated = 0;
	let skipped = 0;
	const categories = new Set<string>();

	for (const image of images) {
		categories.add(image.category);
		const key = buildObjectKey(image.category, image.uuid, "original");
		let object = await bucket.get(key);
		if (!object?.body) {
			object = await getOrMigrateObject(platform, key, {
				migrateFromLegacy: true,
				legacySourceKeys: [
					`${image.uuid}/${image.category}`,
					`${image.uuid}/${image.category}.jpg`,
					`${image.uuid}/${image.category}.jpeg`,
					`${image.uuid}/${image.category}.png`,
				],
			});
		}
		if (!object?.body) {
			skipped += 1;
			continue;
		}
		await bucket.put(key, object.body, {
			httpMetadata: object.httpMetadata,
			customMetadata: {
				category: image.category,
				originalName: image.name ?? image.uuid,
				tags: JSON.stringify(image.meta?.tags ?? []),
				uploadedAt: image.uploadedAt ?? new Date().toISOString(),
			},
		});
		migrated += 1;
	}

	return {
		total: images.length,
		migrated,
		skipped,
		categories: [...categories],
	};
}

export async function debugStorageSnapshot(platform: PlatformLike, category: string, sampleId?: string) {
	const r2Page = await listR2ImagesPageByCategory(platform, category, 20);
	const d1Items = await listLegacyImagesByCategory(platform, category);
	const sample = sampleId ? await getImageById(platform, sampleId, category) : null;
	const sampleSource = sampleId
		? (await getR2Bucket(platform)?.get(buildObjectKey(category, sampleId, "original")))?.body
			? "r2"
			: sample
				? "d1-fallback"
				: "not-found"
		: "n/a";

	return {
		category,
		r2CountEstimate: r2Page.items.length,
		d1Count: d1Items.length,
		nextCursor: r2Page.nextCursor,
		source: r2Page.source,
		sampleId: sampleId ?? null,
		sampleSource,
		sample,
	};
}
