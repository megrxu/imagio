import { debugStorageSnapshot, isAdminRequest } from '$lib/cloudflare';

export async function GET({ request, url, platform }) {
    if (!isAdminRequest(request, platform)) {
        return new Response('Forbidden', { status: 403 });
    }

    const category = url.searchParams.get('category') ?? 'public';
    const sampleId = url.searchParams.get('id') ?? undefined;

    try {
        const result = await debugStorageSnapshot(platform, category, sampleId);
        return new Response(JSON.stringify(result), {
            headers: {
                'content-type': 'application/json; charset=utf-8',
            },
        });
    } catch (error) {
        return new Response(error instanceof Error ? error.message : 'Debug failed', { status: 500 });
    }
}
