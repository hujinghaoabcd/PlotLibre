# PlotLibre Development Handover — Milestone 003

日期：2026-07-28  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/github-pages-playground`  
PR：`#2 Add MapLibre playground and GitHub Pages deployment`  
基线提交：`6032321b5d4edfe3b8911071451e0bef14a1759b`

## Current state

PlotLibre 当前开发版本为 `0.0.3`。Milestone 001 和 002 已通过 PR #1 合并到 `main`。Milestone 003 已完成真实 MapLibre GL JS 6 Playground、Playwright Chromium 测试、CI 矩阵和 GitHub Pages 部署工作流。

PR #2 的权威 CI 运行 `30376778085` 已全部通过：

- `validate (20.19)`：success；
- `validate (22)`：success；
- `browser`：success。

当前阶段状态：**代码与自动化验证完成，等待 PR #2 合并和 Pages 首次部署验证**。

预期公开地址：

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

在 Pages workflow 成功且该地址实测可访问前，不应宣称站点已经上线。

## Completed in this milestone

### 1. 真实浏览器 Playground

新增：

```text
apps/playground/
├── package.json
├── tsconfig.json
├── index.html
├── vite.config.ts
├── playwright.config.ts
├── src/
│   ├── main.ts
│   ├── playground-app.ts
│   ├── template.ts
│   ├── styles.css
│   └── vite-env.d.ts
└── e2e/
    └── playground.spec.ts
```

技术基线：

- MapLibre GL JS `6.0.0`；
- Vite `8.1.5`；
- Playwright Test `1.61.1`；
- Node.js `20.19+`；
- Vite base `/PlotLibre/`。

### 2. Playground 功能

已实现：

- 绘制 `arrow.straight`；
- 第一次点击确定箭尾；
- pointer move 动态预览；
- 第二次点击或 Enter 完成；
- Escape 取消；
- 点击图形选择；
- 拖动两个语义控制点；
- 撤销与重做；
- 删除选中对象；
- 清空文档；
- 加载三个南京示例箭头；
- 填充颜色与透明度；
- 边线颜色与宽度；
- PlotJSON 下载导出；
- PlotJSON 文件导入；
- 对象数量、选中 ID 和操作状态显示；
- 桌面与移动端响应式布局。

Playground 只消费公开 API：

```text
PlotLibre.draw
PlotLibre.cancelDrawing
PlotLibre.create
PlotLibre.replace
PlotLibre.remove
PlotLibre.clear
PlotLibre.undo
PlotLibre.redo
PlotLibre.select
PlotLibre.exportJson
PlotLibre.importDocument
PlotStore / CommandHistory 只读状态
```

它不直接编辑 MapLibre Source，不复制箭头算法，也不把派生 Polygon 作为源数据。

### 3. 生产和测试地图模式

生产页面使用公开 demonstration style：

```text
https://demotiles.maplibre.org/style.json
```

无需私有 token。

E2E URL 使用：

```text
/PlotLibre/?e2e=1
```

该模式加载本地空白 Style，不依赖远程瓦片、字体或底图服务，但仍运行真实 MapLibre GL JS 6 和 WebGL2。

### 4. 自动化测试

库级测试：

```text
15 tests
15 passed
0 failed
```

Playwright：

```text
4 tests
4 passed
```

浏览器覆盖：

1. GitHub Pages `/PlotLibre/` 子路径；
2. MapLibre canvas 初始化；
3. 两点绘制；
4. 新对象自动选择；
5. undo/redo；
6. 样式修改；
7. 删除；
8. PlotJSON 下载；
9. PlotJSON 文件导入。

### 5. Workspace 与命令

根 workspace 已加入：

```json
"workspaces": ["packages/*", "apps/*"]
```

新增命令：

```bash
npm run playground:dev
npm run playground:typecheck
npm run playground:build
npm run playground:e2e
```

`npm run check` 包括：

- packages TypeScript；
- 15 项单元和适配器测试；
- Playground TypeScript；
- `/PlotLibre/` Pages 构建。

### 6. CI

`.github/workflows/ci.yml` 现在包含：

- Node 20.19；
- Node 22；
- `fail-fast: false`，两个版本独立验证；
- 完整 validation log 失败 artifact；
- Chromium 安装；
- Playwright E2E；
- 失败时 Playwright report、trace、截图和视频；
- handover contract；
- `workflow_dispatch`。

### 7. GitHub Pages

新增：

```text
.github/workflows/pages.yml
```

流程：

1. checkout `main`；
2. Node 22；
3. `npm install`；
4. `npm run playground:build`；
5. configure Pages；
6. 上传 `apps/playground/dist`；
7. deploy Pages artifact。

权限：

```yaml
contents: read
pages: write
id-token: write
```

### 8. 文档

新增：

```text
docs/PLAYGROUND.md
docs/handover/2026-07-28-milestone-003.md
```

更新：

```text
README.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
```

## Validation

权威 GitHub Actions 运行：

```text
Run ID: 30376778085
Head before final documentation-only update: f789c009d27e4e607d2d682a9ab8665fa07fcb73
```

验证结果：

```text
Node 20.19 validate: passed
Node 22 validate: passed
TypeScript packages: passed
15 unit/adapter tests: passed
Playground TypeScript: passed
Vite /PlotLibre/ build: passed
Handover contract: passed
Chromium installation: passed
4 Playwright E2E tests: passed
```

本阶段通过 CI 实际发现并修复：

1. Playwright `workers: undefined` 与 `exactOptionalPropertyTypes` 不兼容；
2. MapLibre 6 `attributionControl` 类型不接受 `true`；
3. MapLibre Point 类与轻量测试点需要不透明 adapter 边界；
4. MapLibre Feature `id` 允许 `undefined`；
5. 仅给 build 传 `--base` 会使 Preview 中 `/PlotLibre/assets/*` 返回 404；
6. `base: "/PlotLibre/"` 必须固定在 `vite.config.ts`，使 dev、preview、E2E 和 Pages 一致。

最终文档更新不改变运行代码，仅记录已通过结果；PR 合并前应确认最新 CI 仍为绿色。

## Architectural decisions

1. Playground 是公开 API 的普通消费者，不具有内部特权。
2. 生产底图与 E2E 空白底图分离，但运行相同库代码。
3. `/PlotLibre/` 是 dev、preview、test 和 Pages 的统一 base。
4. MapLibre 6.0.0 是 Playground 固定验证版本；库 peer 范围仍支持 5/6。
5. Vite 和 Playwright 仅存在于私有示例 workspace。
6. PlotJSON 继续由 Core 定义，UI 不建立第二套格式。
7. 样式修改通过 `PlotLibre.replace()` 进入 History。
8. GitHub Pages 只从 `main` 部署。
9. 当前无 lockfile，因此 Actions 暂不启用 npm cache。
10. adapter 边界允许不透明 engine point/query 参数，避免公共包直接导入 MapLibre 实现类型。
11. CI 失败日志和 Playwright report 作为长期诊断 artifact 保留七天。

## Known limitations

- 当前只有 `arrow.straight`；
- 尚无 Symbol Catalog；
- 样式面板只有四个基础字段；
- 尚无参数控制柄；
- 没有多选、框选、吸附和图层树；
- 没有 PlotJSON 文本编辑器；
- 生产底图依赖官方 demo service；
- E2E 当前只覆盖 Chromium；
- 尚未测试 Firefox、WebKit 和真实触摸设备；
- Pages 首次部署可能需要管理员选择 GitHub Actions Source；
- 仓库仍未选择开源许可证；
- 尚无 `package-lock.json`，依赖安装不是完全可重复；
- 公开 URL 尚未在 Pages 部署后验证。

## Next tasks

### 合并与部署收尾

1. 将 PR #2 标记为 ready；
2. 确认最新 CI 绿色；
3. 合并 PR #2；
4. 检查 `Settings → Pages → Source = GitHub Actions`；
5. 查看 Pages workflow；
6. 验证公开 URL；
7. 若首次部署需要 environment approval，完成批准；
8. 将实际 Pages URL 和部署结果记录到下一份交接。

### Milestone 004：箭头公共几何基础

1. 为算法建立 provenance 模板和逐项记录；
2. polyline 点清洗和累计长度；
3. point/tangent along line；
4. 局部与测地计算接口；
5. Catmull-Rom/Bezier 平滑；
6. variable-width left/right offset；
7. 公共 head/neck/tail 构造；
8. ring winding normalization；
9. self-intersection 检测；
10. 重合点、极短线和共线点策略；
11. antimeridian 与高纬度策略；
12. property-based tests；
13. geometry golden fixtures；
14. Playground geometry debug 页面；
15. 更新交接文件。

## Risks and decisions

### Pages 首次配置

Workflow 已完成，但不能替代仓库 Pages Source 配置。必须以实际 deployment 和公开 URL 为准。

### Demo 底图

公开 demo style 不需要 token，但不是 SLA 服务。E2E 已与其解耦；后续可加入底图切换和离线示例。

### WebGL 软件渲染

Chromium CI 已通过当前 ANGLE/SwiftShader 参数。升级 Chromium、MapLibre 或 runner image 后必须保留真实浏览器回归测试。

### 无锁文件

当前 `npm install` 解析的是精确直接版本，但传递依赖仍可能变化。后续工程化阶段应生成并维护 lockfile，再启用 setup-node npm cache。

## Continuation instructions

新的开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/ARCHITECTURE.md`；
3. 阅读 `docs/INTERACTION_MODEL.md`；
4. 阅读 `docs/PLAYGROUND.md`；
5. 查看 PR #2 和最新 CI；
6. 合并后验证 Pages 部署；
7. 从最新 `main` 创建 Milestone 004 分支；
8. 先完成共享几何原语和 provenance，不批量复制箭头实现；
9. 所有几何新增必须有退化测试、性质测试和 golden fixture；
10. 完成后更新 `LATEST.md` 并添加 Milestone 004 不可变交接。
