// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}

		interface Platform {
			env: {
				SERVER_URL: string,
				ACCOUNT_ID: string,
				TOKEN: string,
			}
		}
	}
}

export { };
