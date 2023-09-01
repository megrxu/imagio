export async function GET({ fetch, request, platform, params: { id, variant } }) {
    if (platform) {
        return fetch(`https://imagedelivery.net/${platform.env.ACCOUNT_HASH}/${id}/${variant}`);
    }
}
