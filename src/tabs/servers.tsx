import { useEffect, useState } from "react";

import {
    createServer,
    getActiveServer,
    getServers,
    resetServers,
    rootUrlFor,
    saveServers,
    setActiveServer,
    welcomeUrlFor,
    type ServerEntry,
} from "@src/config/servers";

// 扩展页面不走项目的 tailwind 管线，样式全部内联，避免打包时缺 css。
const s: Record<string, React.CSSProperties> = {
    // 这个页面同时被当 popup 打开（manifest 的 action.default_popup 指向它），
    // 所以不能用 minHeight:100vh —— popup 的高度由内容决定，100vh 会把它撑到
    // Chrome 允许的 600px 上限，底下留一大片空白。固定宽度给 popup 一个稳定尺寸，
    // margin auto 让它在标签页里居中。
    page: {
        width: 460,
        margin: "0 auto",
        background: "#fff",
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: "#111",
    },
    wrap: {
        padding: "18px 16px",
    },
    title: { margin: 0, fontSize: 18, fontWeight: 600 },
    sub: { margin: "4px 0 20px", fontSize: 13, color: "#6b7280" },
    row: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        marginBottom: 8,
        cursor: "pointer",
    },
    rowActive: { borderColor: "#2563eb", background: "#eff6ff" },
    dot: {
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid #d1d5db",
        flex: "0 0 auto",
    },
    dotActive: { borderColor: "#2563eb", background: "#2563eb" },
    name: { fontSize: 13, fontWeight: 600 },
    url: { fontSize: 11, color: "#6b7280", wordBreak: "break-all" },
    grow: { flex: 1, minWidth: 0 },
    del: {
        border: "none",
        background: "transparent",
        color: "#9ca3af",
        cursor: "pointer",
        fontSize: 16,
        lineHeight: 1,
        padding: "2px 4px",
    },
    form: { display: "flex", gap: 6, marginTop: 12 },
    input: {
        flex: 1,
        minWidth: 0,
        fontSize: 12,
        padding: "6px 8px",
        border: "1px solid #d1d5db",
        borderRadius: 6,
        outline: "none",
    },
    btn: {
        fontSize: 12,
        padding: "6px 10px",
        border: "1px solid #d1d5db",
        borderRadius: 6,
        background: "#fff",
        cursor: "pointer",
        color: "#111",
    },
    btnPrimary: { background: "#2563eb", borderColor: "#2563eb", color: "#fff" },
    err: { marginTop: 8, fontSize: 11, color: "#dc2626" },
    hint: { marginTop: 8, fontSize: 11, color: "#059669" },
    foot: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: 14,
        paddingTop: 10,
        borderTop: "1px solid #f3f4f6",
    },
    empty: { fontSize: 12, color: "#6b7280", padding: "6px 0" },
};

const ServersPage = () => {
    const [servers, setServers] = useState<ServerEntry[]>([]);
    const [activeId, setActiveId] = useState<string>("");
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");
    const [hint, setHint] = useState("");

    useEffect(() => {
        document.title = "Tweet Cards · 服务端";
        (async () => {
            const [list, active] = await Promise.all([getServers(), getActiveServer()]);
            setServers(list);
            setActiveId(active.id);
        })();
    }, []);

    const flash = (msg: string) => {
        setHint(msg);
        setTimeout(() => setHint(""), 2000);
    };

    const select = async (id: string) => {
        await setActiveServer(id);
        setActiveId(id);
        flash("已切换，刷新推文页面即可生效");
    };

    const add = async () => {
        setError("");
        const entry = createServer(name, url);
        if (!entry) {
            setError("地址不合法。示例：https://example.com 或 http://127.0.0.1:1947");
            return;
        }
        if (servers.some((x) => x.url === entry.url)) {
            setError("这个地址已经在列表里了");
            return;
        }
        const next = [...servers, entry];
        await saveServers(next);
        await setActiveServer(entry.id);
        setServers(next);
        setActiveId(entry.id);
        setName("");
        setUrl("");
        flash("已添加并设为当前");
    };

    const remove = async (id: string) => {
        const next = servers.filter((x) => x.id !== id);
        await saveServers(next);
        if (id === activeId) {
            const fallback = next[0];
            if (fallback) await setActiveServer(fallback.id);
            setActiveId(fallback ? fallback.id : "");
        }
        setServers(next);
    };

    const reset = async () => {
        const defaults = await resetServers();
        await setActiveServer(defaults[0].id);
        setServers(defaults);
        setActiveId(defaults[0].id);
        flash("已恢复默认");
    };

    const openSite = async () => {
        const active = await getActiveServer();
        chrome.tabs.create({ url: rootUrlFor(active) });
    };

    // 引导页不是每台服务器都有：官方 Vercel 部署上 /welcome 实测 404，
    // 所以单独给一个入口，自动打开的地方一律用根地址。
    const openWelcome = async () => {
        const active = await getActiveServer();
        chrome.tabs.create({ url: welcomeUrlFor(active) });
    };

    // popup 有 600px 的高度上限，服务器多的时候需要完整视图
    const openAsTab = () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("tabs/servers.html") });
    };

    return (
        <div style={s.page}>
        <div style={s.wrap}>
            <h1 style={s.title}>Tweet Cards</h1>
            <p style={s.sub}>选择卡片渲染用的服务端，可自行添加自部署地址</p>

            {servers.length === 0 && <div style={s.empty}>列表为空，将使用官方默认地址</div>}

            {servers.map((server) => {
                const active = server.id === activeId;
                return (
                    <div
                        key={server.id}
                        style={{ ...s.row, ...(active ? s.rowActive : {}) }}
                        onClick={() => select(server.id)}
                    >
                        <div style={{ ...s.dot, ...(active ? s.dotActive : {}) }} />
                        <div style={s.grow}>
                            <div style={s.name}>{server.name}</div>
                            <div style={s.url}>{server.url}</div>
                        </div>
                        <button
                            style={s.del}
                            title="删除"
                            onClick={(e) => {
                                e.stopPropagation();
                                remove(server.id);
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}

            <div style={s.form}>
                <input
                    style={{ ...s.input, maxWidth: 96 }}
                    placeholder="名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    style={s.input}
                    placeholder="https://your-server.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <button style={{ ...s.btn, ...s.btnPrimary }} onClick={add}>
                    添加
                </button>
            </div>

            {error && <div style={s.err}>{error}</div>}
            {hint && <div style={s.hint}>{hint}</div>}

            <div style={s.foot}>
                <button style={s.btn} onClick={reset}>
                    恢复默认
                </button>
                <div style={{ display: "flex", gap: 6 }}>
                    <button style={s.btn} onClick={openAsTab}>
                        展开
                    </button>
                    <button style={s.btn} onClick={openSite}>
                        打开站点
                    </button>
                    <button style={s.btn} onClick={openWelcome}>
                        使用说明
                    </button>
                </div>
            </div>
        </div>
        </div>
    );
};

export default ServersPage;
