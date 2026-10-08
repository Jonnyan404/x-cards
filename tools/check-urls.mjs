/**
 * 检查线上站点地址的引用是否健康。
 *
 * 背景：x-cards.net 在 2026-07-31 过期，导致写死该域名的 iframe 渲染器
 * 加载失败，扩展在 x.com 上整体失效。这个脚本把那次排查固化成判据，
 * 防止域名再次悄悄死掉。
 *
 * 用法：
 *   node tools/check-urls.mjs          静态检查（离线，适合 CI）
 *   node tools/check-urls.mjs --probe  额外联网探活 WEBSITE_URL
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

// src/config/* 下所有导出的符号都纳入管理，新增配置不用再来改这份名单
const CONFIG_DIR = join(SRC, "config");
const CONFIG_FILES = readdirSync(CONFIG_DIR).filter((f) => /\.ts$/.test(f));
const configSources = new Map(
  CONFIG_FILES.map((f) => [f, readFileSync(join(CONFIG_DIR, f), "utf8")])
);
const SYMBOLS = [
  ...new Set(
    [...configSources.values()].flatMap((src) => [
      ...src.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g),
    ].map((m) => m[1]))
  ),
];

// 已确认死亡的域名：whois 显示 x-cards.net 处于 pendingDelete，
// static.usesless.com 也无法建立 TLS 连接。
const DEAD_DOMAINS = ["x-cards.net", "static.usesless.com"];

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// 剥掉注释，避免把注释里的符号当成真实引用
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function importLines(src) {
  const found = [];
  const re = /import\s+[\s\S]*?from\s+["'][^"']+["']/g;
  let m;
  while ((m = re.exec(src))) found.push(m[0]);
  return found.join("\n");
}

const files = walk(SRC);
const errors = [];
let useCount = 0;

// 1. 用到 src/config 里符号的文件，必须把这些符号引入进来
for (const f of files) {
  const body = stripComments(readFileSync(f, "utf8"));
  for (const sym of SYMBOLS) {
    if (!new RegExp(`\\b${sym}\\b`).test(body)) continue;
    useCount++;
    const declaredLocal = new RegExp(
      `(const|let|var|function|class)\\s+${sym}\\b`
    ).test(body);
    const imported = new RegExp(`\\b${sym}\\b`).test(importLines(body));
    if (!declaredLocal && !imported) {
      errors.push(`缺少 import: ${sym} 被使用但未引入 -> ${f}`);
    }
  }
}

const urlsSrc = configSources.get("urls.ts");
if (!urlsSrc) errors.push("src/config/urls.ts 不见了");

// 2. 每个 config 文件都得有导出，防止被清空或重构成空壳
for (const [name, src] of configSources) {
  const own = [...src.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)];
  if (own.length === 0) errors.push(`src/config/${name} 没有导出任何符号`);
}

// 3. urls.ts 是唯一允许出现域名的地方，但不允许指向已失效的域名
const websiteUrl = urlsSrc?.match(/export const WEBSITE_URL\s*=\s*"([^"]+)"/)?.[1];
if (!websiteUrl) {
  errors.push("urls.ts 里找不到 WEBSITE_URL 的定义");
} else {
  for (const d of DEAD_DOMAINS) {
    if (websiteUrl.includes(d)) {
      errors.push(`urls.ts 的 WEBSITE_URL 指向已失效域名 ${d} -> ${websiteUrl}`);
    }
  }
}

// 4. urls.ts 之外不允许再出现硬编码域名
for (const f of files) {
  if (f.endsWith(join("config", "urls.ts"))) continue;
  const body = stripComments(readFileSync(f, "utf8"));
  for (const d of DEAD_DOMAINS) {
    if (body.includes(d)) errors.push(`残留硬编码域名 ${d} -> ${f}`);
  }
}

console.log(`扫描 ${files.length} 个源文件，符号引用 ${useCount} 处`);

// 5. 可选：联网探活。这一条正是当初定位到根因的手段 —— 域名过期在
//    静态检查里看不出来，只有真的连一次才暴露。
if (process.argv.includes("--probe") && websiteUrl) {
  // 尾斜杠跟着 next.config.js 的 trailingSlash 走，否则探的是 301 而不是页面本身
  const trailingSlash = /trailingSlash:\s*true/.test(
    readFileSync(join(ROOT, "next.config.js"), "utf8")
  );
  const target = `${websiteUrl}/independent${trailingSlash ? "/" : ""}`;
  let ok = true;
  try {
    const res = await fetch(target, { redirect: "follow" });
    if (!res.ok) {
      ok = false;
      errors.push(`探活失败: ${target} -> HTTP ${res.status}`);
    }
    const xfo = res.headers.get("x-frame-options");
    const csp = res.headers.get("content-security-policy") ?? "";
    if (xfo) {
      ok = false;
      errors.push(`带 X-Frame-Options: ${xfo}，X 页面无法内嵌这个 iframe`);
    }
    if (csp.includes("frame-ancestors")) {
      ok = false;
      errors.push(`带 frame-ancestors 限制，X 页面无法内嵌这个 iframe`);
    }
    if (ok) console.log(`探活通过: ${target} 可访问且允许内嵌`);
  } catch (e) {
    errors.push(`探活失败: ${target} -> ${e.cause?.code ?? e.message}`);
  }
}

if (errors.length) {
  for (const e of errors) console.log("FAIL " + e);
  console.log(`\n结果: 红（${errors.length} 项）`);
  process.exit(1);
}
console.log("结果: 绿 —— 所有引用都已引入，无残留硬编码域名");
