# PlotLibre Playground 与 GitHub Pages

## 1. 目标

`apps/playground` 是 PlotLibre 的真实浏览器示例、人工验收入口和 GitHub Pages 站点。它直接使用 workspace 内的公开包，不复制算法，也不绕过 Store、History 或 MapLibre adapter。

公开地址：

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

## 2. 技术基线

- MapLibre GL JS `6.0.0`；
- Vite `8.1.5`；
- Playwright Test `1.61.1`；
- Node.js `20.19+`；
- GitHub Pages base：`/PlotLibre/`；
- workspace demo baseline：`0.0.6`。

MapLibre GL JS 6 为 ESM-only，并要求 WebGL2。

## 3. 当前符号与交互

工具栏选择器：

```text
arrow.straight     → 直箭头
arrow.fine         → 细箭头
arrow.fine.tailed  → 燕尾细箭头
```

三种符号都使用相同的两点语义：

```text
第一次点击 = tail center
第二次点击 = tip
```

交互能力：

- pointer move 动态预览；
- 第二次点击或 Enter 完成；
- Escape 取消；
- 点击对象选择；
- 拖动两个语义控制点编辑；
- 撤销和重做；
- 绘制期间锁定选择器。

`arrow.fine.tailed` 不是复制的第二套细箭头算法。它与 `arrow.fine` 共享内部 `FineArrowFrame`，仅增加参数化中心燕尾缺口。

## 4. 南京示例

生产页面自动加载三个示例：

```text
1 × arrow.straight
1 × arrow.fine
1 × arrow.fine.tailed
```

示例用于人工检查：

- 三种轮廓差异；
- 混合类型 committed Source；
- 选择和 handles；
- 样式；
- PlotJSON；
- Worker 和实际 MapLibre 渲染。

## 5. 文档与样式操作

- 删除选中；
- 清空；
- 加载示例；
- 导入/导出 PlotJSON；
- 填充颜色和透明度；
- 边线颜色和宽度。

样式修改通过 `PlotLibre.replace()` 进入 History，不直接操作派生 GeoJSON。

## 6. 底图启动策略

远程资源不得成为标绘初始化的前置条件：

```text
本地 background style
→ MapLibre load
→ 可选 raster basemap
→ PlotLibre renderer
→ PlaygroundApp
```

在线瓦片失败时，页面继续显示本地深色背景，标绘、选择器和示例立即可用。

完全禁用底图：

```text
?basemap=none
```

## 7. MapLibre Worker 模块

构建时从已安装的 `maplibre-gl` 包复制：

```text
maplibre-gl-worker.mjs
maplibre-gl-shared.mjs
```

部署至：

```text
/PlotLibre/assets/
```

创建地图前：

```ts
setWorkerUrl(`${import.meta.env.BASE_URL}assets/maplibre-gl-worker.mjs`);
```

见 [`MAPLIBRE_WORKER_PACKAGING.md`](MAPLIBRE_WORKER_PACKAGING.md)。

## 8. 本地运行

```bash
npm install
npm run playground:dev
```

地址：

```text
http://127.0.0.1:5173/PlotLibre/
```

构建与类型检查：

```bash
npm run playground:typecheck
npm run playground:build
```

## 9. 浏览器测试

```bash
npx playwright install --with-deps chromium
npm run playground:e2e
```

Playwright 覆盖：

- `/PlotLibre/` project path；
- Worker entry/shared 返回 JavaScript；
- WebGL2 初始化；
- `?basemap=none` 立即启动；
- 三种南京示例；
- selector 三个 option；
- 绘制直箭头；
- 绘制细箭头；
- 绘制燕尾细箭头；
- Store 中正确 `plotType` 和两个控制点；
- 燕尾派生 ring 长度为 9；
- committed Source 包含三种类型；
- `queryRenderedFeatures()` 返回真实 fill/line；
- 撤销、重做、样式、删除和 PlotJSON。

常规测试 URL：

```text
?e2e=1
```

E2E 使用本地空白 Style，不依赖远程瓦片。

## 10. CI

Validate：

- Node 20.19；
- Node 22；
- packages TypeScript；
- Node tests；
- Playground typecheck/build；
- handover contract。

Browser：

- Chromium；
- Worker 模块图；
- committed Source；
- 实际 rendered features；
- 交互和 PlotJSON。

Milestone 005B 首轮：

```text
Run ID: 30389925716
validate 20.19: success
validate 22: success
browser: success
```

## 11. GitHub Pages

`.github/workflows/pages.yml` 从 `main` 构建并部署。Pages Source：

```text
Settings → Pages → Build and deployment → GitHub Actions
```

## 12. 强制设计约束

- Playground 只能使用公开 API；
- 不直接编辑 committed Source；
- 不把 Polygon 作为源数据；
- 不在应用层复制几何算法；
- 在线底图不能阻塞标绘；
- dev、preview、E2E、Pages 统一 `/PlotLibre/`；
- 每种新符号同阶段加入 selector、示例或可视化用例；
- 浏览器测试必须验证真实 rendered feature；
- MapLibre Worker 和 Shared 模块必须与安装版本一致。

## 13. 后续扩展

近期：

- `arrow.assault-direction`；
- 数据驱动 Symbol Catalog；
- 参数控制柄；
- 截图视觉黄金基线。

中长期：

- 多点曲线和攻击箭头；
- 可切换底图；
- 图层树；
- PlotJSON 文本编辑器；
- PNG/SVG；
- 触摸、Firefox/WebKit；
- 性能基准。
