# 博客前端部署教程

本仓库是独立的 Astro 7 + Cloudflare Workers 博客前端。文章、评论、媒体与阅读 runtime 都在 Inkstone 后端，前端只做 SSR 与同源代理。

## 0. 前置条件

- Cloudflare 账号与 `wrangler` 登录权限。
- Inkstone 后端已经部署了 **博客模块**（`feat/blog` 分支合并后的版本），并且：
  - `GET /api/blog/site` 可用；
  - R2 媒体与 `/blog-runtime/...` 产物可用；
  - 配置了 `BLOG_PROXY_KEY` secret。
- Node.js >= 22.23.4，pnpm。
- 一个博客域名（例如 `blog.example.com`），DNS 在 Cloudflare。

> 当前默认后端 `https://inkstone.454470.xyz` 实测 `/api/blog/site` 返回 404，说明该部署尚未包含博客模块。先部署/切换带博客模块的 Inkstone 后端，再部署本前端。

## 1. 后端准备

在后端部署环境设置代理密钥（与前端相同）：

```bash
# Inkstone 后端仓库，构建后
npx wrangler secret put BLOG_PROXY_KEY --config dist/inkstone/wrangler.json
```

也可以直接在 Cloudflare Dashboard 的 Worker → Settings → Variables and Secrets 添加 `BLOG_PROXY_KEY`（类型选 Secret）。

后端必须能通过代理密钥访问：

```bash
export BLOG_PROXY_KEY='<同一个密钥>'
curl -s -H "x-blog-proxy-key: $BLOG_PROXY_KEY" \
  https://inkstone.454470.xyz/api/blog/site
```

返回站点 JSON 才算通过。`404 API endpoint not found` = 后端没有部署博客模块；`403` = 两边的密钥不一致；`503 server_misconfigured` = 后端没设置密钥。

## 2. 配置前端

```bash
cp .env.example .env.production
```

编辑 `.env.production`：

```dotenv
BLOG_SITE_URL=https://blog.example.com
BLOG_API_ORIGIN=https://inkstone.454470.xyz
BLOG_PROXY_KEY=<与后端相同的密钥>
BLOG_API_TIMEOUT_MS=8000
```

说明：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `BLOG_SITE_URL` | 建议 | canonical/OG/sitemap/feed 使用的公开博客地址，不带尾斜杠 |
| `BLOG_API_ORIGIN` | 否 | 后端 API；不填默认 `https://inkstone.454470.xyz` |
| `BLOG_PROXY_KEY` | 是（生产） | 与后端 `BLOG_PROXY_KEY` 一致；仅服务端使用，不会进入浏览器 |
| `BLOG_RUNTIME_ORIGIN` | 否 | runtime/media 源；默认跟随 `BLOG_API_ORIGIN` |
| `BLOG_API_TIMEOUT_MS` | 否 | SSR 请求超时，默认 8000 |

这些变量在服务端读取时**先取 Worker 的运行时变量/密钥**（`cloudflare:workers` 的 `env`），没有时才回退到构建时的 `import.meta.env`：

- 生产环境推荐在 Cloudflare Worker 的「运行时变量和密钥」里配置 `BLOG_API_ORIGIN`、`BLOG_PROXY_KEY`、`BLOG_RUNTIME_ORIGIN`、`BLOG_API_TIMEOUT_MS`，改完立即生效，不需要重新构建。
- 构建变量仍然可用（例如 CI 里没有运行时绑定时），但改了构建变量必须重新构建部署。
- `BLOG_SITE_URL` 只走构建时注入（canonical/OG/sitemap/feed），修改后需要重新构建。
- `BLOG_API_ORIGIN` 只填域名 origin（如 `https://inkstone.454470.xyz`）；代码会把误填的路径（`/api`、`/blog-admin`）和末尾斜杠规范化掉。

本地开发使用 `.env`（可指向 `http://localhost:7714` 和 `http://127.0.0.1:4321`），不要提交 `.env`。

## 3. 安装与门禁

```bash
pnpm install
pnpm check
pnpm type-check
pnpm build
```

构建必须成功后再部署；`dist/` 是 Worker 的静态资源目录。

## 4. 部署到 Cloudflare Workers

首次部署：

```bash
pnpm exec wrangler login
pnpm exec wrangler deploy
```

`pnpm deploy` 会重新执行 `astro build` 再 `wrangler deploy`，适合生产发布。

### 绑定自定义域名

在 `wrangler.jsonc` 增加（域名替换成自己的）：

```jsonc
"routes": [
  { "pattern": "blog.example.com", "custom_domain": true }
]
```

或使用 Cloudflare Dashboard → Workers & Pages → 该 Worker → Settings → Domains & Routes → Add custom domain。域名必须已由同一 Cloudflare 账号托管。

部署后在 DNS 确认 `blog.example.com` 指向该 Worker；如果使用 Workers 自定义域，Cloudflare 会自动创建 DNS 记录。

## 5. 部署后验收

```bash
# 首页 SSR
curl -I https://blog.example.com/

# 后端直连（带密钥；浏览器不应带）
curl -s -H "x-blog-proxy-key: $BLOG_PROXY_KEY" \
  https://inkstone.454470.xyz/api/blog/site | head -c 200

# 文章、sitemap、RSS
curl -s -o /dev/null -w '%{http_code}\n' https://blog.example.com/sitemap.xml
curl -s -o /dev/null -w '%{http_code}\n' https://blog.example.com/rss.xml
```

再打开浏览器检查：首页分页、文章正文由 runtime 水合、评论、友链申请、图片代理、明暗主题。

## 6. GitHub + Workers Builds 自动部署

和 Inkstone 一样，用 Cloudflare Workers Builds 连接 GitHub，推送到 `main` 自动构建部署。

1. 在 GitHub 创建仓库（建议 `lgf5090/inkstone-blog`，私有），并推送：
   ```bash
   git remote add origin git@github.com:lgf5090/inkstone-blog.git
   git push -u origin main
   ```
2. Cloudflare Dashboard → Workers & Pages → Create → **Import a Git repository**，选择该仓库。
3. 生产分支：`main`；根目录：`/`。
4. 构建配置：
   - 构建命令：`pnpm build`
   - 部署命令：`pnpm exec wrangler deploy`
   - 也可以把部署命令填 `pnpm deploy`（会重新构建一次）
5. 配置变量（二选一，推荐运行时）：
   - **运行时变量和密钥**（Worker → Settings → 运行时变量和密钥，改完立即生效）：
     - `BLOG_API_ORIGIN=https://inkstone.454470.xyz`（只填 origin）
     - `BLOG_PROXY_KEY=<与后端相同的 secret>`（类型选密钥）
     - 可选：`BLOG_RUNTIME_ORIGIN`、`BLOG_API_TIMEOUT_MS`
   - **构建变量**（Settings → 构建 → 构建变量和密钥，支持 CI 构建，改动后必须重新构建）：
     - `BLOG_SITE_URL=https://blog.example.com`
     - 其余变量可在此重复配置，作为运行时缺失时的回退。
   - `NODE_VERSION=22.23.4` 放构建变量。
6. 保存并首次部署；之后每次 push 到 `main` 自动重建部署。Dashboard 的 Deployments 可回滚。

如果仓库使用 npm 而不是 pnpm，构建/部署命令改为 `npm run build` / `npx wrangler deploy`；但本仓库只有 `pnpm-lock.yaml`，推荐保持 pnpm，且 `packageManager` 已固定。

## 6. 常见问题

- **`/api/blog/site` 404**：后端没部署博客模块，或请求被后端路由拦到 404；先修正后端，不是前端问题。
- **`API endpoint not found`**：`BLOG_API_ORIGIN` 带了路径（如 `/api`、`/api/blog`、`/blog-admin`）。只填 origin；代码会规范化，但仍建议改对。
- **403 / `The blog proxy key is invalid`**：前端与后端 secret 的 `BLOG_PROXY_KEY` 不一致。
- **503 `server_misconfigured`**：后端没有设置 `BLOG_PROXY_KEY`（生产环境不允许空密钥）。
- **502 `blog_api_unreachable`**：构建环境无法访问 `BLOG_API_ORIGIN`，或后端域名/DNS/TLS 异常；检查 `BLOG_API_TIMEOUT_MS`。
- **正文空白/图片 404**：确认后端 `/blog-runtime/<version>/...` 与 `/api/blog/assets/<id>` 可访问；runtime 版本必须与快照一致。
- **修改 API 地址不生效**：运行时变量立即生效；构建变量需要重新构建。两处都设置时运行时优先。
- **不要**把 `BLOG_PROXY_KEY` 放到 `PUBLIC_*` 变量或前端源码；浏览器只能访问博客同源代理。
