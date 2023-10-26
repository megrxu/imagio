import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, platform }) => {
    let image_ids: string[] = [];
    if (platform) {
        let keysResp = await platform.env.IMAGIO_KV.list({
            prefix: 'public:',
            limit: 24,
        })
        image_ids = keysResp.keys.map(function (key) {
            return key.name.split(':')[2]
        })
    }
    return {
        image_ids: image_ids
    }
}