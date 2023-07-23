import type { Image } from "$lib/types";

export async function upload_proxy(image: Image): Promise<Response> {
    let data = new FormData();
    data.append('file', image.file);

    const req = {
        method: 'POST',
        body: data,
    }

    return fetch('/api/upload', req);
}