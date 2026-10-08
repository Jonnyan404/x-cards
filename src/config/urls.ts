/**
 * 线上站点地址的唯一入口。
 *
 * x-cards.net 已于 2026-07-31 过期并进入 pendingDelete，所有写死域名的
 * 地方都改成引用这里的 WEBSITE_URL。自部署或换域名时，只改这一处即可。
 */
export const WEBSITE_URL = "https://x-cards.vercel.app";

/** 去掉协议头的域名，用于卡片水印这类展示场景。 */
export const WEBSITE_HOST = WEBSITE_URL.replace(/^https?:\/\//, "");

/**
 * 静态资源（favicon、OG 图）原本托管在 static.usesless.com，该域名同样
 * 已经连不上了。自部署后把图片放进 public/，然后把这里改成 WEBSITE_URL。
 */
export const LEGACY_STATIC_HOST = "https://static.usesless.com";

export const welcomeUrl = () => `${WEBSITE_URL}/welcome`;

export const independentUrl = () => `${WEBSITE_URL}/independent`;

export const tweetApiUrl = (url: string) => `${WEBSITE_URL}/api/x?url=${url}`;
