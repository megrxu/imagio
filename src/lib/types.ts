export interface Image {
    src: string | ArrayBuffer | null;
    file: File,
};

export interface RemoteImage {
    uuid: string,
    category: string,
    meta?: ImageMetaData
}

export interface ImageMetaData {
    tags: string[],
    category?: string
}
