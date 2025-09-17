import type { RemoteImage } from '$lib/types';
import type { PageServerLoad } from './$types';
import { ACCOUNT_ID, SERVER_URL } from '$lib/server/env';

export const load: PageServerLoad = async ({ url }) => {
    let page = parseInt(url.searchParams.get('page') ?? '1')
    let category = url.searchParams.get('category') ?? 'public'

    let skip = (page - 1) * 24
    if (skip < 0) {
        skip = 0
    }

    let remoteImages: RemoteImage[] = await fetch(`${SERVER_URL}/${ACCOUNT_ID}/api/images/${category}/24/${skip}`)
        .then(res => res.json());

    return {
        remoteImages,
        page,
        category,
        path: url.pathname,
    }
}