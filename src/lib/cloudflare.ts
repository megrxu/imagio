import exifr from "exifr";
import type { ImageExifMetadata, ImageMetaData, RemoteImage } from "$lib/types";

export interface R2ObjectLike {
	body?: ReadableStream | ArrayBuffer | string | null;
	httpMetadata?: { contentType?: string };
}

export interface R2ListObjectLike {
	key: string;
	uploaded?: Date | string;
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
		},
	): Promise<unknown>;
	get(key: string): Promise<R2ObjectLike | null>;
	delete(key: string): Promise<unknown>;
	list(options?: {
		prefix?: string;
		limit?: number;
		cursor?: string;
		include?: Array<"httpMetadata">;
	}): Promise<R2ListResultLike>;
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
	IMAGIO_R2?: R2BucketLike;
	IMAGIO_DB?: D1DatabaseLike;
	IMAGES?: App.ImagesBinding;
	TOKEN?: string;
};

type PlatformLike = {
	env?: Record<string, unknown>;
} | undefined;

export type ImageListPage = {
	items: RemoteImage[];
	nextCursor: string | null;
	source: "d1-index" | "empty";
};

export type ImageSortMode = "uploaded" | "taken";

type D1ImageIndexRow = {
	id: string;
	object_key: string;
	uploaded_at_ms: number | string;
	taken_at_ms: number | string | null;
	created_at_ms: number | string | null;
	meta_json: string;
	updated_at_ms: number | string;
};

const d1ImageIndexTableName = "imagio_images";

const d1ImageIndexSchemaSql = [
	`CREATE TABLE IF NOT EXISTS ${d1ImageIndexTableName} (
		id TEXT PRIMARY KEY,
		object_key TEXT NOT NULL UNIQUE,
		uploaded_at_ms INTEGER NOT NULL,
		taken_at_ms INTEGER,
		created_at_ms INTEGER,
		meta_json TEXT NOT NULL CHECK (json_valid(meta_json)),
		updated_at_ms INTEGER NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS idx_imagio_images_category_uploaded
		ON ${d1ImageIndexTableName} (
			json_extract(meta_json, '$.category'),
			uploaded_at_ms DESC,
			id DESC
		)`,
	`CREATE INDEX IF NOT EXISTS idx_imagio_images_category_taken
		ON ${d1ImageIndexTableName} (
			json_extract(meta_json, '$.category'),
			(taken_at_ms IS NULL),
			taken_at_ms DESC,
			COALESCE(created_at_ms, uploaded_at_ms) DESC,
			uploaded_at_ms DESC,
			id DESC
		)`,
];

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

export function getImagesBinding(platform: PlatformLike): App.ImagesBinding | undefined {
	return getEnv(platform).IMAGES;
}

export function getDeliverySignatureSecret(platform: PlatformLike): string | undefined {
	return getEnv(platform).TOKEN;
}

function getD1Database(platform: PlatformLike): D1DatabaseLike | undefined {
	return getEnv(platform).IMAGIO_DB;
}

export function buildObjectKey(id: string, variant = "original") {
	return `images/${id}/${variant}`;
}

function buildPublicUrl(id: string, variant = "original") {
	return `/delivery/${id}/${variant}`;
}

function toBase64Url(value: ArrayBuffer): string {
	const bytes = new Uint8Array(value);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signDeliveryAccess(secret: string, payload: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
	return toBase64Url(signature);
}

export async function buildSignedDeliveryUrl(
	id: string,
	variant = "original",
	platform: PlatformLike,
	expiresInSeconds = 600,
): Promise<string> {
	const baseUrl = buildPublicUrl(id, variant);
	if (variant !== "original") {
		return baseUrl;
	}

	const secret = getDeliverySignatureSecret(platform);
	if (!secret) {
		return baseUrl;
	}

	const expiresAt = Math.floor(Date.now() / 1000) + Math.max(30, Math.floor(expiresInSeconds));
	const payload = `${id}:${variant}:${expiresAt}`;
	const signature = await signDeliveryAccess(secret, payload);
	return `${baseUrl}?exp=${expiresAt}&sig=${encodeURIComponent(signature)}`;
}

export async function verifySignedDeliveryAccess(
	secret: string,
	id: string,
	variant: string,
	requestUrl: string | URL,
): Promise<boolean> {
	const url = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
	const expiresAt = Number.parseInt(url.searchParams.get("exp") ?? "", 10);
	const signature = url.searchParams.get("sig") ?? "";
	if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000) || !signature) {
		return false;
	}

	const expectedSignature = await signDeliveryAccess(secret, `${id}:${variant}:${expiresAt}`);
	return signature === expectedSignature;
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
		uploadedAt: metadata.uploadedAt,
		meta: metadata,
	};
}

function getImageSortTimestamp(image: RemoteImage): string {
	return image.meta?.uploadedAt ?? image.meta?.createdAt ?? image.uploadedAt ?? "";
}

function getImageTakenSortTimestamp(image: RemoteImage): string {
	return image.meta?.takenAt ?? image.meta?.createdAt ?? image.meta?.uploadedAt ?? image.uploadedAt ?? "";
}

function parseSortableTimestamp(value: string): number {
	const trimmed = value.trim();
	if (!trimmed) return Number.NEGATIVE_INFINITY;

	const direct = Date.parse(trimmed);
	if (Number.isFinite(direct)) {
		return direct;
	}

	const normalizedSlash = trimmed.replace(/\//g, "-");
	const slashParsed = Date.parse(normalizedSlash);
	if (Number.isFinite(slashParsed)) {
		return slashParsed;
	}

	const exifStyle = trimmed.match(/^(\d{4}):(\d{1,2}):(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
	if (exifStyle) {
		const [, year, month, day, hour = "0", minute = "0", second = "0"] = exifStyle;
		const isoLike = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`;
		const exifParsed = Date.parse(isoLike);
		if (Number.isFinite(exifParsed)) {
			return exifParsed;
		}
	}

	return Number.NEGATIVE_INFINITY;
}

function sortImagesByUploadedAt(images: RemoteImage[], mode: ImageSortMode = "uploaded"): RemoteImage[] {
	const resolveTimestamp = mode === "taken" ? getImageTakenSortTimestamp : getImageSortTimestamp;
	return [...images].sort((a, b) => {
		if (mode === "taken") {
			const aTakenRaw = a.meta?.takenAt ?? "";
			const bTakenRaw = b.meta?.takenAt ?? "";
			const aTaken = parseSortableTimestamp(aTakenRaw);
			const bTaken = parseSortableTimestamp(bTakenRaw);
			const aHasTaken = aTakenRaw.trim().length > 0 && aTaken !== Number.NEGATIVE_INFINITY;
			const bHasTaken = bTakenRaw.trim().length > 0 && bTaken !== Number.NEGATIVE_INFINITY;

			if (aHasTaken !== bHasTaken) {
				return aHasTaken ? -1 : 1;
			}
			if (aHasTaken && bHasTaken && bTaken !== aTaken) {
				return bTaken - aTaken;
			}
		}

		const aValue = resolveTimestamp(a);
		const bValue = resolveTimestamp(b);
		const byTime = parseSortableTimestamp(bValue) - parseSortableTimestamp(aValue);
		if (byTime !== 0) {
			return byTime;
		}

		const byUploaded = parseSortableTimestamp(getImageSortTimestamp(b)) - parseSortableTimestamp(getImageSortTimestamp(a));
		if (byUploaded !== 0) {
			return byUploaded;
		}

		return bValue.localeCompare(aValue);
	});
}

async function getImageFromD1IndexById(platform: PlatformLike, id: string): Promise<RemoteImage | null> {
	const db = getD1Database(platform);
	if (!db) {
		return null;
	}

	await ensureD1ImageIndexSchema(db);
	const row = await runFirst<D1ImageIndexRow>(
		db,
		`SELECT id, object_key, uploaded_at_ms, taken_at_ms, created_at_ms, meta_json, updated_at_ms
		 FROM ${d1ImageIndexTableName}
		 WHERE id = ?
		 LIMIT 1`,
		[id],
	);
	return row ? remoteImageFromD1IndexRow(row) : null;
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

let d1ImageSchemaReady = false;

async function ensureD1ImageIndexSchema(db: D1DatabaseLike): Promise<void> {
	if (d1ImageSchemaReady) {
		return;
	}

	for (const sql of d1ImageIndexSchemaSql) {
		await runAll(db, sql);
	}

	d1ImageSchemaReady = true;
}

function toEpochMs(value?: string): number | null {
	if (!value || typeof value !== "string") {
		return null;
	}
	const parsed = parseSortableTimestamp(value);
	return Number.isFinite(parsed) && parsed !== Number.NEGATIVE_INFINITY ? parsed : null;
}

function parseD1Number(value: number | string | null | undefined): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function toIsoFromEpoch(value: number | null): string | undefined {
	if (!Number.isFinite(value) || value === null) {
		return undefined;
	}
	return new Date(value).toISOString();
}

function buildIndexMetadata(image: RemoteImage): ImageMetaData {
	return buildImageMetadata(image.category, image.meta, {
		originalName: image.name ?? image.uuid,
		uploadedAt: image.meta?.uploadedAt ?? image.uploadedAt,
	});
}

async function upsertImageToD1Index(platform: PlatformLike, image: RemoteImage): Promise<void> {
	const db = getD1Database(platform);
	if (!db) {
		return;
	}

	await ensureD1ImageIndexSchema(db);
	const metadata = buildIndexMetadata(image);
	const uploadedAtMs = toEpochMs(metadata.uploadedAt) ?? Date.now();
	const takenAtMs = toEpochMs(metadata.takenAt);
	const createdAtMs = toEpochMs(metadata.createdAt);
	const objectKey = buildObjectKey(image.uuid, "original");
	const nowMs = Date.now();
	const metaJson = JSON.stringify(metadata);

	await runAll(
		db,
		`INSERT INTO ${d1ImageIndexTableName}
			(id, object_key, uploaded_at_ms, taken_at_ms, created_at_ms, meta_json, updated_at_ms)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
			object_key = excluded.object_key,
			uploaded_at_ms = excluded.uploaded_at_ms,
			taken_at_ms = excluded.taken_at_ms,
			created_at_ms = excluded.created_at_ms,
			meta_json = excluded.meta_json,
			updated_at_ms = excluded.updated_at_ms`,
		[image.uuid, objectKey, uploadedAtMs, takenAtMs, createdAtMs, metaJson, nowMs],
	);
}

async function deleteImageFromD1Index(platform: PlatformLike, id: string): Promise<void> {
	const db = getD1Database(platform);
	if (!db) {
		return;
	}

	await ensureD1ImageIndexSchema(db);
	await runAll(db, `DELETE FROM ${d1ImageIndexTableName} WHERE id = ?`, [id]);
}

function remoteImageFromD1IndexRow(row: D1ImageIndexRow): RemoteImage {
	let parsedMetadata: Partial<ImageMetaData> = {};
	try {
		parsedMetadata = JSON.parse(row.meta_json) as Partial<ImageMetaData>;
	} catch {
		parsedMetadata = {};
	}

	const uploadedAtMs = parseD1Number(row.uploaded_at_ms);
	const takenAtMs = parseD1Number(row.taken_at_ms);
	const createdAtMs = parseD1Number(row.created_at_ms);
	const inferredCategory = typeof parsedMetadata.category === "string" && parsedMetadata.category.trim()
		? parsedMetadata.category
		: "public";

	const metadata = buildImageMetadata(inferredCategory, {
		...parsedMetadata,
		category: inferredCategory,
		uploadedAt: parsedMetadata.uploadedAt ?? toIsoFromEpoch(uploadedAtMs),
		takenAt: parsedMetadata.takenAt ?? toIsoFromEpoch(takenAtMs),
		createdAt: parsedMetadata.createdAt ?? toIsoFromEpoch(createdAtMs),
	});

	return normalizeRemoteImage({
		uuid: row.id,
		category: inferredCategory,
		name: metadata.originalName ?? row.id,
		uploadedAt: metadata.uploadedAt,
		meta: metadata,
	});
}

async function listImagesFromD1IndexByCategory(
	platform: PlatformLike,
	category: string,
	mode: ImageSortMode,
	limit: number,
	offset: number,
): Promise<{ items: RemoteImage[]; totalItems: number }> {
	const db = getD1Database(platform);
	if (!db) {
		return { items: [], totalItems: 0 };
	}

	await ensureD1ImageIndexSchema(db);
	const countRow = await runFirst<{ count: number | string }>(
		db,
		`SELECT COUNT(*) AS count FROM ${d1ImageIndexTableName} WHERE json_extract(meta_json, '$.category') = ?`,
		[category],
	);
	const rawCount = countRow?.count;
	const totalItems = typeof rawCount === "number"
		? rawCount
		: typeof rawCount === "string"
			? Number(rawCount)
			: 0;

	if (!Number.isFinite(totalItems) || totalItems <= 0) {
		return { items: [], totalItems: 0 };
	}

	const orderBy = mode === "taken"
		? `ORDER BY
			(taken_at_ms IS NULL) ASC,
			taken_at_ms DESC,
			COALESCE(created_at_ms, uploaded_at_ms) DESC,
			uploaded_at_ms DESC,
			id DESC`
		: `ORDER BY uploaded_at_ms DESC, id DESC`;

	const rows = await runAll<D1ImageIndexRow>(
		db,
		`SELECT id, object_key, uploaded_at_ms, taken_at_ms, created_at_ms, meta_json, updated_at_ms
		 FROM ${d1ImageIndexTableName}
		 WHERE json_extract(meta_json, '$.category') = ?
		 ${orderBy}
		 LIMIT ? OFFSET ?`,
		[category, limit, offset],
	);

	return {
		items: rows.map((row) => remoteImageFromD1IndexRow(row)),
		totalItems,
	};
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
	});

	const uploadedImage = normalizeRemoteImage({
		uuid: id,
		category,
		name: file.name,
		meta: nextMetadata,
		uploadedAt,
		deliveryUrl: buildPublicUrl(id, "original"),
	});
	await upsertImageToD1Index(platform, uploadedImage);
	return uploadedImage;
}

export async function listImagesPage(
	platform: PlatformLike,
	category: string,
	limit: number,
	cursor?: string,
): Promise<ImageListPage> {
	try {
		const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 24;
		const cursorOffsetRaw = cursor ? Number.parseInt(cursor, 10) : 0;
		const cursorOffset = Number.isFinite(cursorOffsetRaw) ? Math.max(0, cursorOffsetRaw) : 0;

		const fromD1Index = await listImagesFromD1IndexByCategory(platform, category, "uploaded", safeLimit, cursorOffset);
		if (fromD1Index.totalItems > 0) {
			const nextOffset = cursorOffset + fromD1Index.items.length;
			return {
				items: fromD1Index.items,
				nextCursor: nextOffset < fromD1Index.totalItems ? String(nextOffset) : null,
				source: "d1-index",
			};
		}

		return { items: [], nextCursor: null, source: "empty" };
	} catch (error) {
		console.error("listImagesPage failed", error);
		return { items: [], nextCursor: null, source: "empty" };
	}
}

export async function listImagesByCategoryPagedSorted(
	platform: PlatformLike,
	category: string,
	mode: ImageSortMode,
	page: number,
	limit: number,
): Promise<{ items: RemoteImage[]; totalItems: number; source: "d1-index" | "empty" }> {
	const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 24;
	const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
	const offset = (safePage - 1) * safeLimit;

	try {
		const fromD1Index = await listImagesFromD1IndexByCategory(platform, category, mode, safeLimit, offset);
		if (fromD1Index.totalItems > 0) {
			return {
				items: fromD1Index.items,
				totalItems: fromD1Index.totalItems,
				source: "d1-index",
			};
		}

		return { items: [], totalItems: 0, source: "empty" };
	} catch (error) {
		console.error("listImagesByCategoryPagedSorted failed", error);
		return { items: [], totalItems: 0, source: "empty" };
	}
}

export async function getImageById(
	platform: PlatformLike,
	id: string,
	categoryHint?: string,
): Promise<RemoteImage | null> {
	try {
		const image = await getImageFromD1IndexById(platform, id);
		if (!image) {
			return null;
		}

		if (categoryHint && image.category !== categoryHint) {
			return null;
		}

		return image;

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

	const listing = await bucket.list({ prefix: `images/${id}/` });
	for (const item of listing.objects) {
		await bucket.delete(item.key);
	}

	await deleteImageFromD1Index(platform, id);
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

	const updatedImage = normalizeRemoteImage({
		...existing,
		category: nextCategory,
		name: nextMetadata.originalName,
		uploadedAt: nextMetadata.uploadedAt,
		meta: nextMetadata,
	});
	await upsertImageToD1Index(platform, updatedImage);
	return updatedImage;
}
