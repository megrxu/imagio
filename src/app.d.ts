// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import { KVNamespace, DatabaseNamespace } from '@cloudflare/workers-types';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
		interface Platform {
			env?: {
				ACCOUNT_ID: string;
				SERVER_URL: string;
				TOKEN?: string;
				S3_PUBLIC_ACCESS_ENDPOINT?: string;
				IMAGIO_KV: KVNamespace;
				IMAGIO_DB: DatabaseNamespace;
			};
		}
	}
}

export { };
