import { getActiveServer, rootUrlFor } from "@src/config/servers";

// 服务器管理页是 tabs 页面（src/tabs/servers.tsx），并由 manifest 的
// action.default_popup 指向它，所以点图标弹的是 popup。
//
// 它没有用 Plasmo 自己的 popup 入口（src/popup.tsx）：在带 src/ 目录的项目里，
// Plasmo 生成 popup 入口后会解析不到（Failed to resolve '../../src/popup.tsx'），
// 构建直接失败。0.88.0 和最新的 0.90.5 都一样，升级不解决（已在 CI 上实测）。
// tabs 页面走另一条生成路径，是好的，manifest 覆写把它接成 popup。
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

// 点图标弹 popup，由 manifest 的 action.default_popup 接管。
// 这里不能再注册 chrome.action.onClicked：manifest 里一旦有 default_popup，
// Chrome 就不会再触发 onClicked，留着只会让人误以为它还在生效。
