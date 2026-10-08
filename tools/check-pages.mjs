/**
 * 校验「扩展里写死的站点地址」与「GitHub Pages 实际地址」是否一致。
 *
 * 为什么需要它：扩展的 iframe 地址写死在 src/config/urls.ts，而 Pages 的
 * 真实地址由仓库名决定。两者一旦对不上，扩展会静默地加载一个 404 页面 ——
 * 构建是绿的、部署是绿的，只有用户在 x.com 上点了按钮才发现卡片出不来。
 * 这正是 x-cards.net 那次故障的形状，所以把它固化成 CI 判据。
 *
 * 用法：
 *   node tools/check-pages.mjs
 *        只做自洽性检查（尾斜杠、路径结构），本地随时可跑
 *   node tools/check-pages.mjs --site <url> --base-path <path>
 *        额外断言站点地址与部署目标一致，CI 用
 *   node tools/check-pages.mjs --out
 *        额外校验 out/ 里真的产出了对应的 index.html
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const has = (name) => process.argv.includes(`--${name}`);
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

/**
 * urls.ts 是 TypeScript，这里不引入编译期依赖，而是做最小降级后真正求值。
 * 这样校验的是会被打包进去的字符串本身，而不是靠正则从源码里猜。
 */
function evalUrls() {
  const src = readFileSync(join(ROOT, "src/config/urls.ts"), "utf8");
  const js = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/export\s+const/g, "const")
    .replace(/:\s*string\b/g, "");
  const names = [
    "WEBSITE_URL",
    "WEBSITE_HOST",
    "LEGACY_STATIC_HOST",
    "welcomeUrl",
    "independentUrl",
    "tweetApiUrl",
  ];
  try {
    return new Function(`${js}\nreturn {${names.join(",")}};`)();
  } catch (e) {
    throw new Error(`解析 src/config/urls.ts 失败：${e.message}`);
  }
}

// next.config.js 不能被 require（会去加载 @next/bundle-analyzer），只取这个开关
const nextConfig = readFileSync(join(ROOT, "next.config.js"), "utf8");
const trailingSlash = /trailingSlash:\s*true/.test(nextConfig);

const norm = (p) => (p === "/" ? "" : p.replace(/\/$/, ""));

const errors = [];
const urls = evalUrls();

let site;
try {
  site = new URL(urls.WEBSITE_URL);
} catch {
  errors.push(`WEBSITE_URL 不是合法地址 -> ${urls.WEBSITE_URL}`);
}

// 1. 站点地址必须和部署目标一致
const expectSite = arg("site");
if (expectSite && urls.WEBSITE_URL !== norm(expectSite)) {
  errors.push(
    `urls.ts 的 WEBSITE_URL 是 ${urls.WEBSITE_URL}，但 Pages 要部署到 ${expectSite}；` +
      `两者不一致时扩展的 iframe 会指向 404`
  );
}

// 2. WEBSITE_URL 的路径部分必须等于 basePath，否则资源路径整体错位。
//    只在显式给了 basePath 时才比 —— 本地开发 basePath 为空、urls.ts 指向
//    生产地址，这本来就是合理的，不该报错。
const expectBase = arg("base-path") ?? process.env.BASE_PATH;
if (expectBase !== undefined && site && norm(site.pathname) !== norm(expectBase)) {
  errors.push(
    `WEBSITE_URL 的路径是 "${site.pathname}"，但 basePath 是 "${
      norm(expectBase) || "/"
    }" —— Pages 是子路径部署，两者必须相同，否则资源路径整体错位`
  );
}

// 3. 各 Url() 的尾斜杠必须和 trailingSlash 一致
const routes = [
  ["welcomeUrl", urls.welcomeUrl],
  ["independentUrl", urls.independentUrl],
];
for (const [name, fn] of routes) {
  let pathname;
  try {
    pathname = new URL(fn()).pathname;
  } catch {
    errors.push(`${name}() 返回的不是合法地址 -> ${fn()}`);
    continue;
  }
  const endsSlash = pathname.endsWith("/");
  if (endsSlash !== trailingSlash) {
    errors.push(
      `${name}() 的路径 "${pathname}" ${endsSlash ? "带" : "不带"}尾斜杠，` +
        `与 next.config.js 的 trailingSlash=${trailingSlash} 相反 -> 会 404`
    );
  }
}

// 4. 可选：确认 out/ 里真的产出了对应的 HTML
if (has("out")) {
  const outDir = join(ROOT, "out");
  if (!existsSync(outDir)) {
    errors.push("out/ 不存在，先跑 pnpm build:next");
  } else {
    for (const [name, fn] of routes) {
      const full = new URL(fn()).pathname;
      const rel = norm(site?.pathname) && full.startsWith(norm(site.pathname))
        ? full.slice(norm(site.pathname).length)
        : full;
      const file = trailingSlash
        ? join(outDir, rel, "index.html")
        : join(outDir, `${rel}.html`);
      if (!existsSync(file)) {
        errors.push(`out/ 里缺少 ${name}() 对应的产物 -> ${file}`);
      }
    }
  }
}

if (errors.length) {
  for (const e of errors) console.log("FAIL " + e);
  console.log(`\n结果: 红（${errors.length} 项）`);
  process.exit(1);
}

console.log(
  `结果: 绿 —— WEBSITE_URL=${urls.WEBSITE_URL}，` +
    `independent=${urls.independentUrl()}，trailingSlash=${trailingSlash}`
);
