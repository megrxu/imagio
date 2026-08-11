import type { RemoteImage } from '$lib/types';
import type { PageServerLoad } from './$types';
import { listImagesByCategorySorted } from '$lib/cloudflare';

export const load: PageServerLoad = async ({ url, platform }) => {
    const category = url.searchParams.get('category') ?? 'public';
    const pageRaw = parseInt(url.searchParams.get('page') ?? '1', 10);
    const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
    const limit = Math.max(1, Math.min(48, parseInt(url.searchParams.get('limit') ?? '24', 10)));

    const result = await listImagesByCategorySorted(platform, category);
    const allImages = result.items;
    const totalItems = allImages.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;
    const remoteImages: RemoteImage[] = allImages.slice(offset, offset + limit);

    const prevPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = currentPage < totalPages ? currentPage + 1 : null;
    const prevHref = prevPage
        ? `${url.pathname}?category=${encodeURIComponent(category)}&limit=${limit}&page=${prevPage}`
        : null;
    const nextHref = nextPage
        ? `${url.pathname}?category=${encodeURIComponent(category)}&limit=${limit}&page=${nextPage}`
        : null;

    return {
        remoteImages,
        prevHref,
        nextHref,
        source: result.source,
        limit,
        category,
        currentPage,
        totalPages,
        totalItems,
        path: url.pathname,
    }
}