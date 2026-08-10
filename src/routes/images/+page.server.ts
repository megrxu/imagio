import type { RemoteImage } from '$lib/types';
import type { PageServerLoad } from './$types';
import { listImagesFromRegistry } from '$lib/cloudflare';

export const load: PageServerLoad = async ({ url, platform }) => {
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const category = url.searchParams.get('category') ?? 'public';

    const skip = (page - 1) * 24;
    const remoteImages: RemoteImage[] = await listImagesFromRegistry(platform, category);

    return {
        remoteImages: remoteImages.slice(skip, skip + 24),
        page,
        category,
        path: url.pathname,
    }
}