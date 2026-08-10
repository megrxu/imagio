import type { RemoteImage } from '$lib/types';
import type { PageServerLoad } from './$types';
import { listImagesPage } from '$lib/cloudflare';

export const load: PageServerLoad = async ({ url, platform }) => {
    const category = url.searchParams.get('category') ?? 'public';
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const trailRaw = url.searchParams.get('trail') ?? '';
    const limit = Math.max(1, Math.min(48, parseInt(url.searchParams.get('limit') ?? '24', 10)));

    const pageResult = await listImagesPage(platform, category, limit, cursor);
    const remoteImages: RemoteImage[] = pageResult.items;

    let trail: string[] = [];
    if (trailRaw) {
        try {
            const parsed = JSON.parse(atob(trailRaw));
            if (Array.isArray(parsed)) {
                trail = parsed.filter((item) => typeof item === 'string');
            }
        } catch {
            trail = [];
        }
    }

    const prevCursor = trail.length > 0 ? trail[trail.length - 1] : null;
    const prevTrail = trail.slice(0, Math.max(0, trail.length - 1));
    const nextTrail = cursor ? [...trail, cursor] : trail;
    const prevTrailEncoded = prevTrail.length > 0 ? btoa(JSON.stringify(prevTrail)) : null;
    const nextTrailEncoded = nextTrail.length > 0 ? btoa(JSON.stringify(nextTrail)) : null;

    const prevHref = prevCursor
        ? `${url.pathname}?category=${encodeURIComponent(category)}&limit=${limit}&cursor=${encodeURIComponent(prevCursor)}${prevTrailEncoded ? `&trail=${encodeURIComponent(prevTrailEncoded)}` : ''}`
        : null;
    const nextHref = pageResult.nextCursor
        ? `${url.pathname}?category=${encodeURIComponent(category)}&limit=${limit}&cursor=${encodeURIComponent(pageResult.nextCursor)}${nextTrailEncoded ? `&trail=${encodeURIComponent(nextTrailEncoded)}` : ''}`
        : null;

    return {
        remoteImages,
        cursor: cursor ?? null,
        nextCursor: pageResult.nextCursor,
        prevHref,
        nextHref,
        source: pageResult.source,
        limit,
        category,
        path: url.pathname,
    }
}