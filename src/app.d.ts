// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}

		interface Platform {
			env: {
				CF_IMAGES_API_KEY: string,
				ACCOUNT_ID: string,
				ACCOUNT_HASH: string
				IMAGIO_DB: D1Database,
				CREDENTIAL: string
			}
		}
	}
}

export { };
