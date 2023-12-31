export interface Image {
    src: string | ArrayBuffer | null;
    file: File,
};

export interface ImageAssocData {
    id: string,
    category: string,
    meta?: ImageMetaData
}

export interface ImageMetaData {
    tags: string[],
    category?: string
}

export type CfImagesResp<Type> = {
    success: Boolean,
    errors: object[],
    result: Type
}

export interface UploadResResp {
    filename: string,
    id: string,
    meta: ImageMetaData,
    uploaded: string,
    variants: string[]
}

export interface ListResResp {
    images: UploadResResp[]
}

export type ListResp = CfImagesResp<ListResResp>;
export type UploadResp = CfImagesResp<UploadResResp>;