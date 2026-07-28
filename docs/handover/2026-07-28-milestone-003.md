# PlotLibre Development Handover — Milestone 003

日期：2026-07-28  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/github-pages-playground`  
基线提交：`6032321b5d4edfe3b8911071451e0bef14a1759b`  
上一阶段 PR：`#1`，已合并

## Current state

PlotLibre 当前开发版本为 `0.0.3`。Milestone 001 和 002 已通过 PR #1 合并到 `main`，本阶段在新的独立分支上完成真实 MapLibre GL JS 6 浏览器应用、Playwright 测试和 GitHub Pages 部署结构。

当前预期公开地址：

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

该地址只有在本阶段 PR 合并、Pages Source 选择 GitHub Actions 且部署工作流成功后才可视为正式可用。

## Completed in this milestone

### 1. 新增真实浏览器 Playground

新增 workspace：

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
│   └── styles.css
└── e2e/
    └── playground.spec.ts
```

技术基线：

- MapLibre GL JS `6.0.0`；
- Vite `8.1.5`；
- Playwright `1.61.1`；
- Node.js `20.19+`；
- GitHub Pages project base `/PlotLibre/`。

### 2. Playground 功能

用户界面已经支持：

- 绘制直箭头；
- 第一次点击确定箭尾；
- pointer move 动态预览；
- 第二次点击完成；
- Escape 取消；
- Enter 使用当前预览位置完成；
- 点击对象选择；
- 拖动两个语义控制点；
- 撤销和重做；
- 删除选中对象；
- 清空文档；
- 加载三个南京示例箭头；
- 填充颜色；
- 填充透明度；
- 边线颜色；
- 边线宽度；
- PlotJSON 下载导出；
- PlotJSON 文件导入；
- 当前对象数量、选中 ID 和操作状态显示；
- 桌面和移动端响应式布局。

Playground 只调用正式公开 API，不直接操作 Store 内部 Map、不直接修改 MapLibre Source，也不复制箭头算法。

### 3. 生产与测试地图模式

生产模式使用：

```text
https://demotiles.maplibre.org/style.json
```

无需私有 token。

Playwright 使用：

```text
?e2e=1
```

并加载本地空白 Style。该设计使浏览器测试不依赖远程底图、字体或瓦片服务，只验证 MapLibre WebGL2 与 PlotLibre 本身。

### 4. Playwright 浏览器测试

E2E 覆盖：

1. `/PlotLibre/` GitHub Pages project path；
2. MapLibre canvas 初始化；
3. 两点绘制直箭头；
4. 自动选择新对象；
5. undo；
6. redo；
7. 样式更新；
8. 删除；
9. PlotJSON 下载；
10. PlotJSON 文件导入。

Chromium 使用 WebGL 相关启动参数，便于 GitHub Actions runner 通过软件渲染运行 MapLibre 6。

### 5. Workspace 和命令

根 workspace 新增 `apps/*`。

新增命令：

```bash
npm run playground:dev
npm run playground:typecheck
npm run playground:build
npm run playground:e2e
```

`npm run check` 现在包括：

- packages TypeScript；
- packages 单元测试；
- Playground TypeScript；
- GitHub Pages base 构建。

### 6. CI

`.github/workflows/ci.yml` 已扩展：

- Node.js 20.19；
- Node.js 22；
- `npm run check`；
- handover contract；
- 独立 Chromium browser job；
- 失败时上传 Playwright report；
- `workflow_dispatch` 手动触发入口。

### 7. GitHub Pages

新增：

```text
.github/workflows/pages.yml
```

工作流：

1. 从 `main` checkout；
2. Node.js 22；
3. `npm install`；
4. `npm run playground:build`；
5. `actions/configure-pages`；
6. 上传 `apps/playground/dist`；
7. 部署到 `github-pages` environment。

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
```

更新：

```text
README.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
```

## Validation

### 已完成的静态设计检查

- Playground 使用公开 PlotLibre API；
- Vite base 固定验证 `/PlotLibre/`；
- E2E 不依赖远程地图资源；
- Pages workflow 只从 `main` 部署；
- Pages workflow 使用 artifact deployment；
- CI 与 Pages 均可 `workflow_dispatch`；
- handover 文件结构符合项目约定。

### 自动化验证状态

本阶段 PR 创建后，以 GitHub Actions 为权威执行：

```bash
npm install
npm run check
npm run handover:check
npx playwright install --with-deps chromium
npm run playground:e2e
```

当前执行环境无法解析 `github.com`，因此不能在容器中重新克隆仓库或安装 npm 依赖。PR CI 结果和必要修复将在本文件后续更新中记录；在 CI 通过前，本里程碑状态为“代码完成、等待验证”。

## Architectural decisions

1. Playground 是正式公开 API 的普通消费者，不拥有内部特权。
2. 生产底图与 E2E 底图分离，但运行相同 PlotLibre 源码。
3. GitHub Pages 使用 project-site base `/PlotLibre/`，所有 E2E 也使用同一路径。
4. MapLibre 6 为 Playground 固定验证版本；库本身仍声明 MapLibre 5/6 peer 范围。
5. Vite 和 Playwright 只属于私有 Playground workspace，不进入发布包依赖。
6. PlotJSON 导入导出使用现有 Core API，不在 UI 层定义第二套格式。
7. 样式修改通过 `PlotLibre.replace()` 进入 History，不直接改派生 Feature。
8. GitHub Pages 只从 `main` 部署，PR 分支只运行 CI。
9. 没有 `package-lock.json` 前，Actions 不启用 npm cache，以免 setup-node 因缺失锁文件失败。
10. Vite 8 要求 Node 20.19+，根 engines 已同步提升。

## Known limitations

- 当前只有 `arrow.straight`；
- 符号目录尚未建立；
- 属性面板仅覆盖四个基础样式字段；
- 尚无参数控制柄；
- 没有多选、框选、吸附和图层树；
- 没有文本方式编辑 PlotJSON；
- 生产底图依赖 MapLibre 官方 demo tile service；
- 当前 E2E 只覆盖 Chromium；
- 未验证 Firefox 和 WebKit；
- 尚未验证真实触摸设备；
- GitHub Pages 首次部署可能需要管理员在 Settings 中选择 GitHub Actions；
- 仓库仍未选择开源许可证；
- 尚未生成锁文件，依赖安装不是完全可重复构建；
- 本阶段 CI 结果在 PR 创建后确认。

## Next tasks

Milestone 004：箭头公共几何基础。

优先顺序：

1. 为每个参考算法建立 provenance 记录；
2. polyline 清洗和累计长度；
3. point/tangent along line；
4. 局部与测地计算接口；
5. Catmull-Rom/Bezier 平滑；
6. variable-width left/right offset；
7. 箭头头部与颈部公共构造；
8. ring winding normalization；
9. self-intersection 检测；
10. 重合点、极短线、共线点退化策略；
11. antimeridian 和高纬度策略；
12. property-based tests；
13. geometry golden fixtures；
14. Playground 增加 geometry debugging 页面；
15. 更新交接文件。

## Risks and decisions

### Vite 8 和 Node 版本

Vite 8 要求现代 Node.js。项目最低 Node 已从 20 提升至 20.19。后续若发布 npm 包，应明确库包本身与 Playground 工具链的 Node 要求可能不同。

### GitHub Pages 首次配置

Workflow 文件本身不能保证仓库 Pages Source 已设置为 GitHub Actions。首次合并后需要检查仓库 Settings；不能在部署成功前宣称公开站点已上线。

### MapLibre demo service

生产示例采用公开 demo style 以免要求 token，但它不是 SLA 底图服务。PlotLibre 功能与底图错误隔离，E2E 也完全不依赖该服务。

### 浏览器软件渲染

GitHub-hosted runner 的 WebGL 能力可能受 Chromium/ANGLE 参数影响。若 E2E 失败，应优先查看浏览器日志和截图，不应把测试改成绕开真实 MapLibre。

## Continuation instructions

新的开发者应按以下顺序继续：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/ARCHITECTURE.md`；
3. 阅读 `docs/INTERACTION_MODEL.md`；
4. 阅读 `docs/PLAYGROUND.md`；
5. 查看本阶段 PR 的 CI；
6. 修复所有 TypeScript、Vite、MapLibre 或 Playwright 问题；
7. CI 通过后更新本交接文件 Validation；
8. 合并后验证 Pages workflow 和公开 URL；
9. 然后从最新 `main` 新建 Milestone 004 分支；
10. 不直接批量复制攻击箭头代码，先完成共享几何基础和来源记录。
