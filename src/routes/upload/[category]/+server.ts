import { ACCOUNT_ID, SERVER_URL } from "$env/static/private";

export async function PUT({ request, params: { category } }) {
    return await fetch(`${SERVER_URL}/${ACCOUNT_ID}/api/images/${category}`, request)
}
