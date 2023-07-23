import type { Image } from "$lib/types";

export async function upload_proxy(image: Image) {
    let data = new FormData();
    data.append('file', image.file);

    const req = {
        method: 'POST',
        body: data,
    }

    const resp = (await fetch('/api/upload', req)).json();
    return resp;
}