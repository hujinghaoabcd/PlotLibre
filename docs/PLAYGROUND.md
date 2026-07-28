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
- GitHub Pages project-site base path：`/PlotLibre/`；
- workspace demo baseline：`0.0.5`。

MapLibre GL JS 6 为 ESM-only，并要求 WebGL2。Playground 使用 Vite 和原生 ES modules，不提供旧式 UMD `<script>` 接入。

## 3. 当前功能

### 符号选择与标绘

工具栏包含符号选择器：

```text
arrow.straight → 直箭头
arrow.fine     → 细箭头
```

两种符号当前都使用两点语义：

```text
第一次点击 = tail center
第二次点击 = tip
```

交互能力：

- pointer move 动态预览；
- 第二次点击完成；
- Escape 取消；
- Enter 使用当前预览点完成；
- 点击对象选择；
- 拖动两个语义控制点编辑；
- 绘制期间锁定符号选择器，防止 session 中途变更类型。

`arrow.fine` 是独立 PlotDefinition 和独立几何，不是直箭头样式别名。

### 示例数据

生产页面自动加载三个南京示例：

- 两个 `arrow.straight`；
- 一个 `arrow.fine`。

示例用于人工检查：

- 不同符号的轮廓差异；
- committed Source 混合类型渲染；
- 选择和控制点编辑；
- 样式更新；
- PlotJSON 导出。

### 文档操作

- 撤销；
- 重做；
- 删除选中对象；
- 清空文档；
- 加载南京示例；
- 导出 PlotJSON；
- 导入 PlotJSON。

### 样式

- 填充颜色；
- 填充透明度；
- 边线颜色；
- 边线宽度。

每次样式修改都通过 `PlotLibre.replace()` 提交，不直接操作派生 GeoJSON。

## 4. 底图启动策略

Playground 必须先启动标绘能力，再加载在线底图。远程资源不得成为应用初始化的前置条件。

启动顺序：

```text
本地 background style
→ MapLibre load
→ 可选在线 raster source/layer
→ PlotLibre renderer
→ PlaygroundApp
```

生产页面使用 OpenStreetMap raster tiles 作为可选在线底图，并保留 attribution。若瓦片服务不可访问或加载较慢：

- 页面仍立即显示本地深色背景；
- 示例箭头、选择器、工具栏和属性面板立即可用；
- 状态栏显示在线底图不可用提示；
- PlotLibre 绘制和编辑不受影响。

完全禁用在线底图：

```text
?basemap=none
```

该模式用于生产式离线回归。

## 5. MapLibre Worker 模块

MapLibre GL JS 6 的主线程代码和 Worker 代码不是单一文件。Vite 配置在构建时从已安装的 `maplibre-gl` 包复制：

```text
maplibre-gl-worker.mjs
maplibre-gl-shared.mjs
```

部署位置：

```text
/PlotLibre/assets/
```

创建第一张地图前调用：

```ts
setWorkerUrl(`${import.meta.env.BASE_URL}assets/maplibre-gl-worker.mjs`);
```

详细说明见 [`MAPLIBRE_WORKER_PACKAGING.md`](MAPLIBRE_WORKER_PACKAGING.md)。

## 6. 本地运行

```bash
npm install
npm run playground:dev
```

默认地址：

```text
http://127.0.0.1:5173/PlotLibre/
```

Vite dev、Preview、Playwright 和 GitHub Pages 均使用 `/PlotLibre/` base。

## 7. 构建与类型检查

构建 GitHub Pages 版本：

```bash
npm run playground:build
```

类型检查：

```bash
npm run playground:typecheck
```

构建过程：

1. 编译所有 PlotLibre TypeScript packages；
2. 准备 MapLibre Worker 和 Shared 模块；
3. 使用 `/PlotLibre/` base；
4. 输出 `apps/playground/dist`。

## 8. 浏览器测试

安装 Chromium：

```bash
npx playwright install --with-deps chromium
```

运行：

```bash
npm run playground:e2e
```

测试覆盖：

- `/PlotLibre/` project-site 路径；
- Worker entry 和 shared module 返回 JavaScript，而不是 SPA HTML；
- WebGL2 MapLibre 初始化；
- 在线底图禁用时仍立即启动；
- 南京混合示例自动加载；
- Source 中存在 `arrow.fine`；
- fill 和 line 图层实际渲染；
- 符号选择器默认值；
- 绘制 `arrow.straight`；
- 绘制 `arrow.fine`；
- 细箭头 Store 类型与两个语义控制点；
- 细箭头实际 rendered feature；
- 自动选择；
- 撤销和重做；
- 样式修改；
- 删除；
- PlotJSON 下载和文件导入。

常规测试 URL：

```text
?e2e=1
```

该模式使用本地空白 Style，避免依赖远程瓦片网络。

## 9. CI

`.github/workflows/ci.yml` 包含：

### Validate

- Node.js 20.19；
- Node.js 22；
- package TypeScript 构建；
- 单元、几何和适配器测试；
- Playground TypeScript；
- GitHub Pages base 构建；
- handover 检查；
- 失败时上传完整 validation log。

### Browser

- 安装 Chromium；
- 运行 Playwright；
- 真实加载 MapLibre GL JS 6；
- 验证 Worker 模块图；
- 验证 Source 和实际 rendered feature；
- 失败时上传 HTML report、trace、截图和视频。

Milestone 005A 首轮权威运行：

```text
Run ID: 30387914395
Node tests: 33 passed
validate 20.19: success
validate 22: success
browser: success
```

## 10. GitHub Pages 部署

`.github/workflows/pages.yml` 在以下情况下运行：

- 相关文件合并并推送到 `main`；
- 从 Actions 页面手动触发。

工作流：

```text
actions/checkout@v6
actions/setup-node@v6
actions/configure-pages@v5
actions/upload-pages-artifact@v4
actions/deploy-pages@v4
```

权限：

```yaml
contents: read
pages: write
id-token: write
```

Pages Source：

```text
Settings → Pages → Build and deployment → GitHub Actions
```

## 11. 已解决的真实集成问题

1. Playwright 可选 `workers` 与 `exactOptionalPropertyTypes`；
2. MapLibre 6 attribution 类型；
3. MapLibre Point 与轻量测试对象边界；
4. MapLibre Feature `id` 可为 `undefined`；
5. Vite Preview `/PlotLibre/assets/*` 404；
6. dev、preview、E2E 和 Pages base 不一致；
7. 远程 style 阻塞应用初始化；
8. 本地 bootstrap style 与可选底图分离；
9. Worker URL 返回 SPA HTML；
10. Worker entry 缺少 `maplibre-gl-shared.mjs`；
11. 旧测试只检查 Store 数量，没有验证实际画布渲染；
12. 新符号必须同时进入 Source、rendered feature 和 E2E。

## 12. 设计约束

- Playground 只能使用公开 API；
- 不直接编辑 `plotlibre-committed` Source；
- 不把派生 Polygon 作为原始数据；
- 不在应用层复制箭头算法；
- 在线底图永远不能阻塞 PlotLibre 初始化；
- 测试模式和生产模式运行同一 PlotLibre 代码；
- GitHub Pages 路径必须通过 `/PlotLibre/` 构建验证；
- 每种新符号都必须增加选择器入口、示例或可视化用例；
- 浏览器测试必须验证实际 rendered feature，不只检查 Store。

## 13. 后续扩展

近期：

- `arrow.fine.tailed`；
- 参数控制柄；
- 更完整的 Symbol catalog；
- 视觉截图黄金基线。

中长期：

- 可切换底图目录；
- 自定义 raster/vector style URL；
- 底图加载状态与手动重试；
- 攻击箭头和双箭头；
- 图层树；
- PlotJSON 文本编辑器；
- URL 分享状态；
- PNG/SVG 导出；
- 触摸设备测试；
- Firefox/WebKit 矩阵；
- 性能基准页面。
