/**
 * 功能开关。
 *
 * FREE_MODE = true 时，所有付费墙一次放行：
 * Linear 多推合集、导出倍率（1x-4x）、CONTROLS 五项显隐开关，
 * 且不会再弹 License 输入框，也不再请求 Gumroad 校验接口。
 *
 * 要恢复付费，把这里改成 false 即可 —— 其余代码不需要动。
 */
export const FREE_MODE = true;
