import { isAdminRequest, migrateLegacyD1ToR2 } from '$lib/cloudflare';

export async function POST({ request, platform }) {
    if (!isAdminRequest(request, platform)) {
        return new Response('Forbidden', { status: 403 });
    }

    try {
        const result = await migrateLegacyD1ToR2(platform);
        return new Response(JSON.stringify(result), {
            headers: {
                'content-type': 'application/json; charset=utf-8',
            },
        });
    } catch (error) {
        return new Response(error instanceof Error ? error.message : 'Migration failed', { status: 500 });
    }
}
