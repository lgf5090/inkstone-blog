# 博客前端移植计划 v2（独立仓库 `inkstone-blog`）

> 状态：**待审核；未开始写代码**。本文件取代 `01-frontend-port-plan-1.md`（v1 假设同库 React 重写）。
> 目标仓库：`/home/kubuntu/code/cloudflare/inkstone-blog`（全新独立 git 仓库，**从零初始化提交**）；仓库内分支 `feat/blog`。
> 初始化：Cloudflare 官方 C3 脚手架（`create-cloudflare` 的 Astro Workers 模板），避免手写 adapter/wrangler 配置。
> 源码参考：Shirone `dd1b7826`（只读；Astro 7 + Svelte 5 + Tailwind 4 + M3E；MIT）；不导入其 git 历史/示例内容/大资产。
> 契约：`00-shared-contract-2.md`；后台：`02-admin-port-plan-2.md`。
> Inkstone 侧起点：`bd0bfe9d`（`feat/blog` 服务端 / `feat/blog-admin` 后台两个 worktree）。

## 1. 范围与「100%」定义

**包含**
- Shirone 的全部公共阅读面：首页分页/列表/网格/瀑布流、文章页、归档、分类、标签、系列、瞬间、相册、友链、项目、技能、设备、游戏、番剧、罗盘、时间线、About/自定义页、搜索、404。
- Shirone 的全部外壳与交互：顶部栏/移动抽屉/分类条、单双栏侧栏（profile/music/announcement/categories/series/tags/stats/calendar/toc）、Banner 轮播/打字机/水波、HCT 配色/明暗/显示设置、纹理、字体、FAB、右键增强、路由进度、Swup、瀑布流、灯箱/缩放、公告、页脚、版权、分享海报/二维码、相关/随机阅读、阅读进度、代码块交互。
- 10 种界面语言（en/es/id/ja/ko/th/tr/vi/zh-CN/zh-TW）。
- 评论 Twikoo/Giscus/Waline；音乐 local/custom/meting/mixed；番剧 local/Bangumi/Bilibili 快照；Umami。
- 文章正文与笔记阅读模式同源：同一 `renderMarkdown` + `Preview` 增强管线 + 同一 `headings`；大纲组件必须存在。
- SSR：文章/列表/集合页服务端输出；发布/撤回在缓存 TTL 内生效；无 JS 时文章正文仍可读（快照）。

**不包含**
- 后台管理 UI（`02-admin-port-plan-2.md`）；后台在 Inkstone app 内。
- 在博客端重新实现 Markdown 渲染器；博客端不解析笔记正文。
- MDX/JSX 执行；评论审核后台；多租户博客。
- Pagefind 静态索引、Astro 构建期 sitemap/RSS（改为动态端点）。

### 1.1 「100%」逐项口径

| 维度 | 保留 | 明确替代/偏差（需审核） |
| --- | --- | --- |
| 组件与页面 | 153 个组件文件、28 个页面文件的目标行为全部保留（按任务引入/改写，保留 MIT 归属） | 数据来源从 content collections 改为 API；`getStaticPaths` 改 SSR；不在基线中预置上游历史/示例内容 |
| 设计系统 | M3E tokens、HCT、纹理、Banner、字体、动效 | 无（博客仓库保留原设计，不改成 Inkstone tokens） |
| Markdown | Shirone 23 种作者语法用于 About/系列总览等博客自有页面 | 文章正文以 Inkstone 方言为准（笔记真源），Shirone 语法不作用于文章 |
| 文章正文 | DOM/行为与笔记阅读模式一致 | 属性面板不公开；`isPublished`/`blog*` 属性不出现在博客 |
| 搜索 | 同一搜索 UI/快捷键/结果分组 | Pagefind → Inkstone `notes_fts` API（中文/拼音行为以笔记为准） |
| 图片 | 响应式图片/lazy/lightbox/zoom | Astro 构建期优化 → 上传期变体 + 媒体代理；仓库内静态图仍走 Astro |
| 字体 | 字体角色/子集化脚本/预算 | 动态内容无法在构建期完整扫描；见 §12 风险 |
| 订阅/SEO | RSS/Atom/sitemap/robots/llms/JSON-LD/OG | 从 Astro 构建期改为 SSR 端点；内容与 published 过滤保持 |
| MDX | Markdown + 23 扩展保留 | JSX/MDX 组件不执行（安全降级），后台导入时列出 |
| 评论/音乐/番剧/统计 | 全部 provider 与开关保留 | 评论无站内审核；番剧快照由后台同步；Umami 外部 |
| 性能 | 零负担可选功能、懒加载、SSR 首屏 | 阅读 runtime 是新增的按需 JS；只在实际使用交互块时加载 |
| 作者工具/部署 | 不移植 Shirone 的 content CLI、双仓 sync、`shirones` npm 包模式、Vercel/Netlify 静态部署 | 由 Inkstone 后台 + API + Cloudflare SSR 取代；作者入口改为后台/笔记 app，不再走 `pnpm new-post` |

## 2. 架构

### 2.1 运行拓扑

```text
Browser ── https://blog.example.com ──► Blog Worker (Astro 7 SSR, @astrojs/cloudflare)
                                          ├─ SSR 页面（列表/文章/集合/搜索/feeds）
                                          ├─ /_blog/api/*     → Inkstone /api/blog/*   （BLOG_PROXY_KEY）
                                          ├─ /_blog/media/*   → Inkstone /api/blog/assets/*
                                          ├─ /_blog/runtime/* → Inkstone /blog-runtime/<ver>/*
                                          └─ /_blog/purge     ← Inkstone publish/unpublish 回调（HMAC）
                                                   │
                                                   ▼
                                          Inkstone Worker (D1/R2, owner session)
```

- 浏览器只访问博客同源；Inkstone 不做浏览器 CORS。
- 博客 Worker 不绑定 D1/R2；数据与资产都经 Inkstone API，便于独立部署/回滚。
- 后台管理只在 Inkstone 同源；与博客前端无共享运行时，只共享契约与快照产物。

### 2.2 渲染一致性（核心）

| 层 | 机制 | 验收 |
| --- | --- | --- |
| L-A 正文 DOM | 发布时由 Inkstone 同款 `Preview` 生成快照 HTML；博客 SSR 原样注入 | 归一化 DOM deep-equal；标题/代码/表格/公式/容器/图片/脚注逐块对照 |
| L-A 大纲 | 快照带 `headings`（来自 `renderMarkdown`）；博客 SSR 输出静态目录，runtime 挂同款 Outline 逻辑 | headings 数组相等；树结构/标签/滚动高亮/搜索一致 |
| L-B 静态富块 | mermaid → SVG；chart → PNG；kanban → 静态 DOM；mindmap → DOM；JSON → 树；dataview → 表格；excalidraw → PNG/占位 | 截图对照 1600/390、明暗；warnings 列明降级 |
| L-C 交互富块 | runtime 按 `features` 懒加载同款组件，替换静态快照 | Playwright 驱动：mermaid 缩放、chart 悬浮、kanban 拖拽、mindmap 展开、JSON 折叠、excalidraw 全屏 |
| 无 JS | 快照 + 服务端静态目录 + 图片 | 关闭 JS 仍可读正文/目录/图片 |

- **禁止**博客端另写 markdown-it/unified 配置渲染笔记正文。博客自有页面（About/系列总览）才走 Shirone 的 `markdown-processor.mjs`。
- runtime 由 Inkstone 构建、版本化、按需加载；快照 `rendererVersion` 与 runtime 版本不一致时后台标 stale，不自动换渲染器。
- 正文 CSS 与 runtime 一起发布；博客 SSR 在文章页预加载 `reading.css`，保证快照首屏样式完整。
- **视觉模式**：`articleTheme: 'blog' | 'notes'`。`notes` 使用 Inkstone 阅读态 token/字体，逐像素对照笔记；`blog`（默认）把同一套阅读态 token 映射到 Shirone M3E 配色，DOM/行为不变。两种模式都必须在明暗/390/1600 下验；切换是站点设置，不改快照 HTML。
- **属性隐私**：快照捕获正文 host，不含 `NoteProperties`；`isPublished`/`blog*`/密码字段永不进入公共 HTML。博客元信息由 Shirone 的文章头展示。
- **注入边界**：博客端只对「服务端已净化」的快照使用 `set:html`；其他任何用户输入仍走 Astro 默认转义。前端不得把未净化 HTML 交给 `set:html`。

### 2.3 站点配置运行时化

Shirone 的 37 个 `src/config/*` 当前是构建期常量。改为：

1. `src/config/*` 保留为默认值（文档与回退）。
2. `src/server/site-config.ts` 从 Inkstone 拉取（服务端直连 `BLOG_API_ORIGIN` + `BLOG_PROXY_KEY`；浏览器只走 `/_blog/api/*`），Zod 校验，按「对象深合并、数组整体替换」合并默认；结果放 `Astro.locals.blog`。
3. `.astro` 页面/组件通过 `Astro.locals.blog` 或显式 `config` prop 读取；Svelte 岛通过父级 prop 或 `window.__BLOG_CONFIG__`（只含公开显示默认值）。
4. 页面开关/导航/侧栏在每次请求按配置裁剪；关闭的页面返回 404，导航/sitemap/侧栏入口同步消失。
5. 配置缓存 30–60s（Blog Worker 内存 + `caches.default`）；发布设置后由 purge 回调清理。
6. 客户端偏好（主题/hue/布局/纹理/减少动效）仍走 Shirone 的 localStorage 键，不写服务端。

### 2.4 路由与 SSR

- `astro.config.mjs`：在 C3 生成的文件上加 `output: 'server'`（或逐路由 `prerender = false`），保留 `adapter: cloudflare()`/`wrangler.jsonc` 官方结构；不引入 Pagefind/静态 sitemap 构建步骤。C3 不设置 `site`，需用 `BLOG_SITE_URL` 注入 `site`，RSS/sitemap/canonical 共用同一值。
- 动态路由（原 `getStaticPaths`）改 SSR：`/`、`/page/:page`、`/posts/[...slug]`、`/[...permalink]`、`/series/[slug]`、`/albums/[id]`；参数在页面内请求 API，404 用 Blog 404 页。
- `src/pages/_blog/[...path].ts`：`/api`/`media`/`runtime` 代理；校验路径前缀、方法、上游 host；不透传 Cookie；错误原样映射状态码。`/_blog/purge` 是本地 HMAC 端点，不走上游代理。代理白名单：只允许公共读/`unlock`/`views`/`preview`，显式拒绝 `/admin/*`；媒体只允许 `blog_assets` id；runtime 只允许版本化 JS/CSS。解锁 Cookie 由 Blog Worker 解出 Inkstone token 后转发，不把浏览器 Cookie 原样透传。
- `src/middleware.ts`：加载 site config、设置安全头/CSP、把 API 故障映射到可重试错误页；`/_blog/*` 跳过 SSR 壳。
- 旧地址兼容：`/posts/:slug` 之外保留 `/[...permalink]`；slug/alias 变更由 Inkstone 返回 301 目标，博客端 `Astro.redirect`。

## 3. 功能清单与文件映射

### 3.1 页面

| ID | Shirone 页面/文件 | 目标路由 | 数据 | 目标文件（博客仓库） | 任务 |
| --- | --- | --- | --- | --- | --- |
| FE-P01 | `src/pages/[...page].astro`、`PostPage.astro`、`PostCard.astro` | `/`、`/page/:page` | `/posts` | `src/pages/index.astro`、`src/pages/page/[page].astro`、`src/components/organisms/PostPage.astro` | FE-03 |
| FE-P02 | `src/pages/posts/[...slug].astro`、`[...permalink].astro` | `/posts/:slug`、`/:permalink` | `/posts/:slug` + `/render` | `src/pages/posts/[...slug].astro`、`src/pages/[...permalink].astro` | FE-04/05 |
| FE-P03 | `src/pages/archive.astro`、`ArchivePanel` | `/archive` | `/archive` | `src/pages/archive.astro` | FE-03 |
| FE-P04 | `src/pages/categories.astro`、`tags.astro` | `/categories`、`/tags` | `/categories`、`/tags` | 同名页面 | FE-03 |
| FE-P05 | `src/pages/series.astro`、`series/[slug]` | `/series`、`/series/:slug` | `/series` | 同名页面 | FE-07 |
| FE-P06 | `src/pages/moments.astro`、`MomentSection` | `/moments` | `/moments` | 同名页面 | FE-08 |
| FE-P07 | `src/pages/albums.astro`、`albums/[id]` | `/albums`、`/albums/:id` | `/albums` | 同名页面 | FE-09 |
| FE-P08 | `src/pages/friends.astro` | `/friends` | `/collections/friends` | 同名页面 | FE-10 |
| FE-P09 | `projects/skills/devices/games.astro` | 同名路由 | `/collections/:kind` | 同名页面 | FE-11 |
| FE-P10 | `timeline.astro`、`compass.astro` | 同名路由 | `/collections/:kind` | 同名页面 | FE-12 |
| FE-P11 | `about.astro`、`[...permalink]` 自定义页 | `/about`、`/pages/:slug` | `/pages/:slug` | 同名页面 | FE-13 |
| FE-P12 | `Search.svelte`、`SearchPanel` | 头部搜索/`/search` | `/search` | 改 `src/components/organisms/Search.svelte` | FE-14 |
| FE-P13 | `rss.astro`/`atom.astro` 订阅引导页、`rss.xml.ts`/`atom.xml.ts`、`sitemap`、`robots.txt.ts`、`llms*.ts` | 同名 | `/feeds/*` | 同名端点 + 引导页 | FE-15 |
| FE-P14 | `404.astro` | `/404` | — | 同名页面 + Blog 404 兜底 | FE-03 |
| FE-P15 | `devices.astro`、`games.astro` 等 | 同名 | `/collections/:kind` | 同名页面 | FE-11 |

> 「数据」列是 Inkstone 的逻辑路径（`/api/blog/*`）；博客端一律通过同源 `/_blog/api/*` 代理读取，不直连 Inkstone 域名。

### 3.2 外壳与交互

| ID | Shirone 能力 | 目标行为 | 任务 |
| --- | --- | --- | --- |
| FE-S01 | `Layout.astro`/`MainGridLayout.astro`/`TopAppBar`/`SideBar`/`SiteNavigationDrawer`/`Footer` | 运行时配置驱动；单/双栏；移动抽屉；页脚 | FE-02 |
| FE-S02 | `BannerStage`/`Carousel`/打字机/水波/纹理 | 保留；图片走媒体代理或仓库资产 | FE-02 |
| FE-S03 | `DisplaySettings`/`LightDarkSwitch`/HCT/Spec | 保留；默认值来自 API；localStorage 覆盖 | FE-02 |
| FE-S04 | `FloatingControls`/FAB/`RouteProgress`/`ContextMenu` | 保留；设备/页面过滤；关闭零 DOM | FE-19 |
| FE-S05 | `SidebarTOC`/`TocList`/`FloatingTOCPanel` | 服务端静态目录 + runtime Outline；同一 headings | FE-05 |
| FE-S06 | `MusicSidebarClient`/4 provider | 曲目/配置来自 API；关闭零请求 | FE-17 |
| FE-S07 | `CommentSection`/3 provider | 配置来自 API；懒加载；关闭零 DOM | FE-16 |
| FE-S08 | `Announcement`/`License`/`ArticleShare`/`ArticleDiscovery` | 保留；分享海报/二维码；相关/随机 | FE-04/19 |
| FE-S09 | `ImageWrapper`/`AlbumGallery`/`Lightbox`/Panzoom | 远程 srcset；灯箱/缩放；键盘 | FE-22 |
| FE-S10 | `PasswordGate`/`ProtectedPost`/`ProtectedAlbum` | 服务端解锁 + Cookie；不泄露正文/照片 URL | FE-06 |
| FE-S11 | Swup/`masonry.ts`/`PullToRefresh`/`OverlayScrollbars` | 保留；SSR 导航；瀑布流重排 | FE-23 |
| FE-S12 | `fontConfig`/子集化/`ImageBloom`/Expressive Code | 保留；动态内容限制见 §12 | FE-24 |
| FE-S13 | 10 语言 registry | 保留；新增文案不得硬编码 | FE-21 |

### 3.3 Shirone 23 种 Markdown 语法

| 处理方 | 语法 |
| --- | --- |
| 仅博客自有页面（Shirone 管线） | abbreviation、acfun、admonition、artplayer、audio-reader、bilibili、code-tree、collapse-panels、content-annotation、expressive-code meta、fields、file-tree、github-card、image-grid、image-presentation、include、marker、math、mermaid、option-groups、spoiler、steps、youtube |
| 文章正文（Inkstone 快照） | Inkstone 自有的 callout/容器、tabs、cols、align、media、timeline、chart、mindmap、kanban、json、excalidraw、dataview、数学、代码块等；两套方言不混用 |

> 选择理由：文章与笔记阅读模式一致优先；博客自有页面保留 Shirone 的完整作者语法。后台导入 Shirone 文章时，无法等价转换的语法列入报告，不静默丢弃。

### 3.4 配置 → 落点

| Shirone 配置 | 博客端落点 | 后台可编辑 | 任务 |
| --- | --- | --- | --- |
| `siteConfig`（site/base/title/subtitle/topAppBar/lang/timeZone/themeColor/banner/texture/display/toc/progress/favicon） | `/api/blog/site` → runtime config；主题/显示默认值 | 是 | FE-02/21 |
| `profileConfig` | 站点 profile | 是 | FE-02 |
| `navBarConfig`/`sidebarConfig` | 顶部导航/抽屉/侧栏 widget | 是 | FE-02 |
| `postListConfig`/`articleConfig` | 列表/文章元信息/相关/分享 | 是 | FE-03/04 |
| `commentConfig`/`musicConfig`/`umamiConfig`/`animeConfig` | 外部 provider 配置 | 是 | FE-16/17/18/20 |
| `contextMenuConfig`/`fabConfig`/`announcementConfig`/`footerConfig` | 交互与页脚 | 是 | FE-19 |
| `licenseConfig`/`permalinkConfig`/`llmsConfig` | 版权/永久链接/LLM 端点 | 是 | FE-15/04 |
| `fontConfig`/`imageBloomConfig`/`expressiveCodeConfig` | 字体/图片/代码块 | 部分（默认值）；字体文件/代码块主题是构建期设置，后台只能选已编译预设，变更后标记“需重新部署” | FE-22/24 |
| `i18nConfig` | 10 语言 registry | 否（代码） | FE-21 |
| `integrationsConfig`/`sitemapFilter` | 构建配置/页面开关 | 页面开关是 | FE-00/02/15 |

## 4. 前端仓库启动与依赖

### 4.1 启动步骤（审核后执行；使用 Cloudflare 官方 C3）

1. 用 **Cloudflare 官方 C3** 生成 Astro Workers 项目（已验证 create-cloudflare 2.74.5 → Astro 7.4.4 / @astrojs/cloudflare 14.4.3 / wrangler 4.156.0）：
   ```bash
   pnpm dlx create-cloudflare@latest /home/kubuntu/code/cloudflare/inkstone-blog \
     --framework=astro --platform=workers --lang=ts \
     --no-deploy --no-git --no-open --accept-defaults \
     -- --template minimal --typescript strict
   ```
   目录必须不存在或为空（存在时先人工确认，不自动删除）。C3 生成 `astro.config.mjs`（已含 cloudflare adapter）、`wrangler.jsonc`、`package.json`、`pnpm-lock.yaml`、`worker-configuration.d.ts`、`AGENTS.md`、`.gitignore`；**不导入** Shirone/Inkstone 的 git 历史、示例内容、个人图片或 71MB 资产。
   - 「从零初始化」指仓库/构建/提交历史从零，不等于 clean-room 重写：默认按 MIT 引入/改写 Shirone 组件并在 NOTICE 归属；若要求完全独立实现，需另行评估工期。
2. `cd inkstone-blog && git init -b feat/blog`；用 `pnpm astro add svelte -y` 加 Svelte，用 `pnpm astro add tailwind -y`（若与 Shirone 的 Tailwind 4 配置冲突，则按 `@tailwindcss/vite` 手动加并记录）加 Tailwind；补 `@astrojs/check`/`svelte-check` 与 `check`/`type-check` scripts（C3 只生成 dev/build/preview/deploy）；补 `LICENSE`/`NOTICE`（Shirone MIT 归属）与用户 `AGENTS.md` 规则；按需加 `output: 'server'` 或逐路由 `prerender = false`。保留 C3 的 `wrangler.jsonc`/adapter 结构，不手写替代配置。
3. 首个提交含 scaffold + lockfile：`git commit -m "chore: initialize blog frontend (Cloudflare C3)"`；随后 `pnpm check`/`type-check`/`build` 跑通空壳并记录。
4. 加 `src/middleware.ts`、`_blog` 代理、环境变量模板 `.env.example`（只放公开配置与服务端 secret 名称）；首批 Shirone 组件从 FE-02 开始按任务引入/改写（每批独立提交，NOTICE 归属）。
5. 不引入 Pagefind/静态 sitemap 构建链；FE-14/FE-15 直接按 API 搜索与动态端点实现（Shirone 的 `pagefind.yml` 只作参考）。
6. 建立 `tests/`（Playwright）与视觉基线截图；建立 `UPSTREAM.md` 记录只读参考 commit 与后续比对策略。

### 4.2 依赖选型（全部最新稳定版；执行时以 `pnpm add <pkg>@latest` / `pnpm up --latest` 结果为准）

| 包 | Shirone 当前 | 目标（2026-10-30 `npm view`） | 备注 |
| --- | --- | --- | --- |
| astro | 7.3.8 | 7.4.4 | 主框架；C3 生成 |
| svelte | ^5.57.2 | 5.57.3 | 保留 5 |
| @astrojs/svelte | 9.0.1 | 9.1.2 | `astro add svelte` |
| @astrojs/cloudflare | 未安装 | 14.4.3 | C3 自动安装；不手写 adapter |
| @astrojs/check | ^0.9.10 | 0.9.12 | `astro check` |
| svelte-check | 4.7.7 | 4.7.7 | Svelte 类型检查 |
| @astrojs/mdx | ^8.0.3 | 移除 | 不执行 MDX/JSX；Shirone `.mdx` 导入时降级为 Markdown |
| @astrojs/markdown-remark | ^7.3.3 | 7.3.5 | Shirone 自有页面管线 |
| @astrojs/rss | ^4.0.19 | 4.0.19 | 动态端点 |
| @astrojs/sitemap | ^3.7.4 | 移除 | 改动态 sitemap 端点 |
| zod | 未直接安装 | 4.6.7 | API/契约校验 |
| wrangler | 未安装 | 4.156.0 | C3 自动安装 / 部署 |
| @tailwindcss/vite / tailwindcss | 4 | 4.3.3 | `astro add tailwind` 或 Shirone 配置 |
| vite | ^8.3.4 | 8.3.5 | |
| typescript | ^6.0.3 | 6.0.3 | 已实测：astro check 拒绝 TS 7.0；固定 6.0.3（升级前先验证） |
| @biomejs/biome | 2.5.15 | 2.6.4 | |
| @playwright/test | ^1.63.0 | 1.64.1 | |
| sharp | ^0.35.5 | 0.35.5 | |
| katex | ^0.16.47 | 0.19.1 | 大版本；公式夹具回归 |
| mermaid | ^11.17.2 | 12.2.0 | 大版本；图表夹具回归 |
| pagefind | ^1.5.2 | 移除 | 改为 API 搜索 |
| pnpm（packageManager） | 11.28.2 | 12.16.1 | 本机已装；提交 lockfile |

> C3 生成的是当前官方版本（Astro 7.4.4 / adapter 14.4.3 / wrangler 4.156.0），不降级；其余依赖用 `pnpm astro add` 或 `pnpm add <pkg>@latest`，提交 lockfile。TS 7 已确认被 astro check 拒绝，固定 6.0.3；KaTeX 0.19/Mermaid 12 若破坏 check/build/Playwright，保留最新兼容版本并在 §12 记 `[!]`，不静默降级。

## 5. 数据消费与错误处理

- `src/lib/blog-api.ts`：`fetchJson<T>(path, schema, init)`，超时、`AbortSignal`、ETag、Zod 校验；错误映射 `{ status, code, message, retryAfter }`。
- SSR 取数直连 `BLOG_API_ORIGIN`（服务端带 `BLOG_PROXY_KEY`）；浏览器/runtime 取数走同源 `/_blog/api/*`。两处共用同一 Zod schema。
- `src/lib/blog-types.ts`：`BlogSite`、`BlogPostSummary`、`BlogPost`、`BlogRenderSnapshot`、`BlogCollection`、`Paginated<T>`、`BlogError`；与共享契约 §4 对齐。
- 列表页：loading/empty/error 三态；错误页提供重试；不得渲染空白页。
- 文章页：404 → Blog 404；401/403 → PasswordGate；429 → 友好限流提示；5xx → 可重试错误页（保留壳）。
- Mock：`tests/mock-api/` 用契约夹具启动本地 API（MSW 或 Astro 中间件），让 FE-02..FE-13 在 Inkstone 服务端未合并前可开发；mock 与真实 API 的 Zod schema 共用。
- 缓存：SSR fetch 使用 `caches.default` key（path + site + locale），30–60s；快照/资产单独 key。

## 6. 阅读 runtime 集成

- Inkstone 构建产物：`/_blog/runtime/<version>/runtime.js` + `runtime.css`；博客代理并缓存 immutable。
- 挂载协议（写在契约里）：
  ```js
  const unmount = await window.InkstoneReading.mount({
    container, outline, content, headings, fences, features, settings, wiki, assets, post
  })
  ```
- 博客只在实际存在 `features` 时加载 runtime；`requestIdleCallback`/`IntersectionObserver` 触发；失败保留快照，不显示空白。
- Swup `content:replace`/`page:leave` 前调用 `unmount()`，避免 React root/事件监听在旧容器上泄漏；版本脚本全局只初始化一次。
- `settings` 只含公开阅读设置（locale、emoji shortcodes、主题模式）；不传 session/user。
- 公共模式：隐藏 `NoteProperties`、块编辑手柄、拖拽、context menu 编辑动作；wiki 链接改为站内 `/posts/:slug`；`![[note]]` 只展开已发布笔记；附件 URL 用公共资产映射。
- 大纲：SSR 输出无 JS 静态目录；runtime 挂同款 Outline 逻辑（搜索/折叠/进度/活动项），样式映射到博客 tokens。
- 失败策略：runtime 404/版本不匹配/超时 → 保留快照 + 控制台警告 + 埋点（如启用）；后台可“重建快照”。
- 发布状态由 Inkstone 服务端在 notes 写入时同步（共享契约 §3.5）；博客只读 `status/render_status`，不自行推断 `isPublished`。
- 快照按发布者 locale 生成；读者切换语言时由 runtime 以读者 locale 重渲染正文标签。无 JS 时正文标签保持发布 locale（记录为已知偏差，不影响正文内容）。

## 7. 任务分解（BE + FE）

> 每个任务可单独验证；完成后立即回填 §9。子代理每次只领一个 lane；共享文件由主代理接线。

### 7.1 Inkstone `feat/blog` 服务端（BE）

> worktree `/home/kubuntu/code/cloudflare/inkstone-blog-server`，分支 `feat/blog`，起点 `bd0bfe9d`。
> 本 lane 独占：`src/worker/blog/**`、`src/worker/db/schema.ts`、`src/worker/app.ts`、`src/client/features/blog/**`（快照/runtime 公共部分）、`src/blog-runtime/**`、`wrangler*.toml`、`src/shared/blog/**`。
> 后台分支只读这些文件；缺口感由本 lane 补齐。

- **BE-00 基线/契约**：建 worktree、`cp -al node_modules`、删 `.tmp`；冻结 `src/shared/blog/{model,api,settings,frontmatter}.ts` 类型与 Zod；跑基线四门禁 + app-tab 测试并记录。
- **BE-01 Schema/迁移**：`src/worker/blog/schema.ts` 的 `BLOG_SCHEMA_STATEMENTS/REQUIRED_*`；接入 `db/schema.ts` 的 `SCHEMA_STATEMENTS` + `REQUIRED_*`；迁移从 198 起；收敛/重复 boot 测试。
- **BE-02 设置/公开投影**：`blog_settings` 读写、默认值/合并/校验、`/api/blog/site` 公开投影（不含凭据）；设置域 schema 单测。
- **BE-03 公共 API**：site/posts/archive/categories/tags/series/moments/albums/collections/pages/search/assets/views/feeds；public 过滤 owner+published；慢查询索引；错误码。
- **BE-04 发布同步**：notes 创建/PATCH/restore/trash/purge 触发；状态机（共享契约 §3.5）；分类/标签/系列 upsert；`content_hash`/stale/audit/tasks；owner-only；测试五入口。
- **BE-05 快照**：`POST /api/blog/admin/posts/:id/publish|render`；`contentHash` 校验；`sanitize-html` allowlist；4 MiB 上限；R2 `blog/txt/renders/...`；`render_*` 字段；失败可见。
- **BE-06 阅读 runtime**：抽 `ReadingSurface`/公共 `Preview` 能力（快照模式、隐藏属性、只读动作）；`src/blog-runtime/main.tsx` 构建；版本化 URL + CSS；公开 host 注入 settings/wiki/assets；`Outline` 只读；构建尺寸预算。
- **BE-07 资产**：发布扫描附件 → 复制 R2 `blog/...` → `blog_assets`/`blog_post_assets` → URL 改写；公共媒体代理（Range/内容类型/缓存）；清理未引用；测试路径穿越/416。
- **BE-08 搜索/订阅数据**：`notes_fts` 联表 published（排除加密正文）；feeds/sitemap/llms 数据源；搜索重建任务；草稿/撤回即时不可见。
- **BE-09 后台 API**：posts/taxonomy/moments/albums/photos/pages/collections/anime/media/settings/comments/music/umami/import/export/tasks/reconcile/cache；owner guard；输入校验；游标分页。
- **BE-10 密码/解锁**：文章/相册 scrypt 哈希、unlock token、Cookie 换发、限流/锁定；受保护响应 no-store；导出/日志不回显。
- **BE-11 缓存/安全**：`/_blog/purge` HMAC、CSP/headers、公共 API 限流、ReDoS 限制、日志脱敏；purge 失败可见。
- **BE-12 Runtime 路由/部署路径**：`/blog-runtime`、`/blog-runtime/*` 加入 `wrangler.toml`/`wrangler.kv.toml` 的 `run_worker_first`；`src/worker/app.ts` 注册资产/路由；`app-tab-routes` 邻接测试（避免 SPA fallback）。
- **BE-13 契约/测试/全量**：跨仓库 API 夹具、快照净化夹具（mermaid/KaTeX/SVG/MathML）、发布/撤回/恢复/删除集成测试、runtime/Preview parity、全量 vitest。
- **BE-14 合并**：`feat/blog` `--no-ff` 合 `test`；在 `test` 重跑门禁 + 真机；合并后通知后台分支替换 mock。

依赖：BE-01/02 → BE-03；BE-05/06/12 → FE-05；BE-09 → AD-04+；BE-10 → FE-06；BE-11 → FE-27；BE-13 → 合并；BE-14 → 跨仓库 E2E。

### 7.2 博客前端（FE）

#### FE 任务清单（按依赖分批，见 7.2.1/7.3）
- **FE-00 从零初始化（Cloudflare C3）**：用官方 `create-cloudflare` 生成 Astro Workers 项目（命令见 §4.1）、`astro add svelte`/`tailwind`、最小 SSR、CI、基线截图/Lighthouse；不手写 adapter/wrangler，不导入上游历史/示例内容；验收 `pnpm check/type-check/build` 绿。
- **FE-01 运行时配置 + API 层**：`src/server/site-config.ts`、`src/lib/blog-api.ts`、`blog-types.ts`、Zod、mock API、错误页；验收类型/单测/无硬编码。
- **FE-02 外壳/主题/显示设置**：Layout/MainGrid/TopAppBar/SideBar/Banner/DisplaySettings 改运行时配置；验收 1600/390、暗色、减少动效、axe。
- **FE-03 列表/归档/分类/标签**：首页分页、list/grid/瀑布流、pinned、空态、URL 可刷新；验收筛选/分页/真机。
- **FE-04 文章页壳**：元信息、封面、阅读时间、上下篇、相关/随机、分享/海报/二维码、许可、最后更新、SEO/JSON-LD/canonical/alias/permalink；验收快照注入前的静态壳。
- **FE-05 阅读 runtime + 大纲**：接入 mount 协议、SSR 静态目录、wiki/资产、features 懒加载；验收 L-A/L-B/L-C 对照。
- **FE-06 密码保护**：文章/相册 unlock、Cookie、hideHomeContent、错误/限流；草稿预览页 `/preview/:token`（无效/过期 404）；验收匿名 401/解锁 200/过期。
- **FE-07 系列**：索引/详情/文章内系列卡 top/bottom；验收顺序/计数/关闭 404。
- **FE-08 瞬间**：时间流、置顶、地点/心情/标签/多图、灯箱、分页；验收空态/草稿不可见。
- **FE-09 相册**：索引/详情、加密相册、照片网格、灯箱/键盘、布局列数；验收未授权不泄露照片 URL。
- **FE-10 友链**：分组/标签筛选/随机/外链安全；验收。
- **FE-11 项目/技能/设备/游戏**：四类集合页、筛选/排序/featured；验收每类真实数据。
- **FE-12 时间线/罗盘**：时间线分组/排序；罗盘分组/搜索；验收。
- **FE-13 About/自定义页**：Shirone 管线渲染 `blog_pages.body`；笔记绑定页走快照；验收 23 语法夹具。
- **FE-14 搜索**：替换 Pagefind 调用为 `/search`；快捷键/分组/空态/ReDoS 限制；验收中文/标题/正文/标签。
- **FE-15 feeds/SEO 端点**：RSS/Atom/sitemap/robots/llms；published/加密过滤；`llms-full` 由 Inkstone 聚合/批量取正文，避免 N+1 并设上限/排除标签；验收 XML 合法。
- **FE-16 评论**：三 provider、懒加载、主题跟随、关闭零请求；验收网络面板。
- **FE-17 音乐**：四 provider、曲目/音量/模式、Swup 持久；验收关闭零请求、失败降级。
- **FE-18 番剧**：本地/快照数据、布局切换、筛选；验收 provider 失败降级。
- **FE-19 FAB/右键/公告**：设备/页面过滤、返回顶部/目录/评论/首页、公告关闭记忆；验收键盘/移动端。
- **FE-20 Umami/统计**：可选脚本、文章浏览计数、站点统计条；验收不阻塞首屏。
- **FE-21 i18n**：10 locale 完整性、服务端/客户端切换、日期/时区、API 错误本地化；验收 `i18n` 检查。
- **FE-22 图片/媒体**：媒体代理、srcset/变体、lazy、灯箱/缩放、外部图 referrer；变体来自 API `variants`（无变体时原图 + width/height）；验收大图/缓存/416。
- **FE-23 Swup/进度/瀑布流/滚动**：SSR 导航、route progress、masonry、pull-to-refresh、overlayscrollbars；验收无刷新导航。
- **FE-24 字体/子集化/零负担**：字体配置、子集脚本、可选功能关闭零 DOM/请求；验收预算。
- **FE-25 性能/SEO/a11y**：Lighthouse 预算、axe 0 critical/serious、CLS/LCP、no-JS；验收报告。
- **FE-26 测试**：单元、Playwright、视觉基线、契约校验、10 locale 冒烟；验收 CI 全绿。
- **FE-27 部署/CI/安全头**：Cloudflare Worker 配置、CSP/headers、secret、purge、回滚；验收 staging。
- **FE-28 文档/来源**：MIT 归属、上游跟踪、运维/配置/迁移说明；验收。

#### 7.2.1 博客前端内部 lane（单仓库并行建议）

| 批 | lane A | lane B | lane C | 依赖 |
| --- | --- | --- | --- | --- |
| P0 | FE-00 | FE-01 | — | 无（FE-01 依赖 FE-00 的脚手架） |
| P1 | FE-02/03 | FE-04/05 | FE-13/21 | FE-01 |
| P2 | FE-07/08 | FE-09/10/11 | FE-12/14/15 | P1 |
| P3 | FE-06/16/17 | FE-18/19/20 | FE-22/23/24 | P2 + BE-10 |
| P4 | FE-25/26 | FE-27/28 | 修尾 | P3 |
| P5 | 跨仓库 E2E + 发布 | — | — | P4 + Inkstone `feat/blog` 合并 |

- 前端仓库与 Inkstone 的接口冻结在共享契约 §3–§4；lane B 的 FE-05 可用 mock runtime 先做挂载协议，真实 runtime 由 Inkstone `feat/blog` 提供。
- 共享文件（`src/server/site-config.ts`、`src/lib/blog-api.ts`、`src/layouts/*`、`astro.config.mjs`、`package.json`）由主代理或固定 lane 持有。

#### 7.3 跨仓库批次（总代理 ≤3）

> 下表是三个仓库同时推进时的批次；每格可含多个任务，但一个批次总共最多 3 个代理（通常每仓库 1 个）。上表 7.2.1 是单仓库内多 lane 的建议，跨仓库时其余 lane 顺延。

| 批 | Inkstone `feat/blog`（BE） | 博客前端（FE） | 后台（AD） | 出口 |
| --- | --- | --- | --- | --- |
| P0 | BE-00/01 | FE-00/01 | AD-00 | 契约/schema/基线绿 |
| P1 | BE-02/03 | FE-01/02/03 | AD-01/02/03 | 公共 API + 壳 |
| P2 | BE-04/05/06 | FE-04/05 | AD-04/05/06 | 发布快照 + 文章页 |
| P3 | BE-07/08/09/10 | FE-06..FE-15 | AD-07..AD-15 | 内容类型 + 资产/搜索/后台 CRUD |
| P4 | BE-11/12/13 | FE-16..FE-26 | AD-16..AD-22 | 集成/安全/测试 |
| P5 | BE-14 合并 | FE-27/28 部署 | AD-23 合并 | 跨仓库 E2E |

> 同一批内存在依赖时（如 FE-06 依赖 BE-10、AD-04 依赖 BE-09），FE/AD lane 先用 mock 完成 UI，BE 完成后替换真 API；不把 mock 当验收。

## 8. 验收与门禁

```bash
cd /home/kubuntu/code/cloudflare/inkstone-blog
pnpm check
pnpm type-check
pnpm check:manifest
pnpm build
pnpm test
# 博客仓库自有 i18n 检查：可见属性/文案键/10 locale 完整性（不复制 Inkstone check-i18n 的规则）
pnpm check:i18n
```

- Playwright：SSR/no-JS 正文、列表、文章、大纲、搜索、评论开关、音乐开关、密码、相册、RSS/sitemap、10 locale 冒烟、移动 390。
- 视觉：Shirone 基线截图 vs 移植后；文章正文与笔记阅读模式截图对照（L-A DOM + L-B 截图）。
- axe：首页/文章/搜索/相册/后台（后台在另一份计划）0 critical/serious。
- Lighthouse：目标不低于 Shirone 基线；报告数字必须本会话实测，不引用记忆。
- 跨仓库 E2E：笔记右键发布 → 博客 200 → 编辑 → 快照更新 → 撤回 404；后台设置 → 博客生效；密码文章；媒体；大纲。
- 公开页无 session：不请求 `/api/notes`，不出现登录/401；CSP 无 inline 违规。

## 9. Progress（完成即回填）

> 状态：`[ ]` 未开始 · `[~]` 进行中 · `[x]` 完成 · `[!]` 阻塞。必须填提交 SHA、验证命令 + RC、偏差。
> 基线：Inkstone `bd0bfe9d`；Shirone `dd1b7826` 只读参考；前端仓库从零初始化，两处此前无 Blog 提交。

### 9.1 Inkstone `feat/blog`（BE）

| ID | 任务 | 状态 | 提交 | 验证证据 | 偏差/后续 |
| --- | --- | --- | --- | --- | --- |
| BE-00 | worktree/契约/基线 | [ ] | | | |
| BE-01 | schema/迁移/收敛 | [ ] | | | |
| BE-02 | 设置/公开投影 | [ ] | | | |
| BE-03 | 公共 API | [ ] | | | |
| BE-04 | 发布同步/状态机 | [ ] | | | |
| BE-05 | 快照/净化/R2 | [ ] | | | |
| BE-06 | 阅读 runtime 构建 | [ ] | | | |
| BE-07 | 资产复制/媒体代理 | [ ] | | | |
| BE-08 | 搜索/feeds 数据 | [ ] | | | |
| BE-09 | 后台 API | [ ] | | | |
| BE-10 | 密码/解锁/限流 | [ ] | | | |
| BE-11 | 缓存/安全/purge | [ ] | | | |
| BE-12 | runtime 路由/首路由 | [ ] | | | |
| BE-13 | 契约/测试/全量 | [ ] | | | |
| BE-14 | 合并 `test` | [ ] | | | |

### 9.2 博客前端（FE）

| ID | 任务 | 状态 | 提交 | 验证证据 | 偏差/后续 |
| --- | --- | --- | --- | --- | --- |
| FE-00 | C3 初始化/脚手架/依赖/SSR | [ ] | | | |
| FE-01 | 运行时配置/API/Zod/mock | [ ] | | | |
| FE-02 | 外壳/主题/显示设置 | [ ] | | | |
| FE-03 | 列表/归档/分类/标签 | [ ] | | | |
| FE-04 | 文章页壳/SEO | [ ] | | | |
| FE-05 | runtime/大纲/wiki/资产 | [ ] | | | |
| FE-06 | 密码保护 | [ ] | | | |
| FE-07 | 系列 | [ ] | | | |
| FE-08 | 瞬间 | [ ] | | | |
| FE-09 | 相册 | [ ] | | | |
| FE-10 | 友链 | [ ] | | | |
| FE-11 | 项目/技能/设备/游戏 | [ ] | | | |
| FE-12 | 时间线/罗盘 | [ ] | | | |
| FE-13 | About/自定义页 | [ ] | | | |
| FE-14 | 搜索 | [ ] | | | |
| FE-15 | feeds/sitemap/llms | [ ] | | | |
| FE-16 | 评论 | [ ] | | | |
| FE-17 | 音乐 | [ ] | | | |
| FE-18 | 番剧 | [ ] | | | |
| FE-19 | FAB/右键/公告 | [ ] | | | |
| FE-20 | Umami/统计 | [ ] | | | |
| FE-21 | i18n 10 语言 | [ ] | | | |
| FE-22 | 图片/媒体 | [ ] | | | |
| FE-23 | Swup/瀑布流 | [ ] | | | |
| FE-24 | 字体/零负担 | [ ] | | | |
| FE-25 | 性能/SEO/a11y | [ ] | | | |
| FE-26 | 测试/视觉基线 | [ ] | | | |
| FE-27 | 部署/CI/安全头 | [ ] | | | |
| FE-28 | 文档/归属 | [ ] | | | |

## 10. 断点续跑协议

1. 先读共享契约 §2–§4 + 本文件 §2/§7/§9；不要重读 Shirone 全量源码。
2. 进入前端仓库 `git log --oneline -20`、`git status`；检查 §9 最后一个 `[x]` 的 SHA 与证据。
3. 按依赖取第一个 `[ ]`；先跑对应门禁确认基线；改动只限该 lane 文件。
4. 契约变更先改 `00-shared-contract-2.md`，再回填本文件依赖/验收，最后写代码。
5. 提交前 `git status`；提交信息按 AGENTS.md；不要把 `dist/`、截图、`.env` 提交。
6. 阻塞写 `[!]` + 原因 + 可执行下一步；不得用“环境问题”掩盖可注入开关。

### 10.1 文件地图（Shirone → 博客仓库）

| 关注点 | Shirone 源 | 目标 |
| --- | --- | --- |
| 站点配置 | `src/config/*Config.ts`、`src/utils/config-overlay.ts` | `src/config/*`（默认值）、`src/server/site-config.ts` |
| 布局/外壳 | `src/layouts/Layout.astro`、`MainGridLayout.astro`、`src/components/organisms/{TopAppBar,SideBar,Footer,BannerStage,...}` | 同名文件 + runtime config |
| 列表/文章 | `src/pages/[...page].astro`、`posts/[...slug].astro`、`[...permalink].astro`、`src/components/organisms/{PostPage,PostCard,ArticleDiscovery}` | 同名 + snapshot 注入 |
| Markdown | `src/utils/markdown-processor.mjs`、`src/components/content/Markdown.astro`、`src/plugins/markdown/*` | 仅博客自有页面保留 |
| 内容查询 | `src/utils/content-utils.ts`、`src/content.config.ts` | `src/server/content.ts`（API） |
| 搜索 | `src/components/organisms/Search.svelte`、`pagefind.yml` | API 搜索 + 删除 Pagefind |
| 主题/显示 | `src/components/organisms/DisplaySettings.svelte`、`src/utils/setting-utils.ts`、`src/styles/*` | 保留 + 运行时默认值 |
| 侧栏 | `src/config/sidebarConfig.ts`、`src/components/organisms/SideBar.astro`、widgets | 保留 + 运行时配置 |
| 集合页 | `src/pages/{moments,albums,friends,projects,skills,devices,games,timeline,compass}.astro` | 保留 + API |
| 订阅/SEO | `src/pages/{rss,atom}*.ts`、`robots.txt.ts`、`llms*.ts`、`astro.config.mjs` sitemap | 动态端点 |
| 阅读 runtime | Inkstone `src/client/features/preview/*`、`src/client/lib/markdown/*` | `/_blog/runtime` 构建产物（Inkstone 侧） |

## 11. 环境变量与部署

| 变量 | 位置 | 说明 |
| --- | --- | --- |
| `BLOG_API_ORIGIN` | Blog Worker secret/var | Inkstone Worker URL（只服务端） |
| `BLOG_PROXY_KEY` | Blog/Inkstone secret | 公共 API 代理鉴权；不得进前端 bundle |
| `BLOG_PURGE_SECRET` | 双方 secret | 发布/撤回 purge HMAC |
| `BLOG_COOKIE_SECRET` | Blog Worker secret | 解锁 Cookie 签名/加密 |
| `BLOG_SITE_URL` | Blog Worker var | canonical/sitemap/OG |
| `BLOG_MEDIA_ORIGIN` / `BLOG_RUNTIME_ORIGIN` | 可选 | 默认同 API origin |
| `BLOG_API_TIMEOUT_MS` | 可选 | SSR fetch 超时 |

开发与联调（端口以启动日志为准，不写死）：

```bash
cd /home/kubuntu/code/cloudflare/inkstone-blog
pnpm dev                 # Astro 开发服务器；打印实际端口
pnpm build && pnpm preview
# 本地 mock API（tests/mock-api）：MOCK_API_PORT=<port> pnpm mock
# Inkstone 服务端：在 inkstone-blog-server worktree 跑 npm run dev（打印实际端口）
# 跨仓库联调：博客 .env 的 BLOG_API_ORIGIN 指向 Inkstone 本地端口
```

- `.env.example` 只列名称与公开默认值；secret 只放 Cloudflare/Wrangler secret。
- 新增 env/binding 后跑 `pnpm cf-typegen`（C3 生成的 `wrangler types`）更新 `worker-configuration.d.ts`；不手改生成文件。
- 部署：`pnpm deploy`（C3 生成的 `astro build && wrangler deploy`）或等价的 `pnpm build` + `wrangler deploy`；自定义域名；staging 先验收。
- 回滚：前端仓库独立发布；Inkstone 契约向后兼容（新增字段可选），旧前端不因后端升级白屏。

## 12. 风险与已知偏差

| ID | 风险/偏差 | 处置 |
| --- | --- | --- |
| R-01 | Pagefind 被 API 搜索替代，排序/高亮/离线搜索不同 | 保留 UI/快捷键；契约测试；文档明示 |
| R-02 | Astro 构建期图片优化不适用于动态图片 | 上传期生成变体 + 媒体代理 srcset；仓库静态图仍走 Astro |
| R-03 | 字体子集化无法覆盖未来内容 | 构建期扫描 UI + 已知内容；新内容回退系统字体或下次部署；预算监控 |
| R-04 | 快照可能 stale（MCP/API 编辑） | `render_status` + 后台重建 + 自动同步；公开页只显示最近成功快照 |
| R-05 | 快照 HTML 体积/净化误杀 SVG/MathML | 4 MiB 上限；固定夹具（mermaid/KaTeX/表格/代码）验证 allowlist；失败降级为 runtime 渲染 |
| R-06 | runtime 与快照版本漂移 | 版本化 URL + `rendererVersion`；不匹配标 stale；不自动换渲染器 |
| R-07 | TS 7/KaTeX 0.19/Mermaid 12 大版本破坏 | TS 7 已确认被 astro check 拒绝，固定 6.0.3；KaTeX/Mermaid 大版本在对应任务先 spike，保留最新兼容版本并登记 |
| R-08 | Astro SSR 冷启动/Lighthouse 回退 | 缓存、流式输出、预算；报告实测 |
| R-09 | 动态内容下 Swup/字体/图片的内存与 LCP | 懒加载、预连接、图片尺寸；真机 390/1600 |
| R-10 | 独立仓库与上游 Shirone 分叉 | `UPSTREAM.md` 记录 commit；升级走单独分支/回归；不自动 merge |
| R-11 | MDX/JSX 不执行 | 后台导入报告列明；博客自有页面仅 Markdown + 23 扩展 |
| R-12 | 公共页可能泄露私有附件/未发布引用 | 发布资产复制 + URL 改写；wiki 链接只解析已发布；E2E 拦截 |
| R-13 | 密码文章 Cookie/限流跨域 | 博客同源 Cookie + Inkstone token；scrypt + 预算；不缓存受保护响应 |
| R-14 | 版权/许可 | 保留 MIT LICENSE/来源；不复制 Shirone 示例图片/字体到生产；目标仓库 AGPL 合规由用户确认 |
| R-15 | 博客搜索与笔记搜索的拼音/分词可能不完全一致 | 先验证 `notes_fts`/搜索 API 是否服务端支持拼音；不支持则记录为偏差（Shirone Pagefind 本身无拼音），不擅自新增第二索引 |
| R-16 | 抽 `ReadingSurface`/快照模式可能影响笔记阅读模式 | `feat/blog` 先补阅读回归/截图再改；后台先用 mock；全量 vitest + 真机对照通过后才替换真 API |
| R-17 | Shirone unified 管线在 Workers SSR 的可运行性 | FE-13 先 spike（24 语法夹具）；不可运行则博客自有页面改为发布时预渲染存储 HTML，文章仍走快照，不另写解析器 |
| R-18 | 快照 locale 与读者 locale 不一致 | runtime 以读者 locale 重渲染正文标签；无 JS 时保留发布 locale；不把语言标签写死进 HTML 断言 |

## 13. 附录

### 13.1 组件族清单（全部保留，改动只在数据/配置/渲染入口）

> 文件级清单以 `find src/components -type f`（153 个文件）为准；下表按层归类，避免逐文件漏项。

| 层 | 组件族 | 处理 |
| --- | --- | --- |
| atoms | action：Button/IconButton/FAB/FloatingToolbar/Toggle/Split/Chips | 保留；点击接运行时配置 |
| atoms | display：Card/Carousel/Avatar/Badge/DataTable/Skeleton/PanelStack | 保留；数据来自 API |
| atoms | input：SearchBar/SearchView/Select/DatePicker/DateRange/TextField/Autocomplete | 保留 |
| atoms | navigation：AppBar/Menu/Drawer/NavigationBar/NavigationRail/Tabs | 保留 |
| atoms | overlay：Dialog/AlertDialog/Sheet/BottomSheet/Tooltip/Snackbar/Banner | 保留；禁止原生弹窗 |
| atoms | selection：Checkbox/Radio/Segmented/Slider/Switch | 保留 |
| molecules | 卡片：Album/Anime/Compass/Device/Friend/Game/Moment/Project/Skill/Timeline | 保留；字段映射 API |
| molecules | PageHeader/SectionTitle/SearchBar/CalendarView/MermaidViewer/ImageWrapper | 保留 |
| organisms | sections：Album/Anime/Compass/Device/Friend/Games/Moment/Project/Skill/Timeline | 保留；筛选/空态 |
| organisms | 外壳：TopAppBar/SideBar/NavDrawer/Footer/Banner/FAB/RouteProgress/ContextMenu | 保留；运行时配置 |
| organisms | 文章：PostPage/PostCard/ArticleDiscovery/ArticleShare/CommentSection/PasswordGate | 保留；正文换快照 |
| organisms | 音乐：MusicSidebarClient + 4 provider | 保留 |
| layouts | Layout/MainGridLayout | 保留；配置运行时化 |
| content | Markdown.astro + 23 插件 | 仅博客自有页面 |
| pages | 28 个页面 | 逐页 API 化（见 §3.1） |

### 13.2 审核要点

1. 是否认可前端仓库为 Shirone 代码级延续（不重写 React），并以独立 SSR Worker 部署？
2. 是否认可文章正文「快照 + runtime」而不是博客端重新解析？是否接受 stale 窗口？
3. 是否接受 Pagefind/图片优化/字体子集化三项替代？
4. 是否接受 MDX 不执行、Shirone 语法只用于博客自有页面？
5. 是否接受 10 语言、评论三 provider、音乐四模式、番剧三数据源的完整保留？
6. 是否接受 `articleTheme` 双视觉模式（DOM/行为一致，默认博客视觉）？
7. 是否接受前端仓库从零初始化（不导入上游历史/示例内容；按 MIT 引入/改写 Shirone 组件并保留归属），Inkstone 两个 worktree 从 `bd0bfe9d` 起？
8. 是否认可任务分批（P0–P5）与 ≤3 子代理的并行方式？
