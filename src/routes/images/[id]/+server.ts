const SERVER_URL = import.meta.env.SERVER_URL;
const ACCOUNT_ID = import.meta.env.ACCOUNT_ID;
const TOKEN = import.meta.env.TOKEN;

export const DELETE = async ({ fetch, params: { id } }) => {
    const ENDPOINT = `${SERVER_URL}/${ACCOUNT_ID}/api/image/${id}`
    const req = {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${TOKEN}`
        },
    };
    return fetch(ENDPOINT, req)
};
