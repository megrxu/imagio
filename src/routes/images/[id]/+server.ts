import { SERVER_URL, ACCOUNT_ID, TOKEN } from '$lib/server/env';

export async function DELETE({ fetch, params: { id } }) {
    const ENDPOINT = `${SERVER_URL}/${ACCOUNT_ID}/api/image/${id}`
    const req = {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${TOKEN}`
        },
    };
    return fetch(ENDPOINT, req)
}
