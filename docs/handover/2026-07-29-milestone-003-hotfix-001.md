# PlotLibre Development Handover — Milestone 003 Basemap Hotfix 001

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`fix/playground-basemap-fallback`  
基线提交：`a68cdd659861c6ee3d5523baca637958e8730def`

## Current state

GitHub Pages 页面可以加载 HTML 和 Playground 资源，但生产初始化曾将远程 MapLibre style URL 直接作为地图初始 style。用户反馈页面长期停留在“正在初始化地图/等待底图加载”。

根因是 PlotLibre 和 `PlaygroundApp` 的创建被绑定在 `map.once("load")` 中，而该 `load` 事件依赖远程 style 及其资源完成。网络较慢、服务不可访问或跨域资源失败时，整个标绘应用也无法启动。

本热修复将标绘应用与在线底图彻底解耦。

## Completed in this milestone

### 启动流程修复

`apps/playground/src/main.ts` 现在始终使用内联本地 background style 创建 MapLibre：

```text
local bootstrap style
→ MapLibre load
→ optional raster basemap
→ PlotLibre
→ PlaygroundApp
```

在线底图不再是初始化前置条件。

### 可选在线底图

生产页面在本地 style 加载后增加 OpenStreetMap raster source/layer：

- 在线瓦片在后台加载；
- PlotLibre layer 在其后创建，因此保持在底图上方；
- 保留 OpenStreetMap attribution；
- 网络失败时继续显示本地深色背景；
- 仅显示一次可理解的警告信息；
- 绘制、编辑、撤销、导入导出和示例数据不受影响。

### 禁用底图参数

新增：

```text
?basemap=none
```

该模式保留生产 Playground 行为和南京示例，但完全不请求在线瓦片。

### 回归测试

`apps/playground/e2e/playground.spec.ts` 新增测试：

- 访问 `/PlotLibre/?basemap=none`；
- MapLibre canvas 可见；
- 自动加载 3 个南京示例；
- 状态不再停留在“正在初始化”；
- `window.__plotlibrePlayground` 已建立。

### 文档

`docs/PLAYGROUND.md` 已更新：

- 记录本地 bootstrap style；
- 记录 optional raster basemap；
- 记录离线降级行为；
- 记录 `?basemap=none`；
- 将“在线底图不能阻塞 PlotLibre”列为强制设计约束。

## Validation

合并前必须通过：

```bash
npm run check
npm run handover:check
npm run playground:e2e
```

预期浏览器测试数量从 4 增加到 5。

本热修复完成后将创建 PR，并以 GitHub Actions Node 20.19、Node 22 和 Chromium 结果作为权威验证。

## Next tasks

1. 创建并验证热修复 PR；
2. CI 全绿后合并到 `main`；
3. 确认 GitHub Pages workflow 完成重新部署；
4. 用户刷新公开页面，确认标绘立即出现；
5. 后续增加底图切换器、加载状态和手动重试；
6. 将同一启动策略同步到后续 Milestone 004/005 分支，避免文档冲突。

## Risks and decisions

- OpenStreetMap raster tiles 是可选增强，不是 PlotLibre 运行依赖；
- 在线底图失败时页面缺少道路地理背景，但标绘功能完整可用；
- 底图 source 在 PlotLibre 前添加，以保证标绘图层位于其上方；
- 不再使用远程完整 style，因为 glyph、sprite、vector source 中任一资源都可能延迟初始化；
- `map.error` 可能由多种地图资源触发，当前统一按在线底图降级提示处理；
- 后续应将底图提供者抽象为可配置 catalog，并审查各提供者使用政策。
