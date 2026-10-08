import { sendToContentScript } from "@plasmohq/messaging"
import { welcomeUrl } from "@src/config/urls"


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkInstallation") {
        // 直接回复 content script
        sendResponse({ isInstalled: true });
    }
});


chrome.runtime.onInstalled.addListener(function (details) {
    console.log('onInstalled', details);
    if (details.reason == "install") {
        chrome.tabs.create({ url: welcomeUrl() });
    }
});

chrome.action.onClicked.addListener(function (tab) {
    chrome.tabs.create({ url: welcomeUrl() });
});
