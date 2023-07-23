export async function POST({ fetch, request, platform }) {
    if (platform) {
        const UPLOAD_URL = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1`
        const req = {
            method: 'POST',
            header: {
                'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
            },
            body: request.body,
        }
        return fetch(UPLOAD_URL, req);
    } else {
        return new Response("401 Unauthorized.")
    }
}