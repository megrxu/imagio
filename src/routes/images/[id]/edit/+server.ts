const ACCOUNT_ID = import.meta.env.ACCOUNT_ID;
const SERVER_URL = import.meta.env.SERVER_URL;
const TOKEN = import.meta.env.TOKEN;
import type { ImageMetaData } from "$lib/types";

export const PATCH = async ({ fetch, platform, request, params: { id } }) => {
    if (platform) {
        const ENDPOINT = `${SERVER_URL}/${ACCOUNT_ID}/image/${id}`
        let meta: ImageMetaData = JSON.parse(await request.text())
        const req = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
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
