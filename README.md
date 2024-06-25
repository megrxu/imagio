# Imagio

Imagio is a web app that allows you to store and manage private/public images, with the help of [OpenDAL](https://opendal.apache.org), [Cloudflare Pages](https://developers.cloudflare.com/pages/) and [SvelteKit](https://kit.svelte.dev/). 

Introduction [here](https://xugr.me/dev/imagio/) (中文).

## Build

To build and deploy imagio, follow the steps below:

0. Set up the [imagio-server instance](https://github.com/megrxu/imagio-server).
1. Fork and set up Cloudflare Pages with SvelteKit.
2. Set up environment variables in your Cloudflare dashboard:
   1. `ACCOUNT_ID`: The account id specified when running the server.
   2. `TOKEN`: Not used currently.
   3. `SERVER_URL`: Your imagio-server instance URL.
   3. `S3_PUBLIC_ACCESS_ENDPOINT`: Your S3 public access endpoint.
3. Publish your pages.

## Endpoints

Imagio provides the following endpoints:

- `/upload`: to upload images.
- `/images`: to list and modify uploaded images.
