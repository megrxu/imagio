import type { PageServerLoad } from './$types';
import type { ListResp, UploadResResp } from "$lib/types";

export const load: PageServerLoad = async ({ fetch, platform, locals }) => {
    let images: UploadResResp[] = [];
    if (platform) {
        const ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1?per_page=24`
        const req = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
            },
        }
        const resp = await fetch(ENDPOINT, req);
        let imagesResp: ListResp = JSON.parse(await resp.text());
        images = imagesResp.result.images;
    }
    return {
        images: images
    }
}