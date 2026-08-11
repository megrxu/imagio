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

export interface ImageExifMetadata {
    make?: string,
    model?: string,
    lensModel?: string,
    dateTimeOriginal?: string,
    createDate?: string,
    modifyDate?: string,
    iso?: number,
    focalLength?: number,
    fNumber?: number,
    exposureTime?: string
}

export interface ImageMetaData {
    tags: string[],
    category?: string,
    originalName?: string,
    uploadedAt?: string,
    takenAt?: string,
    createdAt?: string,
    exif?: ImageExifMetadata
}
