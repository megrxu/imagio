import { SERVER_URL, S3_PUBLIC_ACCESS_ENDPOINT } from '$lib/server/env';

export async function GET({ fetch, params: { id, variant } }) {
    if ((S3_PUBLIC_ACCESS_ENDPOINT ?? '') !== '' && variant !== 'original') {
        const resp = await fetch(`${S3_PUBLIC_ACCESS_ENDPOINT}/cache/public_${id}_${variant}.JPEG`);
        if (resp.status === 200) return resp;
        return fetch(`${SERVER_URL}/${id}/${variant}`);
    }
    return fetch(`${SERVER_URL}/${id}/${variant}`);
}
