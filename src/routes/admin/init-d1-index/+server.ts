import { initializeD1ImageIndex, isAdminRequest } from '$lib/cloudflare';

export async function POST({ request, platform }) {
    if (!isAdminRequest(request, platform)) {
        return new Response('Forbidden', { status: 403 });
    }

    let body: {
        cursor?: string;
        limit?: number;
        maxPages?: number;
        hydrateExif?: boolean;
    } = {};

    try {
        const parsed = await request.json();
        if (parsed && typeof parsed === 'object') {
            body = parsed as typeof body;
        }
    } catch {
        body = {};
    }

    try {
        const result = await initializeD1ImageIndex(platform, {
            cursor: typeof body.cursor === 'string' && body.cursor.trim() ? body.cursor : undefined,
            limit: typeof body.limit === 'number' ? body.limit : undefined,
            maxPages: typeof body.maxPages === 'number' ? body.maxPages : undefined,
            hydrateExif: typeof body.hydrateExif === 'boolean' ? body.hydrateExif : undefined,
        });

        return new Response(JSON.stringify(result), {
            headers: {
                'content-type': 'application/json; charset=utf-8',
            },
        });
    } catch (error) {
        return new Response(error instanceof Error ? error.message : 'D1 index init failed', { status: 500 });
    }
}
