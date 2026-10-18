import Browser from "webextension-polyfill";

import {
    DEFAULT_SERVERS,
    OFFICIAL_SERVER,
    sanitizeServers,
    type ServerEntry,
} from "./server-url";

// 纯逻辑（归一化、拼路径、造记录）在 server-url.ts，这里只管读写。
export * from "./server-url";

/**
 * 扩展可切换的多个服务端地址。
 *
 * 为什么要有这个：卡片渲染跑在 iframe 里（x.com 的 CSP 不允许在页面上下文里
 * 加载 fonts.gstatic.com），iframe 指向哪台服务器就等于把渲染交给谁。
 * 官方部署是别人的，域名过期、平台条款下线都发生过，所以地址要能换，
 * 而且换的时候不该重新发版上架。
 *
 * 存储：chrome.storage.local。只有扩展自己读写，不上传。
 */

// 导出来给 content script 监听：改了服务器地址要能当场生效，不用刷新 x.com
export const SERVERS_KEY = "xCardsServers";
export const ACTIVE_SERVER_KEY = "xCardsActiveServerId";

export async function getServers(): Promise<ServerEntry[]> {
    const stored = await Browser.storage.local.get(SERVERS_KEY);
    const list = sanitizeServers(stored ? stored[SERVERS_KEY] : null);
    if (list.length === 0) return DEFAULT_SERVERS.map((s) => ({ ...s }));
    return list;
}

export async function saveServers(list: ServerEntry[]): Promise<void> {
    await Browser.storage.local.set({ [SERVERS_KEY]: list });
}

/** 当前选中的服务器。选中项不存在（被删了）时退回第一条。 */
export async function getActiveServer(): Promise<ServerEntry> {
    const pendingServers = getServers();
    const pendingActive = Browser.storage.local.get(ACTIVE_SERVER_KEY);
    const servers = await pendingServers;
    const active = await pendingActive;
    const id = active ? active[ACTIVE_SERVER_KEY] : null;
    return servers.find((s) => s.id === id) ?? servers[0] ?? OFFICIAL_SERVER;
}

export async function setActiveServer(id: string): Promise<void> {
    await Browser.storage.local.set({ [ACTIVE_SERVER_KEY]: id });
}

/** 恢复出厂：删掉用户数据，回到只有官方一条的状态。 */
export async function resetServers(): Promise<ServerEntry[]> {
    await Browser.storage.local.remove([SERVERS_KEY, ACTIVE_SERVER_KEY]);
    return DEFAULT_SERVERS.map((s) => ({ ...s }));
}
