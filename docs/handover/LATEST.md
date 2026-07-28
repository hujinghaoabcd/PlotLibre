# PlotLibre Development Handover — Milestone 001

日期：2026-07-28  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/bootstrap-foundation`

## Current state

PlotLibre 从空仓库初始化为 TypeScript 多包项目，已经完成第一个最小纵向切片：语义标绘对象可以通过注册定义生成直箭头几何，保存到 Store，通过 CommandHistory 撤销重做，并由 MapLibre renderer 转换为 source/layer 数据。

当前版本是开发基线 `0.0.1`，尚未发布 npm 包。

## Completed in this milestone

### 工程结构

新增：

```text
packages/core
packages/geometry
packages/symbols
packages/maplibre
tests
scripts
docs
.github/workflows
```

根目录包含 npm workspaces、TypeScript project references、Node 测试脚本和 GitHub Actions CI。

### `@plotlibre/core`

已实现：

- `PlotFeature`、`PlotFeatureInput`；
- 最小 GeoJSON 类型；
- `PlotDefinition`；
- `RenderBundle`；
- `PlotRegistry`；
- 控制点数量和坐标基础验证；
- `PlotStore` 和变更订阅；
- `CommandHistory`；
- `CreatePlotCommand`；
- `DeletePlotCommand`；
- `ReplacePlotCommand`；
- PlotJSON 1.0 创建、序列化和解析；
- 项目错误类型。

### `@plotlibre/geometry`

已实现：

- 二维向量加减、缩放、模长、单位化和法向量；
- 起点局部米制投影；
- 局部地面距离；
- 参数化直箭头 ring；
- 参数范围验证；
- 重合控制点拒绝。

### `@plotlibre/symbols`

已实现：

- `STRAIGHT_ARROW_TYPE = "arrow.straight"`；
- `straightArrowDefinition`；
- 默认箭头样式；
- fill、outline 和 hit-area RenderBundle；
- built-in symbol catalog 的初始结构。

### `@plotlibre/maplibre`

已实现：

- 不直接绑定具体 MapLibre 版本的结构化 `MapLibreMapLike`；
- `plotlibre-committed` GeoJSON source；
- fill、line、circle layers；
- style expressions 读取每个派生 Feature 的颜色和宽度；
- `PlotLibre` 高层控制器；
- definition 注册；
- feature 创建、删除、撤销、重做；
- PlotJSON 导入导出；
- renderer destroy 清理。

### 文档和项目治理

新增：

- `README.md`；
- `AGENTS.md`；
- `CONTRIBUTING.md`；
- `docs/ARCHITECTURE.md`；
- `docs/PLOTJSON_SPEC.md`；
- `docs/REFERENCE_LIBRARY_MATRIX.md`；
- `docs/ALGORITHM_POLICY.md`；
- `docs/DEVELOPMENT_PLAN.md`；
- 强制交接文件检查脚本。

关键规则：每个完成的开发任务必须更新 `LATEST.md` 并添加一个不可变的日期里程碑文件。

## Validation

在 Node.js `v22.16.0`、TypeScript `5.8.3` 环境运行：

```bash
npm test
```

结果：

```text
8 tests
8 passed
0 failed
```

覆盖：

- definition 重复注册；
- 控制点数量验证；
- Store + History 创建/撤销/重做；
- PlotJSON round trip；
- 直箭头闭合、尖端和有限坐标；
- 重合控制点异常；
- 局部距离合理性；
- symbol RenderBundle；
- fake MapLibre adapter 创建、删除和撤销集成。

还运行：

```bash
tsc -b --pretty false
```

结果：通过，无 TypeScript 错误。

## Architectural decisions

1. 控制点和参数是唯一语义源数据，生成 Geometry 是派生结果。
2. Core 和 Geometry 不依赖 MapLibre。
3. 符号通过 `PlotDefinition` 注册，不建立大型继承树。
4. 复杂对象返回多部件 `RenderBundle`。
5. MapLibre 作为 peer dependency，当前声明支持 `>=5 <7`。
6. 第一阶段先做一个高质量直箭头纵向切片，而不是批量移植符号。
7. 当前直箭头为独立实现，未复制其他标绘库源码。
8. 项目暂不选择许可证，package manifest 使用 `UNLICENSED`。
9. 当前测试不依赖 Vitest，使用 Node 内置 test runner，降低空仓库初始化依赖。
10. 当前 renderer 使用全量 `setData()`；大规模增量更新延后到性能阶段。

## Known limitations

- 尚无真实浏览器 Playground；
- 尚未用真实 MapLibre 5/6 运行集成测试；
- 尚无鼠标绘制、动态 preview 或 handles；
- MapLibre `setStyle()` 后的 source/layer 恢复尚未实现；
- 仅有 `arrow.straight`；
- 当前 local projection 只适合短距离，不处理反经线和极区；
- PlotJSON 尚无 JSON Schema 和 feature migration；
- Store 更新和 transaction API 仍是基础版本；
- renderer 暂未渲染 labels 和 hit-area 专用图层；
- npm lockfile 尚未生成；
- 未完成第三方库逐 revision 许可证矩阵；
- 开源许可证尚未选择。

## Next tasks

下一里程碑必须完成“可交互直箭头”，优先顺序：

1. 新增 `@plotlibre/interaction` 或明确 interaction/core 边界；
2. 定义 engine-independent `DrawSession`；
3. 定义 MapLibre pointer/keyboard event adapter；
4. 新增 draft source 和 draft fill/line layers；
5. 实现 two-point draw session；
6. 第一次点击开始，pointermove 动态预览，第二次点击完成；
7. Escape 取消并清理 draft；
8. 新增 handles source/layers；
9. 选择直箭头并拖动两个控制点；
10. 拖动期间只预览，pointerup 只产生一个 ReplacePlotCommand；
11. 创建 Vite browser playground；
12. 用真实 MapLibre GL JS 6.0.0 测试；
13. 增加 Playwright Chromium E2E；
14. 处理 `setStyle()` 后恢复；
15. 更新交接文件。

## Risks and decisions

### MapLibre 6 新版本风险

MapLibre GL JS 6.0.0 刚发布。真实浏览器集成必须重点验证 ESM、WebGL2、source/layer API 和 style lifecycle，不应只依赖结构化 fake map 测试。

### TypeScript 版本

当前开发基线使用 TypeScript 5.8.3，以避免新主版本对工具生态的潜在影响。升级需要单独 PR 和 CI 验证。

### 算法来源风险

后续攻击箭头和双箭头不能从来源不明项目直接复制。每种复杂算法实现前必须创建 provenance 记录并完成许可证审计。

### 许可证决策

仓库公开但尚无 LICENSE。发布 npm 包、接受外部贡献或复用第三方源码前，应尽快选择许可证。

## Continuation instructions

新的开发者应按以下顺序开始：

1. 阅读根目录 `AGENTS.md`；
2. 阅读 `docs/ARCHITECTURE.md`；
3. 阅读 `docs/DEVELOPMENT_PLAN.md` 的 Milestone 002；
4. 运行 `npm test`；
5. 不修改 control-point-as-source-of-truth 原则；
6. 先完成真实 MapLibre playground 和 DrawSession，不要直接批量新增箭头；
7. 完成后更新 `docs/handover/LATEST.md` 并添加 Milestone 002 文件。
