# PlotLibre Development Handover — Route and Corridor Group

日期：2026-07-30  
仓库：`hujinghaoabcd/PlotLibre`  
分支：`agent/route-corridor-symbol-group`  
PR：`#28 Add route and corridor symbol group`  
Workspace：`0.0.17`  
Definitions：`arrow.route@1.0.0`、`arrow.corridor@1.0.0`  
状态：十二个公共符号已完成；145 Node / 20 Chromium 全绿；等待最终文档 CI、Ready 和合并

## Current state

```text
shared PathRibbonFrame
├── arrow.route    directed, exact terminal tip
└── arrow.corridor undirected, flat end caps
```

公共语义：

```text
controlPoints[0]      = path start / endpoint A
controlPoints[1..n-2] = optional path controls
controlPoints[n-1]    = exact route tip / corridor endpoint B
```

两个符号均支持两点直线形态和多点曲线路径。中心线采样、路径宽度、左右 offset、route neck/head 和最终 Polygon 均为派生数据。

权威记录：

```text
docs/design/route-corridor-group.md
docs/algorithms/arrow-route-corridor.md
docs/handover/2026-07-30-milestone-006f-006g-route-corridor.md
PR #28
```

## Completed in this milestone

- 新增共享 `PathRibbonFrame`；
- 新增 `arrow.route@1.0.0`；
- 新增 `arrow.corridor@1.0.0`；
- route 具有派生 neck plane 和 exact-tip head；
- corridor 具有独立无方向平头闭合；
- Registry 公共符号增至 12；
- PlotJSON 仅保存 authored center paths；
- workspace/demo 升至 `0.0.17`；
- Node baseline 升至 145；
- Chromium baseline 升至 20；
- 十二类型 draft/committed 实际渲染矩阵通过；
- 生产默认提供十二个 selector；
- 点击“加载示例”生成完整十二类；
- 旧页面初始化九示例兼容测试继续通过；
- 相关符号 2–3 个成组开发规则已写入 AGENTS 和路线图；
- pincer hardening 继续冻结。

## Validation

```text
Implementation CI:       30478662756
Compatibility-fix CI:    30479120532
Node 20.19:              success
Node 22:                 success
Node tests:              145 passed / 0 failed
Chromium tests:          20 passed / 0 failed
Typecheck/build:         success
Playground build:        success
Handover contract:       success
Final docs-inclusive CI: pending
```

## Next tasks

1. 完成最终 docs-inclusive CI；
2. 检查 unresolved review threads；
3. 更新 PR #28 最终说明；
4. 标记 Ready；
5. squash merge；
6. 确认 merge SHA 与 `main` identical；
7. 核对 Pages `v0.0.17 demo`；
8. 下一组开发 multi-head path extensions；
9. 实现前冻结公共标识符和控制点语义；
10. 不返回 pincer 细节加固。

## Risks and decisions

- route/corridor 共享数学内核，但不是参数变体；
- route 必须保留 exact authored tip；
- corridor 不得包含隐藏 head；
- sampled/offset/head vertices 永不持久化；
- 急转或过宽路径继续 fail closed；
- 生产公共符号数与默认初始化样例数是两个独立概念；
- 当前工具不能可靠直接确认 Pages 缓存；
- packages 仍为 `UNLICENSED`。

Continuation：等待本分支最终 CI。全绿后直接 Ready、检查 review threads、squash merge并 compare main。下一组进入 multi-head path extensions。
