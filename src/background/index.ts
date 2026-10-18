import { getActiveServer, rootUrlFor } from "@src/config/servers";

// 服务器管理页是一个 tabs 页面（src/tabs/servers.tsx）。
// 它没做成 popup，是因为 Plasmo 0.88 在带 src/ 目录的项目里生成 popup 入口后
// 解析不到（Failed to resolve '../../src/popup.tsx'），构建直接失败；
// tabs 页面走另一条生成路径，是好的。
export const SERVERS_PAGE = "tabs/servers.html";


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

// 点图标打开服务器管理页
chrome.action.onClicked.addListener(function (tab) {
    chrome.tabs.create({ url: chrome.runtime.getURL(SERVERS_PAGE) });
});
