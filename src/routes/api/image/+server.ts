export async function GET({ fetch, platform, url }) {
    if (platform) {
        if (url.searchParams.get('action') == 'download') {
            const DOWNLOAD_URL = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1/${url.searchParams.get('id')}/blob`
            const req = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
                },
            };
            return fetch(DOWNLOAD_URL, req);
        } else if (url.searchParams.get('action') == 'info') {
            const BRIFE_URL = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1/${url.searchParams.get('id')}`
            const req = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
                },
            }
            return fetch(BRIFE_URL, req);
        }
    }
}