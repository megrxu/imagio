// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import { Identity } from "@cloudflare/pages-plugin-cloudflare-access"

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: Identity | undefined,
		}
		// interface PageData {}

		interface Platform {
			env: {
				CF_IMAGES_API_KEY: string,
				ADMIN_USER_ID: string,
				ACCOUNT_ID: string,
				ACCOUNT_HASH: string
				CF_ACCESS_ENDPOINT: string,
				CF_ACCESS_AUD: string,
				IMAGIO_DB: D1Database,
				CREDENTIAL: string
			}
		}
	}
}

export { };
