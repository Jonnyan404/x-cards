/**
 * server-url.ts 的单元测试。
 *
 * 这个文件的逻辑决定用户填进去的地址会被拼成什么 URL —— 拼错了卡片就是空白，
 * 而错误要到 iframe 加载失败才暴露，所以在这里钉死。
 *
 * 为什么不用 import：仓储部分依赖 webextension-polyfill（在 Node 里 import 会抛错），
 * 而纯逻辑那部分虽然已经拆出去了，但仍是 TypeScript，Node 20 不能剥离类型。
 * 于是沿用 check-pages.mjs 的做法做最小降级后求值 —— 一旦源码写法超出这套
 * 正则的处理范围，求值会直接抛错，测试是红而不是「悄悄通过」。
 *
 * 用法：node tools/test-servers.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadModule() {
    const src = readFileSync(join(ROOT, "src/config/server-url.ts"), "utf8");
    const js = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/export\s+interface\s+\w+\s*\{[\s\S]*?\n\}/g, "")
        // 函数返回类型（含联合类型）整体去掉，否则 : ServerEntry | null 会剩一个 | null
        .replace(/\)\s*:\s*[^={\n]+(?=\s*\{)/g, ")")
        .replace(/export\s+(const|function|class)/g, "$1")
        .replace(/:\s*ServerEntry\[\]/g, "")
        .replace(/:\s*ServerEntry\b/g, "")
        .replace(/:\s*URL\b/g, "")
        .replace(/:\s*string\s*\|\s*null/g, "")
        .replace(/:\s*string\b/g, "")
        .replace(/:\s*unknown\b/g, "")
        .replace(/as\s+Partial<ServerEntry>/g, "");

    const names = [
        "OFFICIAL_SERVER",
        "DEFAULT_SERVERS",
        "normalizeServerUrl",
        "independentUrlFor",
        "welcomeUrlFor",
        "rootUrlFor",
        "createServer",
        "sanitizeServers",
    ];
    return new Function(`${js}\nreturn {${names.join(",")}};`)();
}

const m = loadModule();
const failures = [];
let count = 0;

function eq(label, actual, expected) {
    count++;
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) failures.push(`${label}\n    期望 ${b}\n    实际 ${a}`);
}

// 归一化：这是用户唯一能输错的地方
eq("补 https 前缀", m.normalizeServerUrl("example.com"), "https://example.com");
eq("去掉尾斜杠", m.normalizeServerUrl("https://example.com/"), "https://example.com");
eq("保留子路径", m.normalizeServerUrl("https://user.github.io/x-cards/"), "https://user.github.io/x-cards");
eq("保留端口（本地调试）", m.normalizeServerUrl("http://127.0.0.1:1947"), "http://127.0.0.1:1947");
eq("主机名转小写", m.normalizeServerUrl("HTTPS://Example.COM"), "https://example.com");
eq("空串", m.normalizeServerUrl(""), null);
eq("纯空格", m.normalizeServerUrl("   "), null);
eq("不是 URL", m.normalizeServerUrl("not a url"), null);
eq("非 http(s) 协议", m.normalizeServerUrl("ftp://example.com"), null);
eq("javascript 伪协议", m.normalizeServerUrl("javascript://alert(1)"), null);

// 拼路径：不带尾斜杠，Vercel 直出 200、Pages 301 到 200
const server = { id: "x", name: "X", url: "https://user.github.io/x-cards" };
eq("independent 地址", m.independentUrlFor(server), "https://user.github.io/x-cards/independent");
eq("welcome 地址", m.welcomeUrlFor(server), "https://user.github.io/x-cards/welcome");
eq("根地址", m.rootUrlFor(server), "https://user.github.io/x-cards/");

// 造记录
const created = m.createServer("Mine", "example.com");
eq("造出来的地址", created.url, "https://example.com");
eq("造出来的名字", created.name, "Mine");
eq("不填名字就用主机名", m.createServer("", "https://a.com").name, "a.com");
eq("地址不合法返回 null", m.createServer("Bad", "not a url"), null);
eq("id 不重复", m.createServer("A", "a.com").id === m.createServer("A", "a.com").id, false);

// 清洗 storage 读出来的脏数据
eq(
    "丢掉不合法的条目",
    m.sanitizeServers([
        { id: "keep", name: "Keep", url: "https://a.com/" },
        { id: "bad", name: "Bad", url: "javascript://x" },
        {},
        null,
    ]).map((s) => s.id),
    ["keep"]
);
// id 是每次生成的，不能拿两个对象整体比，只能分别看字段
const filled = m.sanitizeServers([{ url: "b.com" }])[0];
eq("缺字段：地址被归一化", filled.url, "https://b.com");
eq("缺字段：名字补主机名", filled.name, "b.com");
eq("缺字段：id 非空", typeof filled.id === "string" && filled.id.length > 0, true);
eq("非数组", m.sanitizeServers(null), []);
eq("默认值只有官方一条", m.DEFAULT_SERVERS.length, 1);
eq("官方地址", m.OFFICIAL_SERVER.url, "https://x-cards.vercel.app");

if (failures.length) {
    console.log(`跑了 ${count} 条断言，红了 ${failures.length} 条：`);
    for (const f of failures) console.log("  FAIL " + f);
    process.exit(1);
}
console.log(`结果: 绿 —— ${count} 条断言全部通过`);
