import type { LayoutServerLoad } from './$types';
import { SERVER_URL, ACCOUNT_ID, TOKEN } from '$env/static/private';
import type { RemoteImage } from '$lib/types';

export const load: LayoutServerLoad = async ({ fetch, params: { id } }) => {
	const ENDPOINT = `${SERVER_URL}/${ACCOUNT_ID}/api/image/${id}`
	const req = {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${TOKEN}`
		},
	};

	let image: RemoteImage = await (await fetch(ENDPOINT, req)).json();

	return {
		image,
	}
}