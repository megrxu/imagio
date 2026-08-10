import type { LayoutServerLoad } from './$types';
import { getImageById } from '$lib/cloudflare';

export const load: LayoutServerLoad = async ({ params: { id }, platform }) => {
	const image = await getImageById(platform, id);
	return {
		image,
	}
}