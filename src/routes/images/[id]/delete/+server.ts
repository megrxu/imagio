import { deleteImageFromCloudflare } from '$lib/cloudflare';

export async function DELETE({ params: { id }, platform }) {
    try {
        await deleteImageFromCloudflare(platform, id);
        return new Response(null, { status: 204 });
    } catch {
        return new Response('Delete failed', { status: 500 });
    }
}
