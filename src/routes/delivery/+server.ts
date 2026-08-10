import { listImagesPage } from '$lib/cloudflare';

export async function GET({ url, platform }) {
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') ?? '1', 10)));
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const category = url.searchParams.get('category') ?? 'public';
    const page = await listImagesPage(platform, category, limit, cursor);
    return new Response(JSON.stringify(page), {
        headers: {
            'content-type': 'application/json; charset=utf-8',
        },
    });
}
