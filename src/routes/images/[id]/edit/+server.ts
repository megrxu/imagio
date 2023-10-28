import type { ImageMetaData } from "$lib/types";

export async function PATCH({ fetch, platform, request, params: { id } }) {
    if (platform) {
        const ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1/${id}`
        let meta: ImageMetaData = JSON.parse(await request.text())
        const req = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
            },
            body: JSON.stringify(
                {
                    'metadata': meta
                }
            )
        };
        return fetch(ENDPOINT, req)
    }
}
