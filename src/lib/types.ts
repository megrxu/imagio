export type Image = {
    src: string | ArrayBuffer | null;
    file: File,
    alt: string;
};

export type UploadResp = {
    success: Boolean,
    errors: object[],
    result: {
        filename: string,
        id: string,
        meta: object,
        uploaded: string,
        variants: URL[]
    }
}