export const GET = async ({ fetch, params: { id, variant }, platform }) => {
    const { SERVER_URL, S3_PUBLIC_ACCESS_ENDPOINT } = (platform as any).env;
    if (S3_PUBLIC_ACCESS_ENDPOINT != '' && variant != 'original') {
        let response = await fetch(`${S3_PUBLIC_ACCESS_ENDPOINT}/cache/public_${id}_${variant}.JPEG`);
        if (response.status == 200) {
            return response;
        } else {
            return fetch(`${SERVER_URL}/${id}/${variant}`);
        }
    } else {
        return fetch(`${SERVER_URL}/${id}/${variant}`);
    }
};
