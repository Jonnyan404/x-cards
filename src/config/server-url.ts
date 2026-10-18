/**
 * 服务端地址的纯逻辑：归一化、拼路径、造记录。
 *
 * 单独拆一个文件是为了能测 —— 读写 storage 的那部分依赖 webextension-polyfill，
 * 在 Node 里 import 会直接抛错，混在一起就没法跑单元测试了。
 * 所以这个文件刻意不 import 任何东西。
 */
export interface ServerEntry {
    id: string;
    name: string;
    /** 站点根地址，不带尾斜杠，可含子路径（如 https://user.github.io/x-cards） */
    url: string;
}

/** 官方部署。列表为空、数据损坏或被删空时都回落到它。 */
export const OFFICIAL_SERVER: ServerEntry = {
    id: "official",
    name: "Official",
    url: "https://x-cards.vercel.app",
};

export const DEFAULT_SERVERS: ServerEntry[] = [OFFICIAL_SERVER];

/**
 * 归一化用户输入的地址。
 *
 * 补 https:// 前缀、去掉尾斜杠、拒绝非 http(s)。返回 null 表示不合法。
 * http:// 是故意放行的：本地调试要指向 http://127.0.0.1:1947。
 */
export function normalizeServerUrl(raw: string): string | null {
    const input = raw == null ? "" : String(raw).trim();
    if (input === "") return null;

    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;

    let parsed: URL;
    try {
        parsed = new URL(withScheme);
    } catch (e) {
        return null;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

/**
 * 拼页面地址。统一用不带尾斜杠的形式：
 *   官方 Vercel 部署  /independent -> 200，/independent/ -> 308
 *   GitHub Pages      /independent -> 301 -> /independent/ -> 200
 * 两种托管都能落到页面本身；反过来（固定带尾斜杠）在 Vercel 上要靠一次 308。
 */
export const independentUrlFor = (server: ServerEntry): string => `${server.url}/independent`;

export const welcomeUrlFor = (server: ServerEntry): string => `${server.url}/welcome`;

export const rootUrlFor = (server: ServerEntry): string => `${server.url}/`;

function makeId(): string {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 造一条服务器记录。地址不合法返回 null，由调用方决定怎么提示。 */
export function createServer(name: string, rawUrl: string): ServerEntry | null {
    const url = normalizeServerUrl(rawUrl);
    if (url === null) return null;
    return { id: makeId(), name: String(name == null ? "" : name).trim() || new URL(url).host, url: url };
}

/** 清洗 storage 里读出来的数据：丢掉不合法的条目，缺字段的补默认值。 */
export function sanitizeServers(list: unknown): ServerEntry[] {
    if (!Array.isArray(list)) return [];
    const out: ServerEntry[] = [];
    for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const raw = item as Partial<ServerEntry>;
        const url = normalizeServerUrl(String(raw.url == null ? "" : raw.url));
        if (url === null) continue;
        out.push({
            id: typeof raw.id === "string" && raw.id !== "" ? raw.id : makeId(),
            // 跟 createServer 保持一致：缺名字就显示主机名，而不是整条 URL
            name: String(raw.name == null ? "" : raw.name).trim() || new URL(url).host,
            url: url,
        });
    }
    return out;
}
