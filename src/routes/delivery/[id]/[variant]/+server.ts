import { SERVER_URL } from '$env/static/private';

export async function GET({ fetch, params: { id, variant } }) {
    return fetch(`${SERVER_URL}/${id}/${variant}`);
}
