# `imagio` (WIP)

`imagio` is a web application that allows you to store and manage private images using [Cloudflare Images](https://www.cloudflare.com/products/cloudflare-images/) and [Cloudflare Pages](https://developers.cloudflare.com/pages/) with the help of [SvelteKit](https://kit.svelte.dev/) framework.

## Build

Please note that this project requires a paid plan of [Cloudflare Images](https://www.cloudflare.com/products/cloudflare-images/).

To build and deploy imagio, follow the steps below:

1. Set up Cloudflare Pages with SvelteKit.
2. Set up environment variables in your Cloudflare dashboard:
   1. `ACCOUNT_HASH`: The CF account hash.
   1. `ACCOUNT_ID`: The CF account ID.
   1. `ADMIN_USER_ID`: You can find your ID from the "Team" page in your ZeroTrust page.
   1. `CF_ACCESS_AUD`: Your CF Access Application AUD tag.
   1. `CF_ACCESS_ENDPOINT`: Your CF Access URL.
   1. `CF_IMAGES_API_KEY`: Your CF image API key.
3. Publish your pages.

## Endpoints

`imagio` provides the following endpoints:

- `/upload`: to upload images.
- `/images`: to list and modify uploaded images.
