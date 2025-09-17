import type { LayoutServerLoad } from './$types';
import type { RemoteImage } from '$lib/types';
import { SERVER_URL, ACCOUNT_ID, TOKEN } from '$lib/server/env';

export const load: LayoutServerLoad = async ({ fetch, params: { id } }) => {
	const ENDPOINT = `${SERVER_URL}/${ACCOUNT_ID}/api/image/${id}`
	const req = {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${TOKEN}`
		},
	};

	console.log('fetching', ENDPOINT);
	let image: RemoteImage = await (await fetch(ENDPOINT, req)).json();

	return {
		image,
	}
}