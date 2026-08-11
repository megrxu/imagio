import exifr from "exifr";
import type { ImageExifMetadata, ImageMetaData, RemoteImage } from "$lib/types";

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

const fixedLegacyTable: LegacyTableInfo = { name: "images", idColumn: "uuid" };
const defaultCategoryCandidates = ["public", "private"];
const exifPickKeys = [
	"Make",
	"Model",
	"LensModel",
	"DateTimeOriginal",
	"CreateDate",
	"ModifyDate",
	"ISO",
	"FocalLength",
	"FNumber",
	"ExposureTime",
] as const;

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

export function buildObjectKey(id: string, variant = "original") {
	return `images/${id}/${variant}`;
}

function buildLegacyObjectKey(id: string, variant = "original", category?: string) {
	const normalizedCategory = category?.trim();
	return normalizedCategory ? `images/${normalizedCategory}/${id}/${variant}` : `images/${id}/${variant}`;
}

function buildPublicUrl(id: string, variant = "original") {
	return `/delivery/${id}/${variant}`;
}

function buildLegacySourceCandidates(id: string, category: string, originalName?: string): string[] {
	const candidates = new Set<string>();
	const normalizedCategory = category?.trim() || "public";
	const basePrefix = `images/${normalizedCategory}`;
	const extensions = ["JPEG", "PNG"];

	for (const ext of extensions) {
		candidates.add(`${basePrefix}/${id}.${ext}`);
	}
	candidates.add(`${basePrefix}/${id}`);
	candidates.add(`${basePrefix}/${id}/original`);

	if (typeof originalName === "string") {
		const trimmed = originalName.trim();
		if (trimmed) {
			candidates.add(`${basePrefix}/${trimmed}`);
			for (const ext of extensions) {
				candidates.add(`${basePrefix}/${trimmed}.${ext}`);
			}
		}
	}

	return [...candidates];
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

async function materializeObjectBody(body: R2ObjectLike["body"]): Promise<ArrayBuffer | string | null> {
	if (body == null) {
		return null;
	}
	if (typeof body === "string" || body instanceof ArrayBuffer) {
		return body;
	}
	return await new Response(body).arrayBuffer();
}

function toIsoString(value: unknown): string | undefined {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString();
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed || undefined;
	}
	return undefined;
}

function toNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function normalizeExifMetadata(input: unknown): ImageExifMetadata | undefined {
	if (!input || typeof input !== "object") {
		return undefined;
	}

	const source = input as Record<string, unknown>;
	const exif: ImageExifMetadata = {
		make: typeof source.make === "string" ? source.make : undefined,
		model: typeof source.model === "string" ? source.model : undefined,
		lensModel: typeof source.lensModel === "string" ? source.lensModel : undefined,
		dateTimeOriginal: toIsoString(source.dateTimeOriginal),
		createDate: toIsoString(source.createDate),
		modifyDate: toIsoString(source.modifyDate),
		iso: toNumber(source.iso),
		focalLength: toNumber(source.focalLength),
		fNumber: toNumber(source.fNumber),
		exposureTime:
			typeof source.exposureTime === "string"
				? source.exposureTime
				: typeof source.exposureTime === "number"
					? String(source.exposureTime)
					: undefined,
	};

	return Object.values(exif).some((value) => value !== undefined) ? exif : undefined;
}

function parseExifMetadata(value: unknown): ImageExifMetadata | undefined {
	if (typeof value !== "string" || !value.trim()) {
		return undefined;
	}
	try {
		return normalizeExifMetadata(JSON.parse(value));
	} catch {
		return undefined;
	}
}

function buildImageMetadata(
	category: string,
	input?: Partial<ImageMetaData>,
	defaults?: { originalName?: string; uploadedAt?: string },
): ImageMetaData {
	const normalizedExif = normalizeExifMetadata(input?.exif);
	const takenAt = toIsoString(input?.takenAt) ?? normalizedExif?.dateTimeOriginal;
	const createdAt = toIsoString(input?.createdAt) ?? normalizedExif?.createDate;
	const uploadedAt = toIsoString(input?.uploadedAt) ?? defaults?.uploadedAt;

	return {
		tags: input?.tags ?? [],
		category: input?.category ?? category,
		originalName: input?.originalName ?? defaults?.originalName,
		uploadedAt,
		takenAt,
		createdAt,
		exif: normalizedExif,
	};
}

function metadataFromCustomMetadata(
	customMetadata: Record<string, string> | undefined,
	category: string,
	defaults?: { originalName?: string; uploadedAt?: string },
): ImageMetaData {
	return buildImageMetadata(
		category,
		{
			tags: parseTags(customMetadata?.tags),
			category: customMetadata?.category ?? category,
			originalName: customMetadata?.originalName,
			uploadedAt: customMetadata?.uploadedAt,
			takenAt: customMetadata?.takenAt,
			createdAt: customMetadata?.createdAt,
			exif: parseExifMetadata(customMetadata?.exif),
		},
		defaults,
	);
}

function serializeMetadata(metadata: ImageMetaData): Record<string, string> {
	const serialized: Record<string, string> = {
		category: metadata.category ?? "public",
		originalName: metadata.originalName ?? "",
		tags: JSON.stringify(metadata.tags ?? []),
		uploadedAt: metadata.uploadedAt ?? new Date().toISOString(),
	};

	if (metadata.takenAt) {
		serialized.takenAt = metadata.takenAt;
	}
	if (metadata.createdAt) {
		serialized.createdAt = metadata.createdAt;
	}
	if (metadata.exif) {
		serialized.exif = JSON.stringify(metadata.exif);
	}

	return serialized;
}

async function extractExifMetadata(fileData: ArrayBuffer): Promise<Partial<ImageMetaData>> {
	try {
		const parsed = await exifr.parse(fileData, { pick: [...exifPickKeys] });
		if (!parsed || typeof parsed !== "object") {
			return {};
		}

		const source = parsed as Record<string, unknown>;
		const exif = normalizeExifMetadata({
			make: source.Make,
			model: source.Model,
			lensModel: source.LensModel,
			dateTimeOriginal: source.DateTimeOriginal,
			createDate: source.CreateDate,
			modifyDate: source.ModifyDate,
			iso: source.ISO,
			focalLength: source.FocalLength,
			fNumber: source.FNumber,
			exposureTime: source.ExposureTime,
		});

		return {
			takenAt: exif?.dateTimeOriginal,
			createdAt: exif?.createDate,
			exif,
		};
	} catch {
		return {};
	}
}

function normalizeRemoteImage(input: Partial<RemoteImage> & { uuid: string; category: string }): RemoteImage {
	const metadata = buildImageMetadata(input.category, input.meta, {
		originalName: input.name ?? input.uuid,
		uploadedAt: input.uploadedAt,
	});

	return {
		uuid: input.uuid,
		category: input.category,
		name: input.name ?? metadata.originalName ?? input.uuid,
		deliveryUrl: input.deliveryUrl ?? buildPublicUrl(input.uuid, "original"),
		uploadedAt: metadata.uploadedAt ?? new Date().toISOString(),
		meta: metadata,
	};
}

function sortImagesByUploadedAt(images: RemoteImage[]): RemoteImage[] {
	return [...images].sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
}

async function listR2ImagesByCategory(platform: PlatformLike, category: string): Promise<RemoteImage[]> {
	const bucket = getR2Bucket(platform);
	if (!bucket) {
		return [];
	}

	const items: RemoteImage[] = [];
	const seen = new Set<string>();
	let cursor: string | undefined;
	let truncated = true;
	let loops = 0;
	const maxLoops = 200;

	while (truncated && loops < maxLoops) {
		loops += 1;
		const response = await bucket.list({
			prefix: "images/",
			limit: 1000,
			cursor,
		});

		for (const object of response.objects) {
			const image = imageFromListObject(object);
			if (!image) continue;
			if (image.category !== category) continue;
			if (seen.has(image.uuid)) continue;
			seen.add(image.uuid);
			items.push(image);
		}

		truncated = Boolean(response.truncated);
		cursor = response.cursor;
	}

	return sortImagesByUploadedAt(items);
}

function parseOriginalKey(key: string): { category?: string; uuid: string } | null {
	const match = key.match(/^images\/([^/]+)\/([^/]+)\/original$/i);
	if (match) {
		return { category: match[1], uuid: match[2] };
	}

	const simpleMatch = key.match(/^images\/([^/]+)\/original$/i);
	if (simpleMatch) {
		return { uuid: simpleMatch[1] };
	}

	return null;
}

function getUploadedIso(uploaded?: Date | string, customUploadedAt?: string) {
	if (typeof customUploadedAt === "string" && customUploadedAt) {
		return customUploadedAt;
	}
	if (!uploaded) return new Date().toISOString();
	if (uploaded instanceof Date) return uploaded.toISOString();
	return uploaded;
}

function toIsoIfEpoch(input: unknown): string | null {
	if (typeof input === "number" && Number.isFinite(input) && input > 0) {
		return new Date(input).toISOString();
	}
	if (typeof input === "string") {
		const trimmed = input.trim();
		if (!trimmed) return null;
		if (/^\d+$/.test(trimmed)) {
			const value = Number(trimmed);
			if (Number.isFinite(value) && value > 0) {
				return new Date(value).toISOString();
			}
		}
		return trimmed;
	}
	return null;
}

function imageFromListObject(item: R2ListObjectLike): RemoteImage | null {
	const parsed = parseOriginalKey(item.key);
	if (!parsed) return null;
	const categoryFromMeta = item.customMetadata?.category;
	const resolvedCategory = categoryFromMeta || parsed.category || "public";
	const metadata = metadataFromCustomMetadata(item.customMetadata, resolvedCategory, {
		originalName: parsed.uuid,
		uploadedAt: getUploadedIso(item.uploaded, item.customMetadata?.uploadedAt),
	});
	return normalizeRemoteImage({
		uuid: parsed.uuid,
		category: resolvedCategory,
		name: metadata.originalName || parsed.uuid,
		uploadedAt: metadata.uploadedAt,
		meta: metadata,
	});
}

async function findStoredOriginalObject(
	platform: PlatformLike,
	id: string,
	categoryHint?: string,
): Promise<{ key: string; object: R2ObjectLike; resolvedCategory: string } | null> {
	const bucket = getR2Bucket(platform);
	if (!bucket) {
		return null;
	}

	const canonicalKey = buildObjectKey(id, "original");
	const keyCandidates = [canonicalKey];
	if (categoryHint) {
		keyCandidates.push(buildLegacyObjectKey(id, "original", categoryHint));
	}
	for (const category of defaultCategoryCandidates) {
		if (categoryHint && category === categoryHint) continue;
		keyCandidates.push(buildLegacyObjectKey(id, "original", category));
	}

	for (const key of keyCandidates) {
		const object = await bucket.get(key);
		if (!object?.body) continue;
		const parsed = parseOriginalKey(key);
		const resolvedCategory = object.customMetadata?.category || categoryHint || parsed?.category || "public";
		return { key, object, resolvedCategory };
	}

	return null;
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
			prefix: "images/",
			limit: Math.max(limit * 2, 50),
			cursor: nextCursor,
		});

		for (const object of response.objects) {
			const image = imageFromListObject(object);
			if (!image) continue;
			if (image.category !== category) continue;
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

async function discoverLegacyTable(platform: PlatformLike, db: D1DatabaseLike): Promise<LegacyTableInfo | null> {
	void platform;
	try {
		// Legacy schema is fixed by design.
		await runAll(db, `SELECT ${quoteIdentifier(fixedLegacyTable.idColumn)} FROM ${quoteIdentifier(fixedLegacyTable.name)} LIMIT 1`);
		return fixedLegacyTable;
	} catch {
		return null;
	}
}

function normalizeLegacyRow(row: Record<string, unknown>, idColumn: "uuid" | "id"): RemoteImage | null {
	const rawId = row[idColumn] ?? row.uuid ?? row.id;
	if (typeof rawId !== "string" || !rawId) return null;

	const category = typeof row.category === "string" && row.category ? row.category : "public";
	const name = typeof row.name === "string" && row.name ? row.name : rawId;
	const uploadedAt =
		toIsoIfEpoch(row.uploaded_at) ?? toIsoIfEpoch(row.create_time) ?? new Date().toISOString();

	let parsedMeta: Partial<ImageMetaData> = {};
	if (typeof row.meta === "string" && row.meta.trim()) {
		try {
			parsedMeta = JSON.parse(row.meta) as Partial<ImageMetaData>;
		} catch {
			parsedMeta = {};
		}
	}

	const metadata = buildImageMetadata(category, {
		...parsedMeta,
		tags: parsedMeta.tags ? parseTags(parsedMeta.tags) : parseTags(row.tags),
		category: parsedMeta.category ?? category,
		originalName: parsedMeta.originalName ?? name,
		uploadedAt: parsedMeta.uploadedAt ?? uploadedAt,
		takenAt: toIsoIfEpoch(parsedMeta.takenAt) ?? undefined,
		createdAt: toIsoIfEpoch(parsedMeta.createdAt) ?? undefined,
		exif: normalizeExifMetadata(parsedMeta.exif),
	}, {
		originalName: name,
		uploadedAt,
	});

	const resolvedCategory = metadata.category || category || "public";
	return normalizeRemoteImage({
		uuid: rawId,
		category: resolvedCategory,
		name,
		uploadedAt: metadata.uploadedAt,
		meta: metadata,
	});
}

export async function listLegacyImagesByCategory(platform: PlatformLike, category: string): Promise<RemoteImage[]> {
	try {
		const db = getD1Database(platform);
		if (!db) return [];

		const legacy = await discoverLegacyTable(platform, db);
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

		const legacy = await discoverLegacyTable(platform, db);
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
	const configured = getEnv(platform).S3_PUBLIC_ACCESS_ENDPOINT;
	if (typeof configured === "string" && configured.trim()) {
		return configured.trim();
	}
	return "https://imagio.r2.xugr.me";
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
	requestedId?: string,
): Promise<RemoteImage> {
	const bucket = getR2Bucket(platform);
	if (!bucket) {
		throw new Error("R2 bucket binding is not configured.");
	}

	const id = (requestedId ?? "").trim() || crypto.randomUUID();
	const key = buildObjectKey(id, "original");
	const uploadedAt = new Date().toISOString();
	const fileData = await file.arrayBuffer();
	const extractedMetadata = await extractExifMetadata(fileData);
	const nextMetadata = buildImageMetadata(category, {
		...extractedMetadata,
		...metadata,
		tags: metadata?.tags ?? [],
		originalName: metadata?.originalName ?? file.name,
		uploadedAt,
		exif: {
			...(extractedMetadata.exif ?? {}),
			...(metadata?.exif ?? {}),
		},
	}, {
		originalName: file.name,
		uploadedAt,
	});

	await bucket.put(key, fileData, {
		httpMetadata: {
			contentType: file.type || "application/octet-stream",
		},
		customMetadata: serializeMetadata(nextMetadata),
	});

	return normalizeRemoteImage({
		uuid: id,
		category,
		name: file.name,
		meta: nextMetadata,
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

export async function listImagesByCategorySorted(
	platform: PlatformLike,
	category: string,
): Promise<{ items: RemoteImage[]; source: "r2" | "d1-fallback" | "empty" }> {
	try {
		const fromR2 = await listR2ImagesByCategory(platform, category);
		if (fromR2.length > 0) {
			return { items: fromR2, source: "r2" };
		}

		const fromD1 = await listLegacyImagesByCategory(platform, category);
		if (fromD1.length > 0) {
			return { items: fromD1, source: "d1-fallback" };
		}

		return { items: [], source: "empty" };
	} catch (error) {
		console.error("listImagesByCategorySorted failed", error);
		return { items: [], source: "empty" };
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
		const storedObject = await findStoredOriginalObject(platform, id, categoryHint);
		if (storedObject) {
			const metadata = metadataFromCustomMetadata(storedObject.object.customMetadata, storedObject.resolvedCategory, {
				originalName: id,
				uploadedAt: storedObject.object.customMetadata?.uploadedAt,
			});
			return normalizeRemoteImage({
				uuid: id,
				category: storedObject.resolvedCategory,
				name: metadata.originalName ?? id,
				uploadedAt: metadata.uploadedAt,
				meta: metadata,
			});
		}

		const canonicalKey = buildObjectKey(id, "original");
		const legacyCandidates = Array.from(
			new Set(
				(defaultCategoryCandidates.concat(categoryHint ? [categoryHint] : [])).flatMap((category) =>
					buildLegacySourceCandidates(id, category, undefined),
			),
			),
		);
		const migrated = await getOrMigrateObject(platform, canonicalKey, {
			migrateFromLegacy: true,
			legacySourceKeys: legacyCandidates,
		});
		if (migrated?.body) {
			const resolvedCategory = categoryHint || "public";
			return normalizeRemoteImage({
				uuid: id,
				category: resolvedCategory,
				name: id,
				uploadedAt: undefined,
				meta: {
					tags: [],
					category: resolvedCategory,
				},
			});
		}

		const legacyByHint = await getLegacyImageById(platform, id, categoryHint);
		if (legacyByHint) {
			return legacyByHint;
		}

		if (categoryHint) {
			// Some historical rows have mismatched/dirty category values.
			// Retry without category constraint for backward compatibility.
			const legacyById = await getLegacyImageById(platform, id);
			if (legacyById) {
				return legacyById;
			}
		}

		return null;
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
	const nextMetadata = buildImageMetadata(nextCategory, {
		...existing.meta,
		...metadata,
		tags: metadata.tags ?? existing.meta?.tags ?? [],
		originalName: metadata.originalName ?? existing.meta?.originalName ?? existing.name ?? id,
		uploadedAt: metadata.uploadedAt ?? existing.meta?.uploadedAt ?? existing.uploadedAt ?? new Date().toISOString(),
		exif: {
			...(existing.meta?.exif ?? {}),
			...(metadata.exif ?? {}),
		},
	}, {
		originalName: existing.name ?? id,
		uploadedAt: existing.uploadedAt,
	});
	const storedObject = bucket ? await findStoredOriginalObject(platform, id, existing.category) : null;

	if (bucket && storedObject && existing.category !== nextCategory && storedObject.key.startsWith(`images/${existing.category}/${id}/`)) {
		const oldPrefix = `images/${existing.category}/${id}/`;
		const listing = await bucket.list({ prefix: oldPrefix });
		for (const item of listing.objects) {
			const object = await bucket.get(item.key);
			if (!object) continue;
			const body = await materializeObjectBody(object?.body);
			if (!body) continue;
			const newKey = item.key.replace(oldPrefix, `images/${nextCategory}/${id}/`);
			await bucket.put(newKey, body, {
				httpMetadata: object.httpMetadata,
				customMetadata: serializeMetadata(nextMetadata),
			});
			await bucket.delete(item.key);
		}
	} else if (bucket) {
		const target = storedObject;
		if (!target) {
			return normalizeRemoteImage({
				...existing,
				category: nextCategory,
				name: nextMetadata.originalName,
				uploadedAt: nextMetadata.uploadedAt,
				meta: nextMetadata,
			});
		}
		const body = await materializeObjectBody(target.object.body);
		if (body) {
			const targetKey =
				existing.category !== nextCategory && target.key.startsWith(`images/${existing.category}/${id}/`)
					? target.key.replace(`images/${existing.category}/${id}/`, `images/${nextCategory}/${id}/`)
					: target.key;
			await bucket.put(targetKey, body, {
				httpMetadata: target.object.httpMetadata,
				customMetadata: serializeMetadata(nextMetadata),
			});
			if (targetKey !== target.key) {
				await bucket.delete(target.key);
			}
		}
	}

	return normalizeRemoteImage({
		...existing,
		category: nextCategory,
		name: nextMetadata.originalName,
		uploadedAt: nextMetadata.uploadedAt,
		meta: nextMetadata,
	});
}

export async function migrateLegacyD1ToR2(platform: PlatformLike): Promise<{
	total: number;
	migrated: number;
	skipped: number;
	categories: string[];
	diagnostic?: {
		r2AlreadyPresent: number;
		legacyFetchSuccess: number;
		legacyFetchMiss: number;
		sampleMisses: Array<{ id: string; category: string; attempted: string[] }>;
	};
}> {
	const bucket = getR2Bucket(platform);
	if (!bucket) {
		throw new Error("R2 bucket binding is not configured.");
	}

	const db = getD1Database(platform);
	if (!db) {
		return { total: 0, migrated: 0, skipped: 0, categories: [] };
	}

	const legacy = await discoverLegacyTable(platform, db);
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
	let r2AlreadyPresent = 0;
	let legacyFetchSuccess = 0;
	let legacyFetchMiss = 0;
	const sampleMisses: Array<{ id: string; category: string; attempted: string[] }> = [];

	for (const image of images) {
		categories.add(image.category);
		const key = buildObjectKey(image.uuid, "original");
		let object = await bucket.get(key);
		if (object?.body) {
			r2AlreadyPresent += 1;
		}
		if (!object?.body) {
			const attempted = buildLegacySourceCandidates(image.uuid, image.category, image.name);
			object = await getOrMigrateObject(platform, key, {
				migrateFromLegacy: true,
				legacySourceKeys: attempted,
			});
			if (object?.body) {
				legacyFetchSuccess += 1;
			} else {
				legacyFetchMiss += 1;
				if (sampleMisses.length < 12) {
					sampleMisses.push({ id: image.uuid, category: image.category, attempted });
				}
			}
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
		diagnostic: {
			r2AlreadyPresent,
			legacyFetchSuccess,
			legacyFetchMiss,
			sampleMisses,
		},
	};
}

export async function debugStorageSnapshot(platform: PlatformLike, category: string, sampleId?: string) {
	const db = getD1Database(platform);
	let legacyTable: LegacyTableInfo | null = null;
	let legacyTotalCount: number | null = null;
	if (db) {
		legacyTable = await discoverLegacyTable(platform, db);
		if (legacyTable) {
			const tableName = quoteIdentifier(legacyTable.name);
			const countRow = await runFirst<{ count: number | string }>(db, `SELECT COUNT(*) AS count FROM ${tableName}`);
			const rawCount = countRow?.count;
			if (typeof rawCount === "number") {
				legacyTotalCount = Number.isFinite(rawCount) ? rawCount : null;
			} else if (typeof rawCount === "string") {
				const parsed = Number(rawCount);
				legacyTotalCount = Number.isFinite(parsed) ? parsed : null;
			}
		}
	}

	const r2Page = await listR2ImagesPageByCategory(platform, category, 20);
	const d1Items = await listLegacyImagesByCategory(platform, category);
	const sample = sampleId ? await getImageById(platform, sampleId, category) : null;
	const sampleSource = sampleId
		? (await getR2Bucket(platform)?.get(buildObjectKey(sampleId, "original")))?.body
			? "r2"
			: sample
				? "d1-fallback"
				: "not-found"
		: "n/a";

	return {
		category,
		legacyTable,
		legacyTotalCount,
		r2CountEstimate: r2Page.items.length,
		d1Count: d1Items.length,
		nextCursor: r2Page.nextCursor,
		source: r2Page.source,
		sampleId: sampleId ?? null,
		sampleSource,
		sample,
	};
}
