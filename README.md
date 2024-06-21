# Imagio

Imagio is a web app that allows you to store and manage private/public images, with the help of [OpenDAL](https://opendal.apache.org), [Cloudflare Pages](https://developers.cloudflare.com/pages/) and [SvelteKit](https://kit.svelte.dev/).

## Build

To build and deploy imagio, follow the steps below:

0. Set up the [imagio-server instance](https://github.com/megrxu/imagio-server).
1. Fork and set up Cloudflare Pages with SvelteKit.
2. Set up environment variables in your Cloudflare dashboard:
   1. `ACCOUNT_ID`: The CF account ID.
   1. `TOKEN`: You can find your ID from the "Team" page in your ZeroTrust page.
   2. `SERVER_URL`: Your imagio-server instance.
3. Publish your pages.

## Endpoints

Imagio provides the following endpoints:

- `/upload`: to upload images.
- `/images`: to list and modify uploaded images.
