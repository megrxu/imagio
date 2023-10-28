import type { LayoutServerLoad } from './$types';
import type { UploadResResp, UploadResp } from "$lib/types";

export const load: LayoutServerLoad = async ({ fetch, platform, params: { id } }) => {
	let image: UploadResResp | undefined = undefined;
	if (platform) {
		const ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${platform.env.ACCOUNT_ID}/images/v1/${id}`
		const req = {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${platform.env.CF_IMAGES_API_KEY}`
			},
		};
		let resp = await fetch(ENDPOINT, req);
		let imageResp: UploadResp = JSON.parse(await resp.text());
		image = imageResp.result;
	}

	return {
		image: image
	}
}