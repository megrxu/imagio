import type { Handle } from "@sveltejs/kit";
import { generateLoginURL } from "@cloudflare/pages-plugin-cloudflare-access/api";

export const handle: Handle = async ({ event, resolve }) => {
    const category = event.params.category

    if (event.platform && category != 'public') {
        const loginURL = generateLoginURL({
            redirectURL: event.request.referrer,
            domain: event.platform.env.CF_ACCESS_ENDPOINT,
            aud: event.platform.env.CF_ACCESS_AUD,
        });

        return new Response(null, {
            status: 302,
            headers: { Location: loginURL },
        });
    }

    return resolve(event)
}