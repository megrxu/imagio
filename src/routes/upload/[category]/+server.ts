
export async function PUT({ request, params: { category }, platform }) {
    let { SERVER_URL, ACCOUNT_ID } = platform?.env ?? {};
    return await fetch(`${SERVER_URL}/${ACCOUNT_ID}/api/images/${category}`, request)
}
