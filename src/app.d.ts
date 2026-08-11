// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import { D1Database, R2Bucket } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface AssetsBinding {
			fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		}

		interface ImagesBinding {
			input(stream: ReadableStream | ArrayBuffer | string): ImagesBindingInput;
		}

		interface ImagesBindingInput {
			transform(options: Record<string, unknown>): ImagesBindingInput;
			output(options: { format: string; quality?: string | number }): Promise<ImagesBindingOutput>;
		}

		interface ImagesBindingOutput {
			response(): Response;
		}

		interface Platform {
			env?: {
				ACCOUNT_ID?: string;
				SERVER_URL?: string;
				TOKEN?: string;
				ASSETS?: AssetsBinding;
				IMAGES?: ImagesBinding;
				IMAGIO_R2?: R2Bucket;
				IMAGIO_DB?: D1Database;
			};
		}
	}
}

export { };
