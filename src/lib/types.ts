export interface Image {
    src: string | ArrayBuffer | null;
    file: File,
    alt: string;
};

export type CfImagesResp<Type> = {
    success: Boolean,
    errors: object[],
    result: Type
}

export interface UploadResResp {
    filename: string,
    id: string,
    meta: object,
    uploaded: string,
    variants: string[]
}

export interface ListResResp {
    images: UploadResResp[]
}

export type ListResp = CfImagesResp<ListResResp>;
export type UploadResp = CfImagesResp<UploadResResp>;