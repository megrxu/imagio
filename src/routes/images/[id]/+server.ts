export const DELETE = async ({ fetch, params: { id }, platform }) => {
    const { SERVER_URL, ACCOUNT_ID, TOKEN } = (platform as any).env;
    const ENDPOINT = `${SERVER_URL}/${ACCOUNT_ID}/api/image/${id}`
    const req = {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${TOKEN}`
        },
    };
    return fetch(ENDPOINT, req)
};
