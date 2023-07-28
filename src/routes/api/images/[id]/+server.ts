export async function GET({ fetch, platform, params: { id } }) {
    if (platform) {
        const BRIFE_URL = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1/${id}`
        const req = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
            },
        }
        return fetch(BRIFE_URL, req);
    }
}

export async function DELETE({ fetch, platform, params: { id } }) {
    if (platform) {
        const BRIFE_URL = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1/${id}`
        const req = {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
            },
        };
        return fetch(BRIFE_URL, req);
    }
}
