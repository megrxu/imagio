import type { LayoutServerLoad } from './$types';
const SERVER_URL = import.meta.env.SERVER_URL;
const ACCOUNT_ID = import.meta.env.ACCOUNT_ID;
const TOKEN = import.meta.env.TOKEN;
import type { RemoteImage } from '$lib/types';

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