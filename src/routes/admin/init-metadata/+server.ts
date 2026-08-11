import { initializeAllOriginalMetadata, isAdminRequest } from '$lib/cloudflare';

export async function POST({ request, platform }) {
    if (!isAdminRequest(request, platform)) {
        return new Response('Forbidden', { status: 403 });
    }

    let body: {
        cursor?: string;
        limit?: number;
        withExif?: boolean;
        maxPages?: number;
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
        const result = await initializeAllOriginalMetadata(platform, {
            cursor: typeof body.cursor === 'string' && body.cursor.trim() ? body.cursor : undefined,
            limit: typeof body.limit === 'number' ? body.limit : undefined,
            withExif: typeof body.withExif === 'boolean' ? body.withExif : undefined,
            maxPages: typeof body.maxPages === 'number' ? body.maxPages : undefined,
        });

        return new Response(JSON.stringify(result), {
            headers: {
                'content-type': 'application/json; charset=utf-8',
            },
        });
    } catch (error) {
        return new Response(error instanceof Error ? error.message : 'Metadata init failed', { status: 500 });
    }
}
