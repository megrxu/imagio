// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import { KVNamespace, R2Bucket } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Platform {
			env?: {
				ACCOUNT_ID?: string;
				SERVER_URL?: string;
				TOKEN?: string;
				S3_PUBLIC_ACCESS_ENDPOINT?: string;
				IMAGIO_KV?: KVNamespace;
				IMAGIO_R2?: R2Bucket;
			};
		}
	}
}

export { };
