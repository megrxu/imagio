export interface Image {
    src: string | ArrayBuffer | null;
    file: File,
};

export interface RemoteImage {
    uuid: string,
    category: string,
    meta?: ImageMetaData,
    name?: string,
    deliveryUrl?: string,
    uploadedAt?: string
}

export interface ImageMetaData {
    tags: string[],
    category?: string,
    originalName?: string,
    uploadedAt?: string
}
