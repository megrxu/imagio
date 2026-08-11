import type { RemoteImage } from '$lib/types';
import type { PageServerLoad } from './$types';
import { buildSignedDeliveryUrl, listImagesByCategoryPagedSorted, type ImageSortMode } from '$lib/cloudflare';

function normalizeSortMode(raw: string | null): ImageSortMode {
    return raw === 'uploaded' ? 'uploaded' : 'taken';
}

export const load: PageServerLoad = async ({ url, platform }) => {
    const category = url.searchParams.get('category') ?? 'public';
    const sort = normalizeSortMode(url.searchParams.get('sort'));
    const pageRaw = parseInt(url.searchParams.get('page') ?? '1', 10);
    const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
    const limit = Math.max(1, Math.min(48, parseInt(url.searchParams.get('limit') ?? '24', 10)));

    const result = await listImagesByCategoryPagedSorted(platform, category, sort, page, limit);
    const totalItems = result.totalItems;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(page, totalPages);
    const needReloadWithAdjustedPage = currentPage !== page && totalItems > 0;
    const adjustedResult = needReloadWithAdjustedPage
        ? await listImagesByCategoryPagedSorted(platform, category, sort, currentPage, limit)
        : result;
    const remoteImages: RemoteImage[] = await Promise.all(
        adjustedResult.items.map(async (image) => ({
            ...image,
            deliveryUrl: await buildSignedDeliveryUrl(image.uuid, 'original', platform),
        })),
    );

    const prevPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = currentPage < totalPages ? currentPage + 1 : null;
    const prevHref = prevPage
        ? `${url.pathname}?category=${encodeURIComponent(category)}&sort=${encodeURIComponent(sort)}&limit=${limit}&page=${prevPage}`
        : null;
    const nextHref = nextPage
        ? `${url.pathname}?category=${encodeURIComponent(category)}&sort=${encodeURIComponent(sort)}&limit=${limit}&page=${nextPage}`
        : null;

    return {
        remoteImages,
        prevHref,
        nextHref,
        source: adjustedResult.source,
        limit,
        category,
        currentPage,
        totalPages,
        totalItems,
        path: url.pathname,
        sort,
    }
}