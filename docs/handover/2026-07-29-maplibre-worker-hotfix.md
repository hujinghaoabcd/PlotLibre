# PlotLibre Development Handover — MapLibre Worker Hotfix 002

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`fix/playground-render-visibility`  
PR：`#5 Diagnose and fix invisible PlotLibre rendering`

## Current state

用户确认 GitHub Pages 页面可以启动，工具栏和对象计数正常，但加载示例和新绘制的箭头都不可见。

诊断证明 PlotLibre Store、Registry、示例加载和图层创建均已执行。真正失败的是 MapLibre GL JS 6 的渲染 Worker：页面请求 `/PlotLibre/assets/maplibre-gl-worker.mjs` 时，早期部署返回 SPA 的 `index.html`；首次修复只发布 Worker 入口后，又发现该入口继续导入缺失的 `maplibre-gl-shared.mjs`。

最终修复已在 PR #5 完成。最新权威 CI 运行 `30382886536` 中 Node 20.19、Node 22 和 Chromium 均通过。

## Completed in this milestone

### Worker 资源打包

`apps/playground/vite.config.ts` 现在从已安装的 `maplibre-gl` 包复制：

```text
maplibre-gl-worker.mjs
maplibre-gl-shared.mjs
```

到：

```text
apps/playground/public/assets/
```

两个文件由构建过程生成，不提交到 Git。

### 显式 Worker URL

`apps/playground/src/main.ts` 在第一次创建 `Map` 前调用：

```ts
setWorkerUrl(`${import.meta.env.BASE_URL}assets/maplibre-gl-worker.mjs`);
```

GitHub Pages 中实际路径为：

```text
/PlotLibre/assets/maplibre-gl-worker.mjs
```

### 真实渲染回归测试

Playwright 新增和强化了以下验证：

- Worker 入口返回 JavaScript；
- Shared 模块返回 JavaScript；
- 两个 URL 不返回 `index.html`；
- Worker 入口确实导入 Shared 模块；
- `plotlibre-committed` Source 存在；
- Source 至少包含三个示例生成的 6 个 fill/outline Feature；
- `plotlibre-fill` 和 `plotlibre-line` 图层存在且可见；
- `queryRenderedFeatures()` 在画布上返回 fill 和 outline；
- 原有绘制、撤销重做、样式、删除与 PlotJSON 测试继续通过。

### 文档和生成文件管理

新增：

```text
docs/MAPLIBRE_WORKER_PACKAGING.md
docs/handover/2026-07-29-maplibre-worker-hotfix.md
```

更新：

```text
.gitignore
docs/handover/LATEST.md
```

## Validation

权威 GitHub Actions：

```text
Run ID: 30382886536
```

结果：

```text
Node 20.19 validation: passed
Node 22 validation: passed
TypeScript and workspace build: passed
Unit and adapter tests: passed
GitHub Pages build: passed
Handover contract: passed
Chromium E2E: passed
Worker entry module test: passed
Worker shared module test: passed
GeoJSON source feature test: passed
Rendered fill/line feature test: passed
```

诊断过程中确认的失败链路：

```text
UI and Store ready
→ committed Source created
→ MapLibre Worker URL missing or incomplete
→ GeoJSON Worker never starts
→ source query returns no processed features
→ fill/line layers render nothing
```

修复后的链路：

```text
Vite copies Worker + Shared modules
→ setWorkerUrl uses BASE_URL
→ Worker imports Shared successfully
→ GeoJSON source processes features
→ fill/line layers render examples and drawn arrows
```

## Next tasks

1. 将 PR #5 标记为 Ready 并合并到 `main`；
2. 等待 GitHub Pages workflow 重新部署；
3. 强制刷新公开页面；
4. 验证示例箭头和新绘制箭头均可见；
5. 后续 MapLibre 升级时检查 Worker 的全部相对依赖；
6. 将“Source 数据 + rendered features”作为所有后续符号的浏览器验收标准；
7. Pages 验证完成后继续 Milestone 004/005 主线开发。

## Risks and decisions

- 不能仅用 Store 数量、状态文字或图层存在判断渲染成功；
- MapLibre 6 Worker 是模块图，不能只发布入口文件；
- Vite SPA fallback 会让缺失的 `.mjs` URL 返回 HTTP 200 的 HTML，因此只检查状态码不足；
- Worker 文件必须来自当前安装的 MapLibre 版本，不手工复制进源码仓库；
- MapLibre 升级可能改变 Worker 文件名或增加相对依赖，升级必须运行模块和真实渲染 E2E；
- 在线底图与 Worker 是两个独立问题：底图可以降级，Worker 是 GeoJSON 渲染的必要运行组件。
