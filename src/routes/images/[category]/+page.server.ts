import type { RemoteImage } from '$lib/types';
import type { PageServerLoad } from './$types';
import { ACCOUNT_ID, SERVER_URL } from '$env/static/private';

export const load: PageServerLoad = async ({ url, params: { category } }) => {
    let page = parseInt(url.searchParams.get('page') ?? '1')
    let skip = (page - 1) * 24
    if (skip < 0) {
        skip = 0
    }

    let remote_images: RemoteImage[] = await fetch(`${SERVER_URL}/${ACCOUNT_ID}/api/images/24/${skip}`)
        .then(res => res.json());

    return {
        remote_images,
        page,
        category,
        path: url.pathname,
    }
}