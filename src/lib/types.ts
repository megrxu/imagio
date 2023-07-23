export type Image = {
    src: string | ArrayBuffer | null;
    file: File,
    alt: string;
};

export type CfImagesResp<T> = {
    success: Boolean,
    errors: object[],
    result: T
}

export type UploadResResp = {
    filename: string,
    id: string,
    meta: object,
    uploaded: string,
    variants: string[]
}

export type ListResResp = {
    images: UploadResResp[]
}

export type ListResp = CfImagesResp<ListResResp>;
export type UploadResp = CfImagesResp<UploadResResp>;