import type { Image } from "./types";

export function getUUID(url: string): string | undefined {
    return url.split("/").at(-2);
}

export function getVariant(url: string, variant: string): string {
    let segs = url.split("/");
    segs.pop();
    segs.push(variant);
    return segs.join("/");
}

export function uploadImage(image: Image): Promise<Response> {
    let data = new FormData();
    data.append("file", image.file);

    const req = {
        method: "POST",
        body: data,
    };

    return fetch("/upload", req);
}
