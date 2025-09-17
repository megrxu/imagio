import type { ImageMetaData } from "$lib/types";

export async function PATCH({ fetch, request, params: { id }, platform }) {
    let { SERVER_URL, ACCOUNT_ID, TOKEN } = platform?.env ?? {};
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
