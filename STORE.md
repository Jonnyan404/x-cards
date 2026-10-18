# 上架 Chrome 商店

## 一、哪些做不到全自动

不是懒，是 API 和平台层面就没开口子。这 5 件事只能你来做，我做不了：

| 事项 | 为什么绕不过去 |
|---|---|
| 注册开发者账号（一次性 $5） | 要付款 + 同意开发者协议 |
| **首次上传 zip** | Chrome / Edge 的 API **不能新建商品**。只有手动传第一个 zip，才会生成 extension ID |
| OAuth 授权拿 refresh token | 需要你的 Google 账号在浏览器里点一次同意 |
| 商店文案、截图、权限说明 | **API 完全不接受 listing metadata**，只能在后台手填 |
| 审核（通常 1–3 个工作日） | Google 的人工/自动审核，无法跳过 |

**结论**：第一次上架 = 手动。从第二次起，100% 自动。

## 二、一次性手工步骤（约 30 分钟）

### 1. 注册开发者账号

https://chrome.google.com/webstore/devconsole — 付 $5。
记下控制台 URL 里那个 UUID，那是 **publisher ID**。

### 2. 手动上传第一个 zip，拿到 extension ID

```bash
cd dist/extension && zip -r ../tweet-cards.zip . && cd ..
```

在后台上传 `tweet-cards.zip`。上传完成后，商品页 URL 末尾那 32 位小写字母就是
**extension ID**。之后填下面「四」里的文案，提交审核。

### 3. 建 OAuth 客户端

Google Cloud Console → 启用 **Chrome Web Store API** → 凭据 → 创建 OAuth 客户端 ID，
应用类型选 **Desktop app**（不要选 Web application）。记下 client ID 和 client secret。

### 4. 拿 refresh token

浏览器打开（替换 `CLIENT_ID`）：

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=CLIENT_ID&redirect_uri=http://127.0.0.1:8080&response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&access_type=offline&prompt=consent
```

页面会显示「无法访问此网站」——**正常**，看地址栏，把 `code=` 后面那段复制出来，然后：

```bash
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "code=上面复制的 code" \
  -d "client_id=CLIENT_ID" \
  -d "client_secret=CLIENT_SECRET" \
  -d "redirect_uri=http://127.0.0.1:8080" \
  -d "grant_type=authorization_code"
```

返回里的 `refresh_token`（`1//` 开头）就是要的。

### 5. 两个必踩的坑

- **consent screen 停在 Testing → refresh token 7 天后失效。** 第一次提交能成功，
  然后一周后凭据悄悄死掉。去 Audience 页面点 **Publish app**（切到 In production）就不会过期。
- **不要用 OAuth Playground 生成 token。** Playground 要求 Web application 类型客户端，
  而这里必须是 Desktop app，两者混用会报 `redirect_uri_mismatch`。

### 6. 存成仓库 secret

Settings → Secrets and variables → Actions → 新建 `SUBMIT_KEYS`，内容：

```json
{
  "chrome": {
    "clientId": "xxx.apps.googleusercontent.com",
    "clientSecret": "GOCSPX-xxx",
    "refreshToken": "1//xxx",
    "extId": "32位 extension ID"
  }
}
```

### 7. `CRX_PUBLIC_KEY` 可以不配

它只影响**未打包安装**时的扩展 ID。商店分配的 ID 是稳定的，bpp 用 `extId` 更新就行，
所以这一项留空完全不影响上架 —— `finalize-extension.mjs` 会把空值和未替换的占位符一起
删掉，否则 Chrome 会因为 `key` 不是合法 base64 公钥而拒收整个包。

只有你想让本地 `Load unpacked` 出来的 ID 和商店版一致（两个版本不互相打架）时才需要配，
做法是用 `chrome://extensions` 的「打包扩展程序」生成 `.pem`，再从 `.pem` 导出公钥。

## 三、之后就是全自动

```bash
gh workflow run "Submit to Web Store" --repo Jonnyan404/x-cards
```

workflow 会：构建 → 清掉 manifest 占位符 → 打包 → 上传 → publish。
版本号必须先递增（manifest 里 version 相同会被商店拒）。

## 四、商店文案（可直接复制）

**名称**：Tweet Cards

**简短描述**（≤132 字符）：

> Turn tweets into clean, shareable cards. Pick your own render server, tune the look, export in one click.

**详细描述**：

> Tweet Cards turns any tweet into a clean, shareable image — right on x.com.
>
> • One click — a card button sits under every tweet; click it and the card is ready to copy or download.
> • Your server — ships with the official renderer and lets you add your own self-hosted deployment.
> • Looks right — font, width, padding, background and 1x–4x export are all adjustable.
> • Threads — merge several tweets into one long image.
> • No account, no tracking. Your server list stays in your browser.
>
> Cards are rendered in a page loaded from the server you pick, because x.com's content security
> policy blocks the fonts a card needs from loading inside the page itself.

**分类**：Social & Communication

**隐私政策 URL**：https://github.com/Jonnyan404/x-cards/blob/master/PRIVACY.md

**权限说明**（审核时逐项要填）：

- `storage` — 记住你的服务器列表和当前选择
- `tabs` — 按你的点击打开服务器站点和说明页
- 内容脚本只在 `https://x.com/*` 注入，其它站点一律不注入

**截图**：1280×800 或 640×400，至少 1 张。建议：卡片预览 Toast、导出后的成品图、
服务器管理面板。

## 五、一个可能被测到的点

扩展用 iframe 加载远端页面来渲染卡片。商店政策禁止的是「下载并执行远程代码」，
而这里加载的是一个普通网页（跑在它自己的 origin，拿不到任何扩展 API），
性质等同内嵌 YouTube。但审核员可能问一句，届时就这么答，并说明用户可换成自建地址。
