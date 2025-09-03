export const PUT = async ({ fetch, request, params: { category }, platform }) => {
    const { ACCOUNT_ID, SERVER_URL } = (platform as any).env;
    return await fetch(`${SERVER_URL}/${ACCOUNT_ID}/api/images/${category}`, request)
};
