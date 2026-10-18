import { getActiveServer, rootUrlFor } from "@src/config/servers";


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkInstallation") {
        // 直接回复 content script
        sendResponse({ isInstalled: true });
    }
});


chrome.runtime.onInstalled.addListener(async function (details) {
    console.log('onInstalled', details);
    if (details.reason == "install") {
        // 用根地址而不是 /welcome：引导页不是每台服务器都有
        // （官方 Vercel 部署上 /welcome 实测 404），自动打开的页面必须保证能打开。
        const server = await getActiveServer();
        chrome.tabs.create({ url: rootUrlFor(server) });
    }
});

// 图标点击交给 popup（popup.tsx）。MV3 下只要 action 有 default_popup，
// chrome.action.onClicked 就不会再触发，所以这里不注册。
