# PlotLibre Playground 与 GitHub Pages

## 1. 目标

`apps/playground` 是 PlotLibre 的真实浏览器示例、人工验收入口和 GitHub Pages 站点。它直接使用 workspace 内的公开包，不复制算法，也不绕过 Store、History 或 MapLibre adapter。

计划发布地址：

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

## 4. 本地运行

在仓库根目录执行：

```bash
npm install
npm run playground:dev
```

默认地址：

```text
http://127.0.0.1:5173/
```

## 5. 构建 GitHub Pages 版本

```bash
npm run playground:build
```

该命令：

1. 编译所有 PlotLibre TypeScript packages；
2. 使用 `/PlotLibre/` 作为 Vite base；
3. 输出到 `apps/playground/dist`。

## 6. TypeScript 校验

```bash
npm run playground:typecheck
```

校验范围：

- `src/**/*.ts`；
- Vite 配置；
- Playwright 配置；
- E2E 测试。

## 7. 浏览器测试

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
- 绘制直箭头；
- 自动选择；
- 撤销和重做；
- 样式修改；
- 删除；
- PlotJSON 下载；
- PlotJSON 文件导入。

测试 URL 带有：

```text
?e2e=1
```

该模式使用本地空白 Style，避免测试依赖远程底图和瓦片网络。生产页面使用 MapLibre 官方 demonstration style。

## 8. CI

`.github/workflows/ci.yml` 包含：

### Validate

- Node.js 20.19；
- Node.js 22；
- package TypeScript 构建；
- 单元测试；
- Playground TypeScript；
- GitHub Pages base 构建；
- handover 检查。

### Browser

- 安装 Chromium；
- 运行 Playwright；
- 失败时上传报告。

## 9. GitHub Pages 部署

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

首次部署前，仓库管理员需要在：

```text
Settings → Pages → Build and deployment → Source
```

选择：

```text
GitHub Actions
```

## 10. 设计约束

- Playground 只能使用公开 API；
- 不直接编辑 `plotlibre-committed` Source；
- 不把派生 Polygon 作为原始数据；
- 不在应用层复制箭头算法；
- 测试模式和生产模式必须运行同一 PlotLibre 代码；
- GitHub Pages 路径必须始终通过 `/PlotLibre/` 构建进行验证；
- 后续每种新符号都应在 Playground 中增加可视化入口。

## 11. 后续扩展

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
