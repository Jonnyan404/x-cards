import type { PlasmoMessaging } from "@plasmohq/messaging"
import * as _ from 'lodash-es'
import { tweetApiUrl } from "@src/config/urls"


const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const action = req.body.action;
    if (action === 'get-tweet') {
        const url = req.body.url;
        // 注意：next.config.js 是 output: 'export'（静态导出），线上不含 API routes，
        // 因此这个地址在部署环境里一直是 404，仅在 `next dev` 下可用。
        const response = await fetch(tweetApiUrl(url), {
            method: 'GET',

        });
        if (response.status !== 200 || !response.ok) {
            res.send({ error: 'error' });
        }
        const data = await response.json();

        return res.send(data.data);
    } 
    // else if (action === 'get-card-templates') {
    //     const templates = await templatesStorage.getAll();
    //     console.log('templates find in bg', templates)
    //     return res.send(templates);
    // }

}
export default handler;