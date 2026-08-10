import { uploadImageToCloudflare } from '$lib/cloudflare';

export async function PUT({ request, params: { category }, platform }) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
        return new Response('Invalid upload payload', { status: 400 });
    }

    try {
        const image = await uploadImageToCloudflare(file, category, platform);
        return new Response(JSON.stringify(image), {
            headers: {
                'content-type': 'application/json; charset=utf-8',
            },
        });
    } catch (error) {
        return new Response(error instanceof Error ? error.message : 'Upload failed', { status: 500 });
    }
}
