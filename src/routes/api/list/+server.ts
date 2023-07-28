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
        try {
            const response = await fetch(UPLOAD_URL, req);
            const res = await response.json();
            return json(res)
        } catch (error) {
            console.log(error);
            return json({
                message: 'Error.'
            })
        }
    } else {
        return json({
            message: '401 Unauthorized.'
        })
    }
}