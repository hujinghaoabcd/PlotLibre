# PlotLibre Development Handover — Milestone 006H Route Multi-Head Group

日期：2026-07-30  
仓库：`hujinghaoabcd/PlotLibre`  
分支：`agent/route-multihead-group`  
PR：`#29 Add route multi-head symbol group`  
Workspace：`0.0.18`  
Definitions：`arrow.route.bidirectional@1.0.0`、`arrow.route.double-head@1.0.0`  
状态：十四个公共箭头已完成；154 Node / 20 Chromium 全绿；等待最终 handover-inclusive CI、Ready 和 squash merge

## Current state

```text
shared PathRibbonFrame + route/head construction
├── arrow.route.bidirectional
│   └── exact start tip + derived shaft + exact end tip
└── arrow.route.double-head
    ├── ordinary exact-tip primary route Polygon
    └── derived same-direction secondary emphasis-head Polygon
```

两个 Definition 均只保存 authored centre path：

```text
controlPoints[0]      = exact start / route origin
controlPoints[1..n-2] = optional path controls
controlPoints[n-1]    = exact end / primary objective
```

所有中心线采样点、宽度、offset、neck plane、endpoint head 和 secondary head 均为派生数据。

权威记录：

```text
docs/design/route-multihead-group.md
docs/algorithms/arrow-route-multihead.md
docs/handover/2026-07-30-milestone-006h-route-multihead.md
PR #29
```

## Completed in this milestone

- 新增 `arrow.route.bidirectional@1.0.0`；
- 新增 `arrow.route.double-head@1.0.0`；
- 新增共享纯几何 `route-multihead` 模块；
- bidirectional route 保留两个 exact authored tips；
- bidirectional route 输出一个闭合、逆时针、简单 Polygon；
- double-head route 保留 exact primary objective/tip；
- double-head route 增加独立 derived secondary-head Polygon；
- secondary-head 参数与 primary body 参数隔离；
- 两个 Definition 均支持两点直线和多点曲线路径；
- 两者继续使用 schema-driven MultiPointDrawSession，无符号 ID 分支；
- Registry 公共符号增至 14；
- PlotJSON 仅保存 authored centre paths；
- Playground 增加“双向路线箭头”和“双头路线箭头”；
- Load Sample 生成完整十四类南京示例；
- 十四类型 draft/committed 实际 MapLibre 渲染矩阵通过；
- workspace/demo 升至 `0.0.18`；
- Node baseline 升至 154；
- Chromium baseline 保持 20；
- README、AGENTS、路线图、设计与算法文档已更新；
- pincer hardening 继续冻结；
- 本组仍使用一个实施 PR。

## Validation

```text
Initial implementation CI: 30509683256
- failed only two test assumptions; geometry and API were not weakened

Corrected core CI: 30510035357
- Node 20.19: success
- Node 22: success
- Node tests: 154 passed / 0 failed
- browser: timed out only because the fourteen-type matrix exceeded the old 30-second test budget

Full implementation/docs CI: 30510457314
- Node 20.19: success
- Node 22: success
- Node tests: 154 passed / 0 failed
- Chromium tests: 20 passed / 0 failed
- fourteen-type rendered visibility matrix: success
- typecheck/package build: success
- Playground typecheck/build: success
- handover contract: success
```

## Next tasks

1. 运行包含本 immutable handover 和 LATEST 的最终 CI；
2. 检查 unresolved review threads；
3. 更新 PR #29 最终说明；
4. 标记 Ready；
5. squash merge；
6. 确认 merge SHA 与 `main` identical；
7. 核对 Pages `v0.0.18 demo`；
8. 下一组进入闭合行动区域组；
9. 优先冻结 `area.closed-curve`、`area.gathering-place`、`area.route-loop` 的语义；
10. 不返回 pincer 细节加固。

## Risks and decisions

- bidirectional route 的反向不变量是双尖拓扑，而不是不同局部投影原点下的逐顶点或百万分之一面积恒等；
- double-head route 的 secondary head 是独立 coherent Polygon component，不是第二个 authored objective；
- secondary-head 参数不得改变 primary route body；
- 急转、过宽、空间不足或自相交继续 fail closed；
- 十四类型浏览器矩阵使用 60 秒总预算，内部单次渲染等待仍为 10 秒；
- production 公共符号数与默认初始化示例数仍是独立概念；
- 当前工具不能可靠直接确认 Pages 缓存；
- packages 仍为 `UNLICENSED`。

Continuation：从 PR #29 当前 head 继续。最终 handover-inclusive CI 全绿后检查 review threads，更新 PR 描述，Ready，使用 expected head SHA squash merge，再 compare merge SHA 与 main。下一开发组转向闭合行动区域，不继续堆叠路线头部变体。
