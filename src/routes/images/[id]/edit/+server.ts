import { ACCOUNT_ID, SERVER_URL, TOKEN } from '$lib/server/env';
import type { ImageMetaData } from "$lib/types";


export async function PATCH({ fetch, request, params: { id } }) {
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
