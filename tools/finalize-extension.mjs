/**
 * 打包扩展目录前的收尾处理。
 *
 * package.json 的 manifest 里写着 "key": "$CRX_PUBLIC_KEY"。Plasmo 只在环境变量
 * 存在时才替换它；没有注入就会原样落进 manifest.json，而 Chrome 认为 key 必须
 * 是一段 base64 公钥，读到占位符会直接拒绝加载整个扩展 —— 构建却是绿的。
 * 所以这里把没被替换掉的占位符清掉。
 *
 * 用法：node tools/finalize-extension.mjs [产物目录]
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "build/chrome-mv3-prod";
const manifestPath = join(dir, "manifest.json");

if (!existsSync(manifestPath)) {
  console.log(`FAIL 产物里没有 manifest.json -> ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

// 形如 $CRX_PUBLIC_KEY 的整串占位符
const PLACEHOLDER = /^\$[A-Z_][A-Z0-9_]*$/;
const leftovers = [];
for (const [k, v] of Object.entries(manifest)) {
  if (typeof v === "string" && PLACEHOLDER.test(v)) leftovers.push(k);
}

const keyValue = String(manifest.key ?? "").trim();
if (manifest.key !== undefined && (PLACEHOLDER.test(keyValue) || keyValue === "")) {
  delete manifest.key;
  console.log(
    "已移除 manifest 的 key 字段：CRX_PUBLIC_KEY 没有注入，留着占位符或空串" +
      "都会让 Chrome 拒绝加载。代价是扩展 ID 每次安装都会变。"
  );
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const otherLeftovers = leftovers.filter((k) => k !== "key");
if (otherLeftovers.length) {
  console.log(`WARN 这些字段仍是未替换的占位符：${otherLeftovers.join(", ")}`);
}

console.log(
  `manifest: ${manifest.name} v${manifest.version}，` +
    `manifest_version=${manifest.manifest_version}`
);
console.log(`产物就绪：${statSync(manifestPath).size} 字节 manifest -> ${dir}`);
