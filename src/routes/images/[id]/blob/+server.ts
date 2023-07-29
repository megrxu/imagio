export async function GET({ fetch, platform, params: { id } }) {
    if (platform) {
        const DOWNLOAD_URL = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1/${id}/blob`
        const req = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
            },
        };
        return fetch(DOWNLOAD_URL, req);
    }
}
