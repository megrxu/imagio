import type { ImageMetaData } from "$lib/types";
import { updateImageMetadata } from "$lib/cloudflare";

export async function PATCH({ request, params: { id }, platform }) {
    const meta: ImageMetaData = JSON.parse(await request.text());
    const updated = await updateImageMetadata(platform, id, meta);
    return new Response(JSON.stringify(updated), {
        headers: {
            'content-type': 'application/json; charset=utf-8',
        },
    });
}
