import type { PlasmoMessaging } from "@plasmohq/messaging"
import * as _ from 'lodash-es'
import { getActiveServer } from "@src/config/servers"


const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const action = req.body.action;
    if (action === 'get-tweet') {
        const url = req.body.url;
        // 注意：next.config.js 是 output: 'export'（静态导出），线上不含 API routes，
        // 因此这个地址在部署环境里一直是 404，仅在 `next dev` 下可用。
        // 换成跟当前选中的服务器走，这样本地起 next dev 时填 127.0.0.1 就能用。
        const server = await getActiveServer();
        const response = await fetch(`${server.url}/api/x?url=${url}`, {
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