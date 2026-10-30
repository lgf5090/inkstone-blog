# Inkstone Blog

Inkstone 博客的独立公共前端。正式内容与阅读渲染来自 Inkstone 的博客 API 与阅读运行时；本仓库负责 Shirone 风格的主题、页面、导航与 SEO。

## 状态

- 已用 Cloudflare 官方 C3 初始化 Astro Workers 项目，并加入 Svelte 5、Tailwind CSS 4、类型检查与 CI。
- 当前：FE-00 完成；FE-01~FE-05 的基础链路已通（首页/文章/快照/静态大纲）；完整 Shirone 主题、runtime 与其余功能仍按 [前端移植计划](docs/plans/01-frontend-port-plan.md) 推进。
- 文章正文与大纲由 Inkstone `feat/blog` 的同一套 `Preview`/`Outline` runtime 提供，本仓库不另写 Markdown 解析器。

## 技术栈

- Astro 7.4.4 + `@astrojs/cloudflare` 14.4.3 + Wrangler 4.156.0（Cloudflare Workers SSR）
- Svelte 5 + Tailwind CSS 4
- TypeScript 6.0.3（Astro check 暂不支持 TypeScript 7.0）
- pnpm；Node >= 22.23.4

## 命令

```bash
pnpm dev          # 本地开发
pnpm check        # astro check
pnpm type-check   # svelte-check
pnpm build        # 生产构建
pnpm preview      # 构建并预览
pnpm deploy       # astro build && wrangler deploy
pnpm cf-typegen   # 更新 worker-configuration.d.ts
```

## 目录

- `src/pages/`：路由
- `src/layouts/`、`src/components/`：页面壳与组件
- `src/styles/global.css`：Tailwind 入口
- `docs/plans/`：共享契约与前端移植计划
- `AGENTS.md` / `AGENTS.astro.md`：工程规范 / Astro 平台指引

## 归属

主题部分移植自 [Shirone](https://github.com/LyraVoid/Shirone)（MIT），见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。本仓库不导入 Shirone/Inkstone 的 git 历史或示例内容。
