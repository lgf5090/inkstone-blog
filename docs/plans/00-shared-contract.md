# Blog 移植共享契约 v2（独立前端仓库 + 同源渲染产物）

> 状态：**待审核；未开始写代码**。
> 基线：Inkstone `bd0bfe9dd1349c1f6e25a1b6ba492194816b8007`（`test`，2026-10-30）；Shirone `dd1b7826af653a6db5429d5a9860ebfd9843bd46`（2026-10-27）。
> 本文件取代 `00-shared-contract-1.md` 的仓库形态假设。v1（同库 React 重写）保留为历史草案，不再作为实施依据。
> 两份执行台账：`01-frontend-port-plan-2.md`（独立博客前端）、`02-admin-port-plan-2.md`（Inkstone 后台 app）。

## 0. 已确认的用户决策

| ID | 决策 | 含义 |
| --- | --- | --- |
| U-01 | 前端独立仓库 + 共享渲染产物 | `/home/kubuntu/code/cloudflare/inkstone-blog` 是**新建独立 git 仓库**，直接以 Shirone 为起点保留 Astro 7 / Svelte 5 / Tailwind 4 / M3E 全套 UI；不重写成 React。 |
| U-02 | 单站点、仅站长可管 | 公共博客只有一个站点；`users.role='owner'` 的账号才能发布/进入后台。其他账号写 `isPublished` 不产生公共数据。 |
| U-03 | 正文与阅读模式完全一致 | 文章正文必须由笔记同一条 `renderMarkdown` + `Preview` 增强管线产生；大纲必须来自同一 `headings`；禁止第二套 Markdown 解析器。 |
| U-04 | 博客后台在 nav 之上 | 后台是 Inkstone app tab，插在 rail 的 `memos` 与 `nav` 之间，路径 `/blog-admin`。 |
| U-05 | 表名 / R2 / 依赖 | 表统一 `blog_*`；R2 统一 `blog/{txt,images,audio,video,covers,files,...}/...`；新仓库相关包升级到最新稳定版；Inkstone 只新增必要依赖，不整体升级。 |

## 1. 交付物与仓库拓扑

| 交付物 | 路径 | 分支 | 起点 | 责任 |
| --- | --- | --- | --- | --- |
| 博客前端（独立仓库） | `/home/kubuntu/code/cloudflare/inkstone-blog` | `feat/blog`（仓库内） | **从零初始化**（Cloudflare C3 官方脚手架）；Shirone `dd1b7826` 只读参考 | 全部公共页面、Shirone UI/组件/配置、Astro SSR、阅读产物消费、SEO/feeds/search UI、10 语言 |
| Inkstone 博客服务端 | `/home/kubuntu/code/cloudflare/inkstone-blog-server`（worktree） | `feat/blog` | Inkstone `bd0bfe9d` | `blog_*` schema、公共/后台 API、发布同步、快照生成协议、阅读 runtime 构建、R2 资产、feeds 数据、缓存/安全 |
| Inkstone 博客后台 | `/home/kubuntu/code/cloudflare/inkstone-blog-admin`（worktree） | `feat/blog-admin` | Inkstone `bd0bfe9d` | `/blog-admin` app tab、全部管理 UI、笔记右键/属性开关、媒体库、任务中心 |

> **仓库起点说明**：两条 Inkstone worktree 严格基于 `bd0bfe9d`。前端是**独立仓库，从零初始化提交**：不基于 `bd0bfe9d`，也不导入 Shirone/Inkstone 的 git 历史、示例内容或 71MB 资产。Shirone 只作只读参考；组件按任务引入/改写，保留 MIT 归属（若要求 clean-room 重写需另行评估）。

### 1.1 部署拓扑

```text
浏览器
  │  https://blog.example.com
  ▼
Blog Worker (Astro 7 SSR + @astrojs/cloudflare)
  ├─ /_blog/api/*      → 代理 Inkstone /api/blog/*（server-to-server，带 BLOG_PROXY_KEY）
  ├─ /_blog/media/*    → 代理 Inkstone /api/blog/assets/*（Range/immutable）
  ├─ /_blog/runtime/*  → 代理 Inkstone /blog-runtime/<ver>/*（版本化阅读 runtime）
  ├─ SSR 文章页        ← 快照 HTML + headings（Inkstone R2/D1）
  ├─ SSR 列表/集合页   ← /api/blog/* 数据
  └─ 客户端岛          ← Shirone Svelte 组件 + 阅读 runtime（React）
        │
        ▼
Inkstone Worker (Hono, 同账号)
  ├─ D1: blog_* / notes / users / notes_fts
  ├─ R2: blog/txt/renders/*, blog/images/*, ...
  └─ 既有 notes/auth/share/attachments 能力
```

- 博客与 Inkstone 是两个 Worker、两个域名；所有跨域调用都在 Blog Worker 服务端完成，浏览器只访问博客同源路径。
- 公共读取不携带用户 Cookie；后台管理只在 Inkstone 同源内进行。
- 博客 Worker 不绑定 D1/R2（避免双写与权限扩散），只通过受保护的 Inkstone API 取数；这样前端仓库可独立部署、独立回滚。

## 2. 架构决策

| ID | 决策 | 理由 / 约束 |
| --- | --- | --- |
| D-01 | 保留 Shirone 的 Astro/Svelte 代码与设计系统，不移植到 React | 唯一能同时满足「100% 功能」与「快速完成」；v1 的 React 重写会丢掉 153 个组件/28 个页面的行为细节 |
| D-02 | 博客前端 `output: 'server'`（Astro SSR，Cloudflare adapter） | 发布/撤回即时生效；SEO 由服务端 HTML 承担；Pagefind 改为 API 搜索 |
| D-03 | 文章正文使用「发布快照」而非博客端重解析 | 快照由笔记同款 `renderMarkdown`/`Preview` 在发布者浏览器生成；服务端只存储/校验/分发，保证逐块同源 |
| D-04 | 阅读 runtime 由 Inkstone 构建并按版本发布，博客只加载 | 不在独立仓库复制 `Preview`/`Outline`/增强代码；版本随快照 `rendererVersion` 固定，避免漂移 |
| D-05 | 笔记是文章唯一正文真源；`blog_posts` 是发布投影 | 后台/右键/属性开关只改笔记 frontmatter 或发布元数据，不引入第二套正文 |
| D-06 | `isPublished` 是唯一发布开关 | 缺失/`false` = 撤回；服务端同步状态；删除/回收站强制撤回 |
| D-07 | 快照缺失/过期时不得伪造正文 | `render_status` = `missing / ready / stale / failed`；公开页只展示最近一次成功快照；后台必须能看见并重建 |
| D-08 | 博客自有页面（About/系列总览）使用 Shirone 原生 Markdown 管线 | 保留 Shirone 的 23 种作者语法；文章/笔记页不使用该管线，避免与阅读模式分叉 |
| D-09 | 公共搜索使用 Inkstone `notes_fts` + `blog_posts` 联表过滤 | 不新建第二份全文索引；草稿/加密正文/未发布笔记不得命中；中文行为与笔记搜索一致 |
| D-10 | 站点配置运行时下发 | 后台保存到 `blog_settings`；博客 SSR 每次请求读取（短缓存），不要求重新部署；构建期默认值仍来自 Shirone config 文件 |
| D-11 | 资产发布时复制到 `blog/` 前缀 | 公共页不得直接引用笔记私有附件 URL；复制后改写快照；外部 URL 不抓取 |
| D-12 | 快照 HTML 服务端二次净化 | 客户端产物不可信；Inkstone Worker 用 `sanitize-html` allowlist 校验，保留渲染器所需 `data-*`/SVG/MathML，禁止脚本与任意 iframe |
| D-13 | 评论只保留外部 provider | Twikoo/Giscus/Waline 三选一，默认关闭、零请求；不做站内评论审核（如需要另立计划） |
| D-14 | 后台复用 Inkstone 组件与笔记编辑器 | 后台 UI 走 Inkstone tokens；文章编辑器复用 `DeferredCodeEditor`/`Preview`/`Outline`/`NoteProperties` |
| D-15 | 依赖策略 | 前端仓库全部升级到最新稳定版并提交 lockfile；Inkstone 仅新增 `sanitize-html` 等必要依赖，不整体升级（避免 21k+ 用例回归） |
| D-16 | 分支合并顺序 | `feat/blog`（服务端）先合 `test`；`feat/blog-admin` 再合入并解决共享注册文件冲突；前端仓库独立发布，不参与 Inkstone 合并 |
| D-17 | 发布版本化 | 快照记录 `rendererVersion`/`contentHash`；runtime URL 带版本；任一不匹配由后台标记 stale，不静默回退到“另一种渲染器” |
| D-18 | 公共 API 默认不对浏览器开放 | 仅接受带 `X-Blog-Proxy-Key` 的 Blog Worker；浏览器只走博客同源代理；后台 API 走 owner session |
| D-19 | 文章正文双视觉模式 | `articleTheme: 'blog'` 或 `'notes'`：DOM/行为一致；`notes` 用 Inkstone 阅读态 token 逐像素对照笔记，`blog`（默认）映射到 Shirone M3E；不改变快照 HTML |

## 3. 数据契约

### 3.1 表清单（全部 `blog_` 前缀；D1）

| 表 | 关键列 | 用途 / 约束 |
| --- | --- | --- |
| `blog_settings` | `user_id, key, value, updated_at` (PK user,key) | 站点/ profile / nav / sidebar / banner / theme / display / article / postList / comment / music / umami / llms / permalink / FAB / footer / license 等 JSON；只存 owner |
| `blog_posts` | `id,user_id,note_id,slug,title,excerpt,description,cover_asset_id,category_id,series_id,series_order,status,pinned,comments_enabled,language,license,encrypted,password_hash,password_hint,hide_home_content,alias,permalink,word_count,reading_minutes,view_count,content_hash,render_key,render_hash,renderer_version,render_status,render_generated_at,published_at,created_at,updated_at,deleted_at` | 发布投影；`UNIQUE(user_id,note_id)`、`UNIQUE(user_id,slug)`；不存正文 |
| `blog_categories` | `id,user_id,name,slug,description,position,created_at,updated_at` | 分类 |
| `blog_tags` | `id,user_id,name,slug,color,position,created_at` | 博客标签元数据；发布时从笔记 tags 同步 |
| `blog_post_tags` | `user_id,post_id,tag_id,position` (PK user,post,tag) | 文章-标签 |
| `blog_series` | `id,user_id,slug,title,description,overview,cover_asset_id,status,default_category_id,position,created_at,updated_at` | 系列；`overview` 是 Shirone 管线渲染的 Markdown |
| `blog_moments` | `id,user_id,content,pinned,location,mood,images JSON,tags JSON,published_at,draft,created_at,updated_at,deleted_at` | 瞬间 |
| `blog_albums` | `id,user_id,slug,title,description,cover_asset_id,date,location,tags JSON,layout,columns,password_hash,password_hint,position,published_at,created_at,updated_at` | 相册；密码哈希只在服务端 |
| `blog_photos` | `id,user_id,album_id,asset_id,caption,alt,taken_at,position` | 相册照片 |
| `blog_friends` | `id,user_id,name,url,avatar_asset_id,description,tags JSON,position,enabled` | 友链 |
| `blog_projects` | `id,user_id,key,title,summary,category,phase,technologies JSON,icon,cover_asset_id,featured,repository,year,position` | 项目 |
| `blog_skills` | `id,user_id,name,description,icon,category,level,position` | 技能 |
| `blog_devices` | `id,user_id,name,brand,category,status,specs JSON,description,icon,featured,year,link,position` | 设备 |
| `blog_games` | `id,user_id,name,developer,category,status,cover_asset_id,icon,rating,hours,platform,year,tags JSON,description,link,featured,position` | 游戏 |
| `blog_anime` | `id,user_id,title,cover_asset_id,cover_url,link,status,rating,watched,total,year,studio,genres JSON,period_start,period_end,identity,position` | 番剧；snapshot 同步 |
| `blog_compass_shelves` | `id,user_id,key,name,icon,blurb,position` | 罗盘分组 |
| `blog_compass_entries` | `id,user_id,shelf_id,label,href,note,icon,image,position` | 罗盘站点 |
| `blog_timeline` | `id,user_id,title,date,category,subtitle,description,highlights JSON,tags JSON,links JSON,icon,featured,position` | 时间线 |
| `blog_pages` | `id,user_id,slug,title,kind(about/custom),body,note_id,published_at,updated_at` | 博客自有页面；`body` 走 Shirone 管线，`note_id` 可选（绑定笔记时走快照） |
| `blog_assets` | `id,user_id,kind,object_key,variants JSON,filename,mime,size,width,height,hash,created_at` | R2 资源元数据；`UNIQUE(user_id,hash,kind)`；变体为 `[{width,height,key,mime}]` |
| `blog_post_assets` | `user_id,post_id,asset_id,source_ref,created_at` (PK user,post,asset) | 发布资产映射 |
| `blog_redirects` | `user_id,from_slug,to_slug,status,created_at` | 别名/改 slug 的 301 |
| `blog_preview_tokens` | `token_hash,user_id,post_id,expires_at` | 草稿预览 |
| `blog_tasks` | `id,user_id,type,status,payload,progress,error,created_at,started_at,finished_at` | 资产复制/索引重建/导入/番剧同步 |
| `blog_visit_daily` | `user_id,day,views,visitors` (PK user,day) | 统计；不含 IP |
| `blog_audit` | `id,user_id,action,entity,entity_id,detail JSON,created_at` | 发布/撤回/设置变更审计 |

规则：
- 每张表带 `user_id`；公开查询固定 `status='published' AND deleted_at IS NULL`，并校验 `user_id = blog_settings.owner_user_id`。
- 不复制 Markdown 正文；`notes.content` 是唯一正文。`blog_pages.body` 只用于博客自有页面。
- `blog_posts.note_id` 不级联删除；笔记回收站/清除由同步逻辑置 `draft` 并撤回。
- 新表/索引写入 `src/worker/db/schema.ts` 的 `SCHEMA_STATEMENTS` 与 `REQUIRED_*`；迁移号从 198 起，合并前按当时最大号重排。

### 3.2 R2 路径（只允许服务端生成）

```text
blog/txt/renders/<noteId>/<contentHash>.json   # 快照（html + headings + features + assets + wikiLinks）
blog/txt/exports/<userId>/<exportId>.json     # 导出
blog/images/<yyyy>/<assetId>.<ext>             # 正文图片
blog/images/<yyyy>/<assetId>-<width>.<ext>     # 可选响应式变体（480/960/1440）
blog/covers/<yyyy>/<assetId>.<ext>             # 文章/相册/系列封面
blog/avatars/<yyyy>/<assetId>.<ext>            # 友链/站点头像
blog/audio/<yyyy>/<assetId>.<ext>              # 音乐
blog/video/<yyyy>/<assetId>.<ext>              # 视频
blog/files/<yyyy>/<assetId>.<ext>              # PDF/附件等其他文件
```

- 键中只出现服务端生成的 `assetId`/哈希，不接受客户端路径段；禁止 `..`、绝对路径、`blog/parts`。
- 公开读取只经 `/api/blog/assets/:assetId`（Blog Worker 再代理），带 `immutable`、`nosniff`、内容类型白名单与 Range。
- 资产发布复制：扫描正文/封面引用的笔记附件 → 从 `attachments` 读取 R2 对象 → 复制到 `blog/...` → 写 `blog_assets`/`blog_post_assets` → 快照 URL 改写为公共资产 URL；外部 URL 不抓取。

### 3.3 Frontmatter 契约（笔记开头属性）

```yaml
---
isPublished: true               # 唯一发布开关；false/缺失 = 撤回
blogSlug: optional-slug        # 缺省由标题 slugify
blogExcerpt: 列表摘要
blogCover: /api/attachments/<id>
blogCategory: Guides
blogSeries: markdown-guide
blogSeriesOrder: 1
blogPinned: true
blogComments: true
blogLanguage: zh-CN
blogLicense: MIT
blogAlias: /old-path
blogPermalink: /custom/path
blogHideHomeContent: true
blogProtected: true            # 密码哈希只在 blog_posts，正文不写明文密码
blogPasswordHint: 提示
---
```

- 标题优先 frontmatter `title`，否则笔记标题；摘要优先 `blogExcerpt`，否则首段；标签取笔记 tags。
- `blogProtected` 只表示“已设密码”；哈希由后台 API 写入 `blog_posts.password_hash`。**禁止**把明文密码写进笔记正文、日志、导出或公开 API。
- 发布同步只信任 owner；member 的 `isPublished` 不产生公共数据（后台可提示）。

### 3.4 快照契约（R2 对象）

```json
{
  "version": 1,
  "rendererVersion": "<inkstone-build-sha>",
  "noteId": "...",
  "contentHash": "<sha256 of note content used>",
  "html": "<sanitized article HTML>",
  "headings": [{ "depth": 2, "slug": "...", "text": "...", "html": "..." }],
  "fences": { "<fenceKey>": { "language": "...", "body": "..." } },
  "features": ["mermaid", "chart", "kanban", "mindmap", "json", "excalidraw", "dataview"],
  "assets": [{ "attachmentId": "...", "blogAssetId": "...", "url": "/_blog/media/<id>" }],
  "wikiLinks": [{ "target": "...", "slug": "..." }],
  "settings": { "locale": "zh-CN", "emojiShortcodes": true },
  "generatedAt": 0,
  "warnings": []
}
```

- 生成端：Inkstone 客户端隐藏挂载同款 `Preview`（阅读模式设置），等待增强完成后抓取正文 host 的 `innerHTML`；`<canvas>` 转 PNG `<img>`，Excalidraw 无可用导出时保留占位并记 `warnings`。
- 服务端：校验 `contentHash` 与笔记 `content_hash` 一致（不一致 409），用 `sanitize-html` allowlist 净化，限制大小（HTML ≤ 4 MiB），写 R2 + `blog_posts.render_*`。
- 消费端：博客 SSR 直接注入快照 HTML；客户端按 `features` 懒加载 runtime，用同款 `Preview` 重渲染并替换，失败时保留静态快照。
- 过期：笔记内容变更后服务端置 `render_status='stale'`；笔记 app/后台的发布同步模块自动重建；MCP/API 无浏览器编辑时由后台“重建快照”处理，公开页继续展示最近成功快照。

### 3.5 发布同步触发点与状态机

触发点（服务端，全部 owner-only）：
- `POST /api/notes`（创建）、`PATCH /api/notes/:id`（正文/标题/标签/frontmatter 变化）。
- `POST /api/notes/:id/restore`、`DELETE /api/notes/:id`（回收站）、`DELETE /api/notes/:id/purge`（永久清除）。
- 后台文章保存仍走同一 `PATCH /api/notes/:id`，不另开写分支。

状态枚举：
- `blog_posts.status`：`draft`（未发布/显式草稿）、`pending_snapshot`（`isPublished=true` 但无有效快照）、`published`、`withdrawn`（撤回/回收站/清除）。
- `blog_posts.render_status`：`missing`、`ready`、`stale`、`failed`。

状态机：
```text
missing --create with isPublished=false--> draft --isPublished=true--> pending_snapshot
missing --create with isPublished=true--> pending_snapshot --publish(snapshot)--> published
published --note content/title change--> published(stale) --publish(snapshot)--> published
published --isPublished=false / trash / purge--> withdrawn --isPublished=true--> pending_snapshot
pending_snapshot --unpublish--> withdrawn
```

- `published` 且 `stale` 时公开页继续提供最近一次成功快照；后台必须显示 stale 并可重建。
- `pending_snapshot` 不进入公共 API/RSS/搜索/sitemap；后台显示“待生成快照”。
- 回收站/永久清除 → `withdrawn`；恢复后若 frontmatter 仍为 `isPublished: true`，重新同步为 `pending_snapshot`（或 `published` 若快照仍存在且 `contentHash` 一致）；若为 false，保持 `withdrawn`。
- 归档（`is_archived`）不等同撤稿：只要 `isPublished: true` 且未删除，仍保持 published。
- 非 owner 的 `isPublished` 不产生 `blog_posts`；后台可提示“仅站长可发布”。
- 同步失败写入 `blog_tasks`/`blog_audit` 并在后台可见；不得空 catch 或假装成功。

## 4. API 契约

### 4.1 公共读（Blog Worker 代理；浏览器不直连）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/blog/site` | 站点/导航/侧栏/功能开关/公共集成配置/分类与标签计数 |
| GET | `/api/blog/posts` | `cursor,page,tag,category,series,year,q,pinned,limit` → 摘要（不含正文/note_id） |
| GET | `/api/blog/posts/:slug` | 元数据 + 是否加密；未加密返回 `content` 供 runtime |
| GET | `/api/blog/posts/:slug/render` | 快照对象（html/headings/features/assets/wikiLinks）；`ETag=render_hash`；加密文章需 unlock，否则 401 |
| POST | `/api/blog/posts/:slug/unlock` | 密码校验；返回一次性 token，由 Blog Worker 换成本域 HttpOnly Cookie |
| GET | `/api/blog/posts/:slug/adjacent` | 上/下一篇、相关、随机 |
| GET | `/api/blog/archive` | 归档聚合 |
| GET | `/api/blog/categories` / `tags` / `series` / `series/:slug` | 分类/标签/系列 |
| GET | `/api/blog/moments` | 瞬间（draft 不返回） |
| GET | `/api/blog/albums` / `albums/:slug` | 相册；加密相册走 unlock |
| GET | `/api/blog/collections/:kind` | friends/projects/skills/devices/games/anime/compass/timeline |
| GET | `/api/blog/pages/:slug` | page 元数据 + `body` Markdown（博客端 Shirone 管线）或 note-backed 快照 |
| GET | `/api/blog/search?q=` | `notes_fts` 联表 published；排除加密正文 |
| GET | `/api/blog/assets/:assetId` | 公共二进制；Range + immutable |
| POST | `/api/blog/posts/:slug/views` | 去重日计数（IP 只存键控哈希，不落原值） |
| GET | `/api/blog/preview/:token` | 草稿预览：token 绑定 owner/post/expiry；返回 draft 元数据 + 快照；不进入搜索/sitemap |
| GET | `/api/blog/feeds/:kind` | rss/atom/sitemap 数据源（博客可自行生成最终 XML） |

公共响应禁止出现：`note_id`、`user_id`、`storage_key/object_key`、`password_hash`、未发布/加密正文、attachments 私有 URL。

### 4.2 管理写（Inkstone 同源，owner-only）

`/api/blog/admin/*`：
- `GET overview`：文章/草稿/发布/stale/浏览/任务/容量/provider 状态。
- `posts` CRUD、`posts/:id/publish|unpublish|preview|render`、`posts/:id/status`、`posts/:id/assets`。
- `categories|tags|series|moments|albums|photos|friends|projects|skills|devices|games|anime|compass|timeline|pages` CRUD。
- `settings` `GET/PATCH`；`navigation`/`sidebar`/`appearance` 可合并到 settings 域。
- `assets` `POST/DELETE/GET`；`assets/:id/public-url`；上传大小/类型/配额校验。
- `import`/`export`/`tasks`/`search/rebuild`/`anime/sync`/`reconcile`/`cache/purge`。
- 正文读写仍走 `/api/notes`；`blog_posts` 只存发布元数据；发布 API 必须校验快照 `contentHash`。

### 4.3 权限与会话

- 公共：匿名只读 published；加密文章/相册需 unlock；资源只读白名单。
- 后台：`requireOwner`；member 的 tab 隐藏且 API 403；demo 模式隐藏。
- 发布同步：notes 路由只对 owner 触发；member 的 `isPublished` 不产生公共数据。
- 上传：owner；服务端生成 R2 键；MIME 魔数/大小/配额校验；隔离上传与执行目录。
- Blog Worker：`BLOG_PROXY_KEY` 只作为 Worker secret；浏览器不可见。公共读 `/api/blog/*`（不含 `/api/blog/admin/*`）缺少该头直接 403；Blog Worker 代理的 POST 由服务端补 `X-Inkstone-Client: 1`。
- 密码文章：scrypt 哈希（复用 `src/worker/lib/password.ts`），`assertAttemptBudget`/`assertNotLocked` 限流；token 绑定 post+expiry，Cookie 仅博客域 HttpOnly/Secure/SameSite=Lax。

## 5. 缓存、失效与安全

- 博客 SSR：`Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300`；快照/资产带 hash 的可 `immutable`。
- 发布/撤回/设置变更：Inkstone 调 Blog Worker `POST /_blog/purge`（HMAC `BLOG_PURGE_SECRET`），按 path/tag 清缓存；失败由 TTL 兜底，不伪装成功。
- CSP（博客）：`script-src 'self' 'nonce-…'`、`style-src 'self' 'unsafe-inline'`（M3E 内联样式）、`img-src 'self' data: blob: https:`、`connect-src 'self'` + 评论/音乐/Umami provider 白名单；runtime/媒体只走 `/_blog/*` 同源。
- 快照净化：`sanitize-html` allowlist 覆盖渲染器输出；`iframe` 只允许 Bilibili/YouTube/AcFun/ArtPlayer 白名单 host；`script`/`on*`/`javascript:` 一律移除；SVG/MathML 用固定夹具验证不被误杀。
- 公共 API 限流：Blog Worker 每 IP/路径窗口；Inkstone 对匿名搜索/解锁再做一层；防 ReDoS（复用 query-match 限制）。
- 加密相册：照片 URL 只在下发解锁数据后出现；受保护响应 `Cache-Control: private, no-store`；如需严格资产级 ACL，由相册解锁 token 校验 assetId 归属（不能只靠 URL 不可猜）。
- 不记录正文、密码、token、IP 原文；日志脱敏。

## 6. Worktree、分支、合并

| 仓库 | worktree 路径 | 分支 | 起点 |
| --- | --- | --- | --- |
| Inkstone | `/home/kubuntu/code/cloudflare/inkstone-blog-server` | `feat/blog` | `bd0bfe9d` |
| Inkstone | `/home/kubuntu/code/cloudflare/inkstone-blog-admin` | `feat/blog-admin` | `bd0bfe9d` |
| 新前端仓库 | `/home/kubuntu/code/cloudflare/inkstone-blog` | `feat/blog` | **从零初始化**（Cloudflare C3 脚手架；不导入上游历史） |

审核通过后执行（当前**不执行**）：

```bash
cd /home/kubuntu/code/cloudflare/inkstone-5090
git worktree add -b feat/blog /home/kubuntu/code/cloudflare/inkstone-blog-server bd0bfe9d
git worktree add -b feat/blog-admin /home/kubuntu/code/cloudflare/inkstone-blog-admin bd0bfe9d
cp -al /home/kubuntu/code/cloudflare/inkstone-5090/node_modules /home/kubuntu/code/cloudflare/inkstone-blog-server/node_modules
cp -al /home/kubuntu/code/cloudflare/inkstone-5090/node_modules /home/kubuntu/code/cloudflare/inkstone-blog-admin/node_modules
rm -rf /home/kubuntu/code/cloudflare/inkstone-blog-server/node_modules/.tmp /home/kubuntu/code/cloudflare/inkstone-blog-admin/node_modules/.tmp

# 新前端仓库：Cloudflare 官方 C3 脚手架（从零；不导入上游历史/示例内容）
# 已验证：create-cloudflare@2.74.5 → Astro 7.4.4 + @astrojs/cloudflare 14.4.3 + wrangler 4.156.0
# 目录必须不存在或为空；若已存在先人工确认，不自动删除。
pnpm dlx create-cloudflare@latest /home/kubuntu/code/cloudflare/inkstone-blog \
  --framework=astro --platform=workers --lang=ts \
  --no-deploy --no-git --no-open --accept-defaults \
  -- --template minimal --typescript strict
cd /home/kubuntu/code/cloudflare/inkstone-blog
git init -b feat/blog
# C3 已生成 astro.config.mjs（cloudflare adapter）、wrangler.jsonc、package.json、pnpm-lock.yaml、
# worker-configuration.d.ts、AGENTS.md、.gitignore；再执行 pnpm astro add svelte / tailwind，
# 只做最小 SSR/博客配置，不手写 adapter/wrangler。
git add -A && git commit -m "chore: initialize blog frontend (Cloudflare C3)"
```

- 保留 C3 生成的 `wrangler.jsonc`/`astro.config.mjs` 结构；只加 `output: 'server'`（或按路由 `prerender = false`）与博客中间件，不把官方配置改写成手写版本。
- C3 的 `--no-git` 是有意的：由我们创建 `feat/blog` 分支；`--template minimal` 通过附加参数传给 create-astro，避免交互提示。

- 新增顶层路径：`/blog-admin`、`/blog-admin/*`、`/blog-runtime`、`/blog-runtime/*`。`/api/blog/*` 已在 `/api/*` 之下；`/blog-runtime/*` 必须加入两份 wrangler 的 `run_worker_first` 并由 Worker 提供版本化 JS/CSS，否则会被 SPA fallback 抢走。`tests/app-tab-routes.test.ts` 扩展断言 admin 顺序与 runtime 路径。

合并顺序：
1. `feat/blog` 完成服务端/契约/runtime，在 worktree 跑门禁 + 真机；`--no-ff` 合 `test`。
2. `feat/blog-admin` `git merge test`；共享注册文件（`app-tabs.ts`、`AppTabHost.tsx`、`AppRail.tsx`、`wrangler*.toml`、`src/worker/app.ts`、locales）取并集；后台只解决 UI/注册表冲突。
3. 前端仓库独立发布；不参与 Inkstone 合并，但需在 `test` 合入后跑跨仓库 E2E。
4. 清理 worktree/分支是独立指令，需用户确认。

并行规则：
- 最多 3 个子代理；每个 lane 只写自己的文件；契约变更先改本文件，再改两份计划。
- 共享注册文件由主代理统一接线，子代理不得改。
- Inkstone 的 schema/worker/runtime 只由 `feat/blog` 写；`feat/blog-admin` 只写后台 UI/API client/mock。
- 前端仓库与 Inkstone 的契约通过 `docs/improvement/blog/contracts/` 夹具与本文同步。

## 7. 门禁

Inkstone（每个批次）：

```bash
npm run typecheck:force
npm run i18n:check
npm run comments:check
npm run build
npx vitest run tests/app-tab-routes.test.ts tests/blog-*.test.ts
```

全量 `npx vitest run --config vitest.config.ts`（每批末/合并后；日志 + `$?`，禁止 grep fail 判绿）。

前端仓库：

```bash
pnpm check
pnpm type-check
pnpm check:manifest
pnpm build
pnpm test          # Playwright（含 SSR/no-JS、axe、visual parity）
```

真机：外部 Chromium 1600×1000 / 390×844；每个页面 golden path + 空态 + 错误态；截图存 `.scratch/blog/`（gitignore）。
跨仓库 E2E：笔记右键发布 → 博客 200；编辑 → 快照更新；撤回 → 404；后台设置 → 博客生效；密码文章；相册；搜索；RSS。

## 8. 审核清单

1. U-01/§1 的仓库拓扑（前端独立仓库用 Cloudflare C3 从零初始化、Inkstone 两个 worktree 从 `bd0bfe9d` 起）是否认可？
2. 是否接受「快照 + runtime」保证正文一致，而不是博客端重新解析？
3. 是否接受 Pagefind → API 搜索、Astro 构建期图片优化 → 上传期变体、字体子集化在动态内容上的限制？
4. 是否接受 MDX/JSX 不执行、Shirone 23 语法只用于博客自有页面，文章正文以 Inkstone 方言为准？
5. 是否接受密码哈希只存 `blog_posts`、frontmatter 不写明文？
6. 是否接受评论仅外部 provider、不做站内审核？
7. 是否接受 `articleTheme: blog|notes` 两种视觉模式（DOM/行为一致，默认 blog 视觉）？
8. 两个 Inkstone worktree 的合并顺序与文件所有权是否认可？
9. 表名/R2 路径/`/blog-admin` 位置是否符合预期？
10. 归档是否保持发布（本计划：是）？笔记恢复后是否按 `isPublished` 重新同步（本计划：是）？
11. 是否允许按 MIT 引入/改写 Shirone 组件（保留 LICENSE/NOTICE 归属），还是要求 clean-room 重写？



