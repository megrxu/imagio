import { ACCOUNT_ID, SERVER_URL } from '$env/static/private';

export async function GET({ fetch, request, params: { id, variant } }) {
    return fetch(`${SERVER_URL}/${ACCOUNT_ID}/${id}/${variant}`);
}
