# ImmI

ImmI is a web application that allows you to store and manage private images using [Cloudflare Images ↗](https://www.cloudflare.com/products/cloudflare-images/) and [Cloudflare Pages ↗](https://developers.cloudflare.com/pages/) with the help of [SvelteKit ↗](https://kit.svelte.dev/) framework.

## Build

Please note that this project requires a paid plan of [Cloudflare Images ↗](https://www.cloudflare.com/products/cloudflare-images/).

To build and deploy ImmI, follow the steps below:

1. Set up Cloudflare Pages with SvelteKit.
2. Set up environment variables (the `ACCOUNT_ID` and a read-write API token `CF_IMAGES_API_KEY`) in your Cloudflare dashboard.
3. Publish your pages.

## Endpoints

ImmI provides the following endpoints:

- POST: `/api/upload` - Use this endpoint to upload images.
- GET: `/`, `/show`, `/api/list` - Use these endpoints to view and list uploaded images.
