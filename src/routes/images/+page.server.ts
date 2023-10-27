import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, platform, url }) => {
    let page: number = parseInt(url.searchParams.get('page') ?? '1');
    let per_page: number = parseInt(url.searchParams.get('per_page') ?? '24');
    let skip = (page - 1) * per_page
    if (skip < 0) {
        skip = 0
    }
    let image_ids: string[] = [];
    if (platform) {
        const { results } = await platform.env.IMAGIO_DB.prepare(`
            select uuid from images where category = ? order by create_time desc limit ?, ?
        `).bind('public', skip, per_page).all()
        image_ids = results.map(function (key: Record<string, unknown>) {
            return `${key['uuid']}`
        })
    }
    return {
        image_ids: image_ids
    }
}