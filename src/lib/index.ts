import type { Image } from "./types";

export function uploadImage(image: Image): Promise<Response> {
    let data = new FormData();
    data.append("file", image.file);

    const req = {
        method: "POST",
        body: data,
    };

    return fetch("/upload", req);
}
