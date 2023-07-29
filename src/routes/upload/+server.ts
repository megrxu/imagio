export async function POST({ fetch, request, platform }) {
    if (platform) {
        const ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1`
        const req = {
            method: 'POST',
            headers: {
                'Access-Control-Allow-Headers': 'Authorization',
                'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
            },
            body: await request.formData()
        };
        return fetch(ENDPOINT, req);
    }
}
