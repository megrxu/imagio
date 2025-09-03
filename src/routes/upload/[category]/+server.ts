const ACCOUNT_ID = import.meta.env.ACCOUNT_ID;
const SERVER_URL = import.meta.env.SERVER_URL;

export const PUT = async ({ request, params: { category } }) => {
    return await fetch(`${SERVER_URL}/${ACCOUNT_ID}/api/images/${category}`, request)
};
