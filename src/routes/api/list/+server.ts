import { json } from '@sveltejs/kit';

export async function GET({ fetch, platform }) {
    if (platform) {
        const UPLOAD_URL = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1`
        const req = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
            },
        }
        return fetch(UPLOAD_URL, req).then((response) => {
            return response
        }).catch((error) => {
            return json({
                error: error,
                success: false,
            });
        });
    } else {
        return json({
            message: '401 Unauthorized.'
        })
    }
}