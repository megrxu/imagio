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
- `/admin/init-d1-index` (POST): initialize/backfill D1 image index from R2 objects (requires admin token).

## Local Cloudflare Runtime

Run the app with Cloudflare Worker runtime (including static assets binding, R2, D1 bindings):

1. Install dependencies: `pnpm install`
2. Start local worker runtime: `pnpm dev:cf`
3. Open: `http://127.0.0.1:8788/images`

Notes:

- Local runtime config is in `wrangler.local.toml` (does not affect normal deployment flow).
- To override local env vars, copy `.dev.vars.example` to `.dev.vars` and edit values.

## D1 Image Index Migration

Apply migration SQL before enabling D1-backed listing:

```bash
pnpm wrangler d1 migrations apply imagio-local --local --config wrangler.local.toml
```

Initialize/backfill data from R2 into D1 index:

```bash
curl -X POST http://127.0.0.1:8788/admin/init-d1-index \
   -H 'Authorization: Bearer local-dev-token' \
   -H 'content-type: application/json' \
   -d '{"limit":200,"maxPages":5}'
```
