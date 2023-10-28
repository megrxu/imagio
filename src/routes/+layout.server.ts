import '$lib/i18n' // Import to initialize. Important :)
import type { LayoutServerLoad } from './$types'
import { getIdentity } from "@cloudflare/pages-plugin-cloudflare-access/api";

export const load: LayoutServerLoad = async ({ platform, request }) => {
	let user = undefined
	if (platform) {
		const jwtToken: string = request.headers.get('Cf-Access-Jwt-Assertion') ?? ""
		user = await getIdentity({
			jwt: jwtToken,
			domain: platform.env.CF_ACCESS_ENDPOINT,
		});
	}

	return {
		user: user
	}
}