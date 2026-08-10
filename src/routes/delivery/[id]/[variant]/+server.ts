import { getImageById, getOrMigrateObject, getR2Bucket } from '$lib/cloudflare';

const allowedVariants = new Set(['original', 'thumb', 'avatar', 'small', 'medium', 'large', 'public', 'private']);
const allowedFormats = new Set(['jpeg', 'jpg', 'png', 'webp', 'avif']);
const allowedFits = new Set(['cover', 'contain', 'crop', 'pad', 'scale-down']);

function clampInt(value: string | null, min: number, max: number): number | null {
    if (!value) return null;
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return null;
    return Math.min(max, Math.max(min, n));
}

function normalizeVariant(rawVariant: string) {
    return allowedVariants.has(rawVariant) ? rawVariant : null;
}

function resolveOutputFormat(request: Request, searchParams: URLSearchParams) {
    const explicit = searchParams.get('format')?.trim().toLowerCase();
    if (explicit && explicit !== 'auto') {
        const normalized = explicit === 'jpg' ? 'jpeg' : explicit;
        if (allowedFormats.has(normalized)) {
            return normalized;
        }
    }

    const accept = request.headers.get('accept')?.toLowerCase() ?? '';
    if (accept.includes('image/avif')) {
        return 'avif';
    }
    if (accept.includes('image/webp')) {
        return 'webp';
    }
    return 'jpeg';
}

function buildTransformOptions(variant: string, request: Request, searchParams: URLSearchParams) {
    if (variant === 'original') {
        return null;
    }

    const format = resolveOutputFormat(request, searchParams);
    const options: Record<string, string | number> = {
        format,
    };

    const width = clampInt(searchParams.get('width'), 16, 4096);
    if (width !== null) {
        options.width = width;
    }

    const height = clampInt(searchParams.get('height'), 16, 4096);
    if (height !== null) {
        options.height = height;
    }

    const quality = clampInt(searchParams.get('quality'), 1, 100);
    if (quality !== null) {
        options.quality = quality;
    }

    const fit = searchParams.get('fit');
    if (fit && allowedFits.has(fit)) {
        options.fit = fit;
    }

    switch (variant) {
        case 'thumb':
        case 'avatar':
            options.width = options.width ?? 240;
            options.height = options.height ?? 240;
            options.fit = options.fit ?? 'cover';
            options.quality = options.quality ?? 'high';
            break;
        case 'small':
            options.width = options.width ?? 480;
            options.fit = options.fit ?? 'scale-down';
            options.quality = options.quality ?? 'high';
            break;
        case 'medium':
            options.width = options.width ?? 960;
            options.fit = options.fit ?? 'scale-down';
            options.quality = options.quality ?? 'high';
            break;
        case 'large':
            options.width = options.width ?? 1600;
            options.fit = options.fit ?? 'scale-down';
            options.quality = options.quality ?? 'high';
            break;
        default:
            options.width = options.width ?? 1200;
            options.fit = options.fit ?? 'scale-down';
            options.quality = options.quality ?? 'high';
            break;
    }

    return options;
}

function buildVariantCacheKey(category: string, id: string, variant: string, transformOptions: Record<string, string | number> | null) {
    const base = `images/${category}/${id}/${variant}`;
    if (!transformOptions) {
        return base;
    }

    const format = String(transformOptions.format ?? 'jpeg');
    const parts = Object.entries(transformOptions)
        .filter(([key]) => key !== 'format')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}-${String(value)}`);

    if (parts.length > 0) {
        return `${base}/${format}/${parts.join('__')}`;
    }

    return `${base}/${format}`;
}

async function getOrRenderVariant(
    platform: any,
    request: Request,
    category: string,
    id: string,
    variant: string,
    transformOptions: Record<string, string | number> | null,
) {
    const bucket = getR2Bucket(platform);
    if (!bucket) {
        return null;
    }

    const cacheKey = buildVariantCacheKey(category, id, variant, transformOptions);
    const cached = await bucket.get(cacheKey);
    if (cached?.body) {
        return {
            key: cacheKey,
            object: cached,
        };
    }

    if (!transformOptions) {
        return null;
    }

    const sourceUrl = new URL(request.url);
    sourceUrl.pathname = sourceUrl.pathname.replace(/\/[^/]+$/, '/original');
    const headers = new Headers(request.headers);
    headers.set('x-imagio-internal-source', '1');

    const response = await fetch(sourceUrl.toString(), {
        headers,
        method: 'GET',
        cf: {
            image: transformOptions,
        } as { image: Record<string, string | number> },
    });

    if (!response.ok) {
        return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    await bucket.put(cacheKey, arrayBuffer, {
        httpMetadata: { contentType },
        customMetadata: {
            category,
            imageId: id,
            variant,
            format: String(transformOptions.format ?? 'jpeg'),
            source: 'transformed',
        },
    });

    return {
        key: cacheKey,
        object: {
            body: arrayBuffer,
            httpMetadata: { contentType },
        },
    };
}

export async function GET({ request, params: { id, variant }, platform }) {
    const normalizedVariant = normalizeVariant(variant);
    if (!normalizedVariant) {
        return new Response('Unsupported variant', { status: 400 });
    }

    const legacyCategoryAlias = normalizedVariant === 'public' || normalizedVariant === 'private' ? normalizedVariant : null;
    const effectiveVariant = legacyCategoryAlias ? 'original' : normalizedVariant;
    const image = await getImageById(platform, id, legacyCategoryAlias ?? undefined);
    if (!image) {
        return new Response('Not found', { status: 404 });
    }

    if (image.category === 'private') {
        const referer = request.headers.get('referer');
        if (!referer) {
            return new Response('Forbidden', { status: 403 });
        }
        try {
            const refererUrl = new URL(referer);
            const requestUrl = new URL(request.url);
            if (refererUrl.origin !== requestUrl.origin) {
                return new Response('Forbidden', { status: 403 });
            }
        } catch {
            return new Response('Forbidden', { status: 403 });
        }
    }

    const bucket = getR2Bucket(platform);
    if (!bucket) {
        return new Response('Image delivery is not configured', { status: 500 });
    }

    const isInternalSource = request.headers.get('x-imagio-internal-source') === '1';
    const requestedKey = isInternalSource
        ? `images/${image.category}/${id}/original`
        : `images/${image.category}/${id}/${effectiveVariant}`;
    const candidates = [
        requestedKey,
        !isInternalSource && effectiveVariant !== 'original' ? `images/${image.category}/${id}/original` : null,
    ].filter(Boolean) as string[];

    const transformOptions = buildTransformOptions(effectiveVariant, request, new URL(request.url).searchParams);
    if (transformOptions && !isInternalSource) {
        const rendered = await getOrRenderVariant(
            platform,
            request,
            image.category,
            id,
            effectiveVariant,
            transformOptions,
        );
        if (rendered?.object.body) {
            const headers = new Headers();
            if (rendered.object.httpMetadata?.contentType) {
                headers.set('content-type', rendered.object.httpMetadata.contentType);
            }
            headers.set('cache-control', image.category === 'private' ? 'private, no-store' : 'public, max-age=31536000, immutable');
            headers.set('content-disposition', `inline; filename="${id}-${variant}"`);
            return new Response(rendered.object.body, { status: 200, headers });
        }
    }

    for (const key of candidates) {
        const object = await getOrMigrateObject(platform, key, {
            migrateFromLegacy: key.endsWith('/original'),
            legacySourceKeys: [
                `${id}/${image.category}`,
                `${id}/${image.category}.jpg`,
                `${id}/${image.category}.jpeg`,
                `${id}/${image.category}.png`,
                legacyCategoryAlias ? `${id}/${legacyCategoryAlias}` : '',
                legacyCategoryAlias ? `${id}/${legacyCategoryAlias}.jpg` : '',
            ].filter(Boolean),
        });
        if (object?.body) {
            const headers = new Headers();
            if (object.httpMetadata?.contentType) {
                headers.set('content-type', object.httpMetadata.contentType);
            }
            headers.set('cache-control', image.category === 'private' ? 'private, no-store' : 'public, max-age=31536000, immutable');
            headers.set('content-disposition', `inline; filename="${id}-${variant}"`);
            return new Response(object.body, { status: 200, headers });
        }
    }

    return new Response('Not found', { status: 404 });
}
