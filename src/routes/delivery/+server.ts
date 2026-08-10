import { listImagesFromRegistry } from '$lib/cloudflare';

export async function GET({ url, platform }) {
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') ?? '1', 10));
    const skip = Math.max(0, parseInt(url.searchParams.get('skip') ?? '0', 10));
    const category = url.searchParams.get('category') ?? 'public';
    const remoteImages = await listImagesFromRegistry(platform, category);
    return new Response(JSON.stringify(remoteImages.slice(skip, skip + limit)), {
        headers: {
            'content-type': 'application/json; charset=utf-8',
        },
    });
}
