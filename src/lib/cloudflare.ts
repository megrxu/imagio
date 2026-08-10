import type { ImageMetaData, RemoteImage } from "$lib/types";

export interface R2ObjectLike {
	body?: ReadableStream | ArrayBuffer | null;
	httpMetadata?: { contentType?: string };
}

export interface R2BucketLike {
	put(key: string, value: ArrayBuffer | ReadableStream | string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
	get(key: string): Promise<R2ObjectLike | null>;
	delete(key: string): Promise<unknown>;
	list(options?: { prefix?: string }): Promise<{ objects: Array<{ key: string }> }>;
}

type CloudflareEnv = {
	S3_PUBLIC_ACCESS_ENDPOINT?: string;
	IMAGIO_KV?: {
		get(key: string): Promise<string | null>;
		put(key: string, value: string): Promise<void>;
		delete(key: string): Promise<void>;
	};
	IMAGIO_R2?: R2BucketLike;
};

type PlatformLike = {
	env?: Record<string, unknown>;
} | undefined;

interface RegistryEntry extends RemoteImage {
	name?: string;
	deliveryUrl?: string;
	uploadedAt?: string;
}

const REGISTRY_KEY = "imagio:registry";
const memoryRegistryKey = "__imagio_registry";

function getEnv(platform: PlatformLike): CloudflareEnv {
	const env = platform?.env ?? {};
	return {
		S3_PUBLIC_ACCESS_ENDPOINT:
			typeof env.S3_PUBLIC_ACCESS_ENDPOINT === "string"
				? env.S3_PUBLIC_ACCESS_ENDPOINT
				: undefined,
		IMAGIO_KV:
			typeof env.IMAGIO_KV === "object" && env.IMAGIO_KV !== null
				? (env.IMAGIO_KV as CloudflareEnv["IMAGIO_KV"])
				: undefined,
		IMAGIO_R2:
			typeof env.IMAGIO_R2 === "object" && env.IMAGIO_R2 !== null
				? (env.IMAGIO_R2 as CloudflareEnv["IMAGIO_R2"])
				: undefined,
	};
}

function getMemoryRegistry(): RegistryEntry[] {
	const globalScope = globalThis as typeof globalThis & {
		[memoryRegistryKey]?: RegistryEntry[];
	};
	if (!globalScope[memoryRegistryKey]) {
		globalScope[memoryRegistryKey] = [];
	}
	return globalScope[memoryRegistryKey]!;
}

async function readRegistry(platform: PlatformLike): Promise<RegistryEntry[]> {
	const env = getEnv(platform);
	if (env.IMAGIO_KV) {
		try {
			const raw = await env.IMAGIO_KV.get(REGISTRY_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as RegistryEntry[];
				if (Array.isArray(parsed)) {
					return parsed;
				}
			}
		} catch {
			// fall back to in-memory storage when KV is unavailable
		}
	}
	return getMemoryRegistry();
}

async function writeRegistry(platform: PlatformLike, entries: RegistryEntry[]): Promise<void> {
	const env = getEnv(platform);
	if (env.IMAGIO_KV) {
		try {
			await env.IMAGIO_KV.put(REGISTRY_KEY, JSON.stringify(entries));
			return;
		} catch {
			// fall back to in-memory storage when KV is unavailable
		}
	}
	getMemoryRegistry().splice(0, getMemoryRegistry().length, ...entries);
}

async function updateRegistry(platform: PlatformLike, updater: (entries: RegistryEntry[]) => RegistryEntry[]): Promise<RegistryEntry[]> {
	const next = updater(await readRegistry(platform));
	await writeRegistry(platform, next);
	return next;
}

export function getR2Bucket(platform: PlatformLike): R2BucketLike | undefined {
	const env = getEnv(platform);
	return env.IMAGIO_R2;
}

function getLegacyS3BaseUrl(platform: PlatformLike): string | undefined {
	const env = getEnv(platform);
	if (typeof env.S3_PUBLIC_ACCESS_ENDPOINT === "string" && env.S3_PUBLIC_ACCESS_ENDPOINT.trim()) {
		return env.S3_PUBLIC_ACCESS_ENDPOINT.trim();
	}
	return undefined;
}

async function tryReadLegacyObject(platform: PlatformLike, key: string): Promise<{ body: ArrayBuffer; contentType?: string } | null> {
	const baseUrl = getLegacyS3BaseUrl(platform);
	if (!baseUrl) {
		return null;
	}

	try {
		const url = new URL(key, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
		const response = await fetch(url.toString());
		if (!response.ok) {
			return null;
		}
		const body = await response.arrayBuffer();
		return {
			body,
			contentType: response.headers.get("content-type") ?? undefined,
		};
	} catch {
		return null;
	}
}

export async function getOrMigrateObject(
	platform: PlatformLike,
	key: string,
	options?: { migrateFromLegacy?: boolean },
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

	const legacy = await tryReadLegacyObject(platform, key);
	if (!legacy?.body) {
		return null;
	}

	await bucket.put(key, legacy.body, {
		httpMetadata: legacy.contentType ? { contentType: legacy.contentType } : undefined,
	});

	return {
		body: legacy.body,
		httpMetadata: legacy.contentType ? { contentType: legacy.contentType } : undefined,
	};
}

function buildObjectKey(category: string, id: string, variant = "original") {
	return `images/${category}/${id}/${variant}`;
}

function buildPublicUrl(id: string, variant = "original") {
	return `/delivery/${id}/${variant}`;
}

function parseObjectKey(key: string) {
	const match = key.match(/^images\/([^/]+)\/([^/]+)\/([^/]+)$/i);
	if (!match) {
		return null;
	}
	return {
		category: match[1],
		uuid: match[2],
		variant: match[3].toLowerCase(),
	};
}

function toRegistryEntry(id: string, category: string, key: string): RegistryEntry {
	return {
		uuid: id,
		category,
		name: key,
		meta: { tags: [], category },
		uploadedAt: new Date().toISOString(),
	};
}

export async function uploadImageToCloudflare(
	file: File,
	category: string,
	platform: PlatformLike,
	metadata?: ImageMetaData,
): Promise<RemoteImage> {
	const bucket = getR2Bucket(platform);
	const id = crypto.randomUUID();
	const key = buildObjectKey(category, id, "original");
	const arrayBuffer = await file.arrayBuffer();

	if (!bucket) {
		throw new Error("R2 bucket binding is not configured.");
	}

	await bucket.put(key, arrayBuffer, {
		httpMetadata: {
			contentType: file.type || "application/octet-stream",
		},
		customMetadata: {
			category,
			originalName: file.name,
		},
	});

	const entry: RegistryEntry = {
		uuid: id,
		category,
		meta: {
			tags: metadata?.tags ?? [],
			category,
		},
		name: file.name,
		deliveryUrl: buildPublicUrl(id, "original") ?? undefined,
		uploadedAt: new Date().toISOString(),
	};

	await updateRegistry(platform, (entries) => [entry, ...entries.filter((item) => item.uuid !== entry.uuid)]);
	return entry;
}

export async function listImagesFromRegistry(
	platform: PlatformLike,
	category: string,
): Promise<RemoteImage[]> {
	const bucket = getR2Bucket(platform);
	const images = await readRegistry(platform);
	const fromRegistry = images
		.filter((item) => item.category === category)
		.sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
	if (!bucket) {
		return fromRegistry;
	}

	try {
		const listing = await bucket.list({ prefix: "images/" });
		const bucketEntries = new Map<string, RegistryEntry>();
		for (const object of listing.objects) {
			const parsed = parseObjectKey(object.key);
			if (!parsed || parsed.category !== category) continue;
			const existing = bucketEntries.get(parsed.uuid);
			if (!existing || parsed.variant === "original") {
				bucketEntries.set(parsed.uuid, toRegistryEntry(parsed.uuid, parsed.category, object.key));
			}
		}
		const merged = [...bucketEntries.values(), ...fromRegistry.filter((image) => !bucketEntries.has(image.uuid))];
		return merged.sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
	} catch {
		return fromRegistry;
	}
}

export async function getImageById(platform: PlatformLike, id: string): Promise<RemoteImage | null> {
	const images = await readRegistry(platform);
	const existing = images.find((image) => image.uuid === id);
	if (existing) {
		return existing;
	}

	const bucket = getR2Bucket(platform);
	if (!bucket) {
		return null;
	}

	try {
		const listing = await bucket.list({ prefix: "images/" });
		const match = listing.objects.find((object) => object.key.includes(`/${id}/`));
		if (!match) {
			return null;
		}
		const parsed = parseObjectKey(match.key);
		if (!parsed) {
			return null;
		}
		return toRegistryEntry(parsed.uuid, parsed.category, match.key);
	} catch {
		return null;
	}
}

export async function deleteImageFromCloudflare(platform: PlatformLike, id: string): Promise<void> {
	const bucket = getR2Bucket(platform);
	if (bucket) {
		const listing = await bucket.list({ prefix: `images/` });
		const targets = listing.objects
			.filter((object) => object.key.includes(`/${id}/`))
			.map((object) => object.key);
		for (const key of targets) {
			await bucket.delete(key);
		}
	}
	await updateRegistry(platform, (entries) => entries.filter((entry) => entry.uuid !== id));
}

export function getImageDeliveryUrl(
	image: RemoteImage | null,
	variant: string,
	platform: PlatformLike,
): string | null {
	const env = getEnv(platform);
	const imageId = image?.uuid;
	if (!imageId) {
		return null;
	}

	const deliveryUrl = (image as RegistryEntry | null | undefined)?.deliveryUrl;
	if (typeof deliveryUrl === "string" && deliveryUrl) {
		return deliveryUrl;
	}

	return buildPublicUrl(imageId, variant);
}

export async function updateImageMetadata(
	platform: PlatformLike,
	id: string,
	metadata: ImageMetaData,
): Promise<RemoteImage | null> {
	const images = await readRegistry(platform);
	const index = images.findIndex((image) => image.uuid === id);
	if (index === -1) {
		return null;
	}
	images[index] = {
		...images[index],
		meta: {
			...images[index].meta,
			...metadata,
			category: metadata.category ?? images[index].meta?.category ?? images[index].category,
			tags: metadata.tags ?? images[index].meta?.tags ?? [],
		},
		category: metadata.category ?? images[index].category,
	};
	await writeRegistry(platform, images);
	return images[index];
}
