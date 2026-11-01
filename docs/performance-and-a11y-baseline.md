# 性能与可访问性基线

测量日期：2026-11-01
被测部署：`https://inkstone-blog.454470.xyz`，前端提交 `d192587`（CSP/SRI/限流/按需 runtime 已上线）
测量环境：Qoder 内置 Chromium，651 × 555 CSS px，DPR 1.75；`ignoreCache` 导航；本机到 Cloudflare 的网络波动较大。

## 测量方法

- TTFB / FCP / DOMContentLoaded / load 来自 `PerformanceNavigationTiming` 与 `first-contentful-paint`。
- LCP 用 `PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })` 读取。
- CLS 汇总无近期输入的 `layout-shift` 条目。
- 资源数量与体积来自 `PerformanceResourceTiming`。重复导航后 CSS/JS/字体从磁盘缓存命中，`transferSize` 为 0；`decodedBodySize` 仍可用于观察解码后的体积。
- 对比度：用 canvas 将 `oklch/color-mix/rgba` 解析为 sRGB，逐层合成不透明背景，再按 WCAG 2.1 相对亮度公式计算；通过外观菜单真实切换 light/dark，而不是只改 class。

## 首页 `/`

| 指标 | 值 |
| --- | --- |
| TTFB | 1698 ms |
| FCP | 1820 ms |
| LCP | 1820 ms（H1 “Inkstone Blog”，18,338 px²） |
| CLS | 0 |
| DOMContentLoaded | 1770 ms |
| load | 1771 ms |
| 文档传输 | 17,554 B |
| 资源数 | 15 |
| 资源解码体积 | 420,976 B |
| 字体 | 7 个 woff2（解码约 420 KB） |
| 阅读 runtime 请求 | 0 |

## 文章页 `/posts/欢迎使用-inkstone`

| 指标 | 值 |
| --- | --- |
| TTFB | 2997 ms |
| FCP | 3132 ms |
| LCP | 3132 ms（品牌字样，1,820 px²） |
| CLS | 0 |
| DOMContentLoaded | 3107 ms |
| load | 3269 ms |
| 文档传输 | 35,257 B |
| 资源数 | 21 |
| 资源解码体积 | 544,787 B |
| 阅读 runtime 请求 | 0；`window.InkstoneReading` 未定义，快照仍在 |
| 交互后 | 派发 `pointerover` 后 runtime 才加载，快照被替换 |

> 该文章含代码块和 wiki 链接。此前会在 idle 时加载约 2 MiB 的阅读 runtime；现在首屏只保留服务端快照，鼠标进入、触摸按下或键盘聚焦正文后才加载。等待 8 秒后仍无 runtime 请求。

## 对比度

通过外观菜单实际切换主题后采样（默认站点配色）。无近期输入的 CLS 为 0。

| 文本 | Light | Dark | 结论 |
| --- | --- | --- | --- |
| 正文段落 | 17.64 | 14.36 | 通过 |
| 正文链接 | 5.46 | 5.88 | 通过（大字号，阈值 3） |
| 文章元信息 | 8.80 | 8.79 | 通过 |
| 外观面板标签（11.52px） | 8.86 | 8.77 | 通过 |
| 选中分段按钮 | 5.65 | 7.03 | 通过 |
| 评论提示 | 8.86 | 8.77 | 通过 |
| 评论提交按钮 | 5.65 | 7.03 | 通过 |
| 标签 chip | 8.02 | 9.22 | 通过 |
| 顶栏图标按钮 | 8.74 | 8.81 | 通过 |
| 文章导航标签 | 8.86 | 8.77 | 通过 |
| 文章导航标题 | 17.76 | 14.32 | 通过 |
| 页脚 muted | 8.13 | 9.00 | 通过 |

普通文字最低比值为 Light 5.65、Dark 7.03，均高于 WCAG AA 4.5。`.sidebar-card .muted` 与 `.profile-meta` 在当前文章页没有可见实例，未采样；侧栏其余文本使用同一组 `--on-surface-variant`/`--on-surface` 令牌，但完整覆盖仍应以这两类组件出现时的页面为准。

## 本轮相关的性能/安全动作

- CSP：按页面内联脚本生成 SHA-256 hash，强制 `Content-Security-Policy`；ClientRouter 导航已验证无违规。内联脚本统一收敛到 Layout，避免页面差异导致 hash 变化。
- 第三方评论：Twikoo 1.7.20、Waline 3.16.1（UMD + CSS）固定版本并使用 sha384 SRI；Waline 原先加载的是 ESM `waline.js`，不会产生 `window.Waline`，本轮一并修正。giscus 客户端只有一个无版本地址，且其 iframe 源取自 `document.currentScript.src`，自托管会指向本站而失效，因此保留官方源并受 CSP 主机白名单约束。
- 搜索限流：Cloudflare `SEARCH_RATE_LIMITER`（60 次/60 秒），覆盖 `/_blog/search` 与 `/search`；绑定异常时回退到进程内窗口。线上 120 次并发探测出现 35 个 429。
- 阅读 runtime：首屏不加载；交互后加载。音乐播放器：点击左下角入口后才加载 runtime。
- 图片/封面：文章封面预留 16:9，CLS 实测 0。

## 边界与未测项

- 这不是 Lighthouse 分数，也不是真实用户 field 数据；受本机网络和 651 px 视口影响，TTFB 偏高。需要桌面/移动 field 数据时应另采 CrUX 或 Lighthouse CI。
- 资源传输量为 0 是缓存命中；冷缓存体积应以 `decodedBodySize` 与构建产物为准。
- 交互后的阅读 runtime 仍约 2 MiB，包含一个约 1.08 MB 的 en-US i18n chunk；进一步拆分需要 main 仓库对 runtime 的 i18n/功能分块，本轮未做。
- 音乐按需加载未在开启音乐的部署上做端到端播放验证；当前线上配置未启用音乐。
- 第三方评论提供方（giscus/twikoo/waline）未配置，未做真实发帖验证；SRI/CSP 加载路径已验证。
