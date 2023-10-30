import type { Handle, RequestEvent } from "@sveltejs/kit";
import { getIdentity, generateLoginURL } from "@cloudflare/pages-plugin-cloudflare-access/api";
import { error } from '@sveltejs/kit';

export const login = async (event: RequestEvent<Partial<Record<string, string>>, string | null>) => {
    if (event.platform) {
        return new Response(null, {
            status: 302,
            headers: {
                Location: generateLoginURL({
                    redirectURL: event.request.referrer ?? event.request.url,
                    domain: event.platform.env.CF_ACCESS_ENDPOINT,
                    aud: event.platform.env.CF_ACCESS_AUD,
                })
            },
        });
    } else {
        throw error(
            403, {
            message: 'Forbidden'
        }
        )
    }
}

export const handle: Handle = async ({ event, resolve }) => {
    if (event.platform) {
        const jwtToken = event.request.headers.get('Cf-Access-Jwt-Assertion')
        if (event.locals.user == undefined && jwtToken != null) {
            event.locals.user = await getIdentity({
                jwt: jwtToken,
                domain: event.platform.env.CF_ACCESS_ENDPOINT,
            });
        }
    }

    const accessCat = event.params?.category ?? 'public'

    if (event.request.method != 'GET' || accessCat != 'public') {
        if (event.locals.user != undefined) {
            if (event.locals.user?.user_uuid == event.platform?.env.ADMIN_USER_ID) {
                return resolve(event)
            } else {
                throw error(
                    403, {
                    message: 'Forbidden'
                }
                )
            }
        } else {
            return login(event)
        }
    } else {
        return resolve(event)
    }
}