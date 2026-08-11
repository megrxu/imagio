import { getDeliverySignatureSecret, getImageById, getR2Bucket, verifySignedDeliveryAccess } from '$lib/cloudflare';

const allowedVariants = new Set(['original', 'square', 'thumb', 'avatar', 'small', 'medium', 'large', 'banner', 'embed']);
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

    const options: Record<string, string | number> = {
        format: resolveOutputFormat(request, searchParams),
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
        case 'square':
        case 'thumb':
        case 'avatar':
            options.width = options.width ?? 240;
            options.height = options.height ?? 240;
            options.fit = options.fit ?? 'cover';
            options.quality = options.quality ?? 'high';
            break;
        case 'embed':
            options.width = options.width ?? 1024;
            options.fit = options.fit ?? 'scale-down';
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
        case 'banner':
            options.width = options.width ?? 800;
            options.height = options.height ?? 400;
            options.fit = options.fit ?? 'cover';
            options.quality = options.quality ?? 'high';
            break;
        default:
            options.width = options.width ?? 1200;
            options.fit = options.fit ?? 'scale-down';
            options.quality = options.quality ?? 'high';
            break;
    }

    if (!allowedFits.has(String(options.fit ?? ''))) {
        return null;
    }

    return options;
}

function toBase64(value: ArrayBuffer): string {
    const bytes = new Uint8Array(value);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

async function renderVariantFromOriginal(
    bucket: NonNullable<ReturnType<typeof getR2Bucket>>,
    id: string,
    variant: string,
    transformOptions: Record<string, string | number>,
) {
    const format = String(transformOptions.format ?? 'jpeg');
    const parts = Object.entries(transformOptions)
        .filter(([key]) => key !== 'format')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}-${String(value)}`);
    const cacheKey = parts.length > 0
        ? `images/${id}/${variant}/${format}/${parts.join('__')}`
        : `images/${id}/${variant}/${format}`;
    const cached = await bucket.get(cacheKey);
    if (cached?.body) {
        return {
            body: cached.body,
            contentType: cached.httpMetadata?.contentType,
        };
    }

    const original = await bucket.get(`images/${id}/original`);
    if (!original?.body) {
        return null;
    }

    const originalBuffer = await new Response(original.body).arrayBuffer();
    const originalContentType = original.httpMetadata?.contentType ?? 'application/octet-stream';
    const dataUrl = `data:${originalContentType};base64,${toBase64(originalBuffer)}`;
    const transformed = await fetch(dataUrl, {
        cf: {
            image: transformOptions,
        },
    });

    if (!transformed.ok) {
        return null;
    }

    const transformedBuffer = await transformed.arrayBuffer();
    const transformedContentType = transformed.headers.get('content-type') ?? 'application/octet-stream';
    await bucket.put(cacheKey, transformedBuffer, {
        httpMetadata: { contentType: transformedContentType },
    });

    return {
        body: transformedBuffer,
        contentType: transformedContentType,
    };
}

export async function GET({ request, params: { id, variant }, platform }) {
    const normalizedVariant = normalizeVariant(variant);
    if (!normalizedVariant) {
        return new Response('Unsupported variant', { status: 400 });
    }

    if (normalizedVariant === 'original') {
        const secret = getDeliverySignatureSecret(platform);
        if (secret && !(await verifySignedDeliveryAccess(secret, id, normalizedVariant, request.url))) {
            return new Response('Forbidden', { status: 403 });
        }

        const referer = request.headers.get('referer');
        if (!referer) {
            return new Response('Forbidden', { status: 403 });
        }

        try {
            const refererUrl = new URL(referer);
            const requestUrl = new URL(request.url);
            const isImagesPage = refererUrl.origin === requestUrl.origin && (refererUrl.pathname === '/images' || refererUrl.pathname.startsWith('/images/'));
            if (!isImagesPage) {
                return new Response('Forbidden', { status: 403 });
            }
        } catch {
            return new Response('Forbidden', { status: 403 });
        }
    }

    const image = await getImageById(platform, id);
    if (!image) {
        return new Response('Not found', { status: 404 });
    }
    const imageCategory = image.category;

    if (imageCategory === 'private') {
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

    if (normalizedVariant === 'original') {
        const object = await bucket.get(`images/${id}/original`);
        if (!object?.body) {
            return new Response('Not found', { status: 404 });
        }

        const headers = new Headers();
        if (object.httpMetadata?.contentType) {
            headers.set('content-type', object.httpMetadata.contentType);
        }
        headers.set('cache-control', imageCategory === 'private' ? 'private, no-store' : 'public, max-age=31536000, immutable');
        headers.set('content-disposition', `inline; filename="${id}-${variant}"`);
        return new Response(object.body, { status: 200, headers });
    }

    const transformOptions = buildTransformOptions(normalizedVariant, request, new URL(request.url).searchParams);
    if (!transformOptions) {
        return new Response('Unsupported variant', { status: 400 });
    }

    const rendered = await renderVariantFromOriginal(bucket, id, normalizedVariant, transformOptions);
    if (!rendered?.body) {
        return new Response('Not found', { status: 404 });
    }

    const headers = new Headers();
    if (rendered.contentType) {
        headers.set('content-type', rendered.contentType);
    }
    headers.set('cache-control', imageCategory === 'private' ? 'private, no-store' : 'public, max-age=31536000, immutable');
    headers.set('content-disposition', `inline; filename="${id}-${variant}"`);
    return new Response(rendered.body, { status: 200, headers });

}
