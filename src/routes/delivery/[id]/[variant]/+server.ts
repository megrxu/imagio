import { SERVER_URL, S3_PUBLIC_ACCESS_ENDPOINT } from '$env/static/private';

export async function GET({ fetch, params: { id, variant } }) {
    if (S3_PUBLIC_ACCESS_ENDPOINT != '' && variant != 'original') {
        let response = await fetch(`${S3_PUBLIC_ACCESS_ENDPOINT}/cache/public_${id}_${variant}.JPEG`);
        if (response.status == 200) {
            return response;
        } else {
            return fetch(`${SERVER_URL}/${id}/${variant}`);
        }
    } else {
        return fetch(`${SERVER_URL}/${id}/${variant}`);
    }
}
