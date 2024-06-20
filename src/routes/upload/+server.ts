import { ACCOUNT_ID, SERVER_URL } from "$env/static/private";

export async function PUT({ request }) {
    return await fetch(`${SERVER_URL}/${ACCOUNT_ID}/api/image`, request)
}
