import type { ImageAssocData } from "$lib/types";

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

export async function PUT({ request, platform }) {
    if (platform) {
        const data: ImageAssocData = await request.json()
        const timestamp = Date.now()
        await platform.env.IMAGIO_DB.prepare(`
            insert into images (uuid, category, create_time) values (?, ?, ?)
        `).bind(data.id, data.category, timestamp).run()
        return new Response();
    }
}
