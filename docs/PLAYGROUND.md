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
- GitHub Pages project-site base path：`/PlotLibre/`。

MapLibre GL JS 6 为 ESM-only，并要求 WebGL2。Playground 因此使用 Vite 和原生 ES modules，不提供旧式 UMD `<script>` 接入。

## 3. 当前功能

### 标绘

- 绘制 `arrow.straight`；
- 第一次点击确定箭尾；
- pointer move 动态预览；
- 第二次点击完成；
- Escape 取消；
- Enter 使用当前预览点完成；
- 点击对象选择；
- 拖动两个语义控制点编辑。

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

生产页面使用 OpenStreetMap raster tiles 作为可选在线底图，并保留正确 attribution。若瓦片服务不可访问或加载较慢：

- 页面仍立即显示本地深色背景；
- 示例箭头、工具栏和属性面板立即可用；
- 状态栏显示在线底图不可用提示；
- PlotLibre 绘制和编辑不受影响。

可通过以下参数完全禁用在线底图：

```text
?basemap=none
```

该模式也用于验证应用不会等待外部地图资源。

## 5. 本地运行

在仓库根目录执行：

```bash
npm install
npm run playground:dev
```

默认地址：

```text
http://127.0.0.1:5173/PlotLibre/
```

Vite 开发、Preview、Playwright 和 GitHub Pages 均使用同一个 `/PlotLibre/` base，避免只在部署后才发现资源路径错误。

## 6. 构建 GitHub Pages 版本

```bash
npm run playground:build
```

该命令：

1. 编译所有 PlotLibre TypeScript packages；
2. 使用 `/PlotLibre/` 作为 Vite base；
3. 输出到 `apps/playground/dist`。

## 7. TypeScript 校验

```bash
npm run playground:typecheck
```

校验范围：

- `src/**/*.ts`；
- Vite 配置；
- Playwright 配置；
- E2E 测试。

## 8. 浏览器测试

首次运行前安装 Chromium：

```bash
npx playwright install --with-deps chromium
```

运行：

```bash
npm run playground:e2e
```

测试覆盖：

- `/PlotLibre/` project-site 路径；
- WebGL2 MapLibre 初始化；
- 在线底图禁用时仍立即启动；
- 南京示例自动加载；
- 绘制直箭头；
- 自动选择；
- 撤销和重做；
- 样式修改；
- 删除；
- PlotJSON 下载；
- PlotJSON 文件导入。

常规测试 URL：

```text
?e2e=1
```

该模式使用本地空白 Style，避免测试依赖远程瓦片网络。另有 `?basemap=none` 回归测试，模拟生产界面但完全禁用在线底图，确保页面不会停留在“正在初始化地图”。

## 9. CI

`.github/workflows/ci.yml` 包含：

### Validate

- Node.js 20.19；
- Node.js 22；
- package TypeScript 构建；
- 单元与适配器测试；
- Playground TypeScript；
- GitHub Pages base 构建；
- handover 检查；
- 两个 Node 版本独立运行；
- 失败时上传完整 validation log。

### Browser

- 安装 Chromium；
- 运行 Playwright；
- 真实加载 MapLibre GL JS 6；
- 失败时上传 HTML report、trace、截图和视频。

## 10. GitHub Pages 部署

`.github/workflows/pages.yml` 在以下情况下运行：

- 相关文件合并并推送到 `main`；
- 从 Actions 页面手动触发。

工作流使用：

```text
actions/checkout@v6
actions/setup-node@v6
actions/configure-pages@v5
actions/upload-pages-artifact@v4
actions/deploy-pages@v4
```

所需权限：

```yaml
contents: read
pages: write
id-token: write
```

仓库 Pages Source 应设置为：

```text
Settings → Pages → Build and deployment → GitHub Actions
```

## 11. 已解决的真实集成问题

真实 CI 和 Pages 使用反馈帮助发现并修复：

1. Playwright 在 `exactOptionalPropertyTypes` 下不能显式传递 `workers: undefined`；
2. MapLibre GL JS 6 的 `attributionControl` 类型不接受 `true`；
3. MapLibre Point 类与轻量测试点对象需要不透明 adapter 边界；
4. MapLibre Feature `id` 在类型上允许 `undefined`；
5. 仅在 build CLI 传入 `--base` 会导致 Vite Preview 的 `/PlotLibre/assets/*` 404；
6. `base` 必须固定在 `vite.config.ts`，使 dev、preview、E2E 和 Pages 保持一致；
7. 远程 style URL 不能作为 MapLibre 初始 style，否则网络异常会阻止 `load` 事件和整个 PlotLibre 应用启动；
8. 本地 bootstrap style 与可选在线 raster layer 必须分离。

## 12. 设计约束

- Playground 只能使用公开 API；
- 不直接编辑 `plotlibre-committed` Source；
- 不把派生 Polygon 作为原始数据；
- 不在应用层复制箭头算法；
- 在线底图永远不能阻塞 PlotLibre 初始化；
- 测试模式和生产模式必须运行同一 PlotLibre 代码；
- GitHub Pages 路径必须始终通过 `/PlotLibre/` 构建进行验证；
- 后续每种新符号都应在 Playground 中增加可视化入口。

## 13. 后续扩展

- 可切换的底图目录；
- 自定义 raster/vector style URL；
- 底图加载状态与重试按钮；
- Symbol catalog；
- 攻击箭头、燕尾箭头和双箭头示例；
- 参数控制柄；
- 图层树；
- PlotJSON 文本编辑器和格式化预览；
- URL 分享状态；
- PNG/SVG 导出；
- 触摸设备测试；
- Firefox/WebKit 浏览器矩阵；
- 性能基准页面。
