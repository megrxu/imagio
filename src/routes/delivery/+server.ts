import { ACCOUNT_ID, SERVER_URL } from '$lib/server/env';

export function GET({ fetch, url }) {
    let limit = parseInt(url.searchParams.get('limit') ?? '1')
    let skip = parseInt(url.searchParams.get('skip') ?? '0')
    let category = url.searchParams.get('category') ?? 'public';
    return fetch(`${SERVER_URL}/${ACCOUNT_ID}/api/images/${category}/${limit}/${skip}`);
}
