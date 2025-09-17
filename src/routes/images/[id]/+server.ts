export async function DELETE({ fetch, params: { id }, platform }) {
    let { SERVER_URL, ACCOUNT_ID, TOKEN } = platform?.env ?? {};
    const ENDPOINT = `${SERVER_URL}/${ACCOUNT_ID}/api/image/${id}`
    const req = {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${TOKEN}`
        },
    };
    return fetch(ENDPOINT, req)
}
