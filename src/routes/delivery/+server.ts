import { ACCOUNT_ID, SERVER_URL } from '$env/static/private';

export function GET({ fetch, url }) {
    let limit = parseInt(url.searchParams.get('limit') ?? '1')
    let skip = parseInt(url.searchParams.get('skip') ?? '0')
    return fetch(`${SERVER_URL}/${ACCOUNT_ID}/api/images/${limit}/${skip}`);
}
