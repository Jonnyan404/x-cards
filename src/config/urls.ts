/**
 * 线上站点地址的唯一入口。
 *
 * x-cards.net 已于 2026-07-31 过期并进入 pendingDelete，所有写死域名的
 * 地方都改成引用这里的 WEBSITE_URL。自部署或换域名时，只改这一处即可。
 *
 * 现在托管在 GitHub Pages，所以这里是子路径形式，且必须带尾斜杠访问
 * （next.config.js 开了 trailingSlash，产物是 independent/index.html）。
 *
 * 换地址时要同步三处，否则扩展的 iframe 会 404：
 *   1. 这里的 WEBSITE_URL
 *   2. .github/workflows/pages.yml 里的 PAGES_SITE_URL 与 BASE_PATH
 *   3. next.config.js 的 basePath（走 BASE_PATH 环境变量，通常不用手改）
 */
export const WEBSITE_URL = "https://jonnyan404.github.io/x-cards";

/** 去掉协议头和路径的纯域名，用于卡片水印这类展示场景。 */
export const WEBSITE_HOST = new URL(WEBSITE_URL).host;

/**
 * 静态资源（favicon、OG 图）原本托管在 static.usesless.com，该域名同样
 * 已经连不上了。自部署后把图片放进 public/，然后把这里改成 WEBSITE_URL。
 */
export const LEGACY_STATIC_HOST = "https://static.usesless.com";

export const welcomeUrl = () => `${WEBSITE_URL}/welcome/`;

export const independentUrl = () => `${WEBSITE_URL}/independent/`;

export const tweetApiUrl = (url: string) => `${WEBSITE_URL}/api/x?url=${url}`;
