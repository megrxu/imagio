export type Image = {
    src: string | ArrayBuffer | null;
    filename: string;
    mime: string;
    nanoId: string;
    alt?: string;
};