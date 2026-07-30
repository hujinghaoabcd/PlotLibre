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

两个 Definition 均只保存 authored centre path；所有中心线采样、宽度、offset、neck 和 secondary-head 顶点均为派生数据。

权威记录：

```text
docs/design/route-multihead-group.md
docs/algorithms/arrow-route-multihead.md
docs/handover/2026-07-30-milestone-006h-route-multihead.md
PR #29
```

## Completed in this milestone

- 新增双向路线箭头与双头路线箭头；
- bidirectional route 保留两个 exact authored tips，并输出一个 simple Polygon；
- double-head route 保留 exact primary tip，并增加 derived secondary-head Polygon；
- 两种符号共享纯 route/head geometry，但保持独立方向拓扑；
- 两点直线和多点曲线路径均支持；
- Registry 公共符号增至 14；
- PlotJSON 仅保存 authored centre paths；
- Playground 提供十四个 selector 和十四类 Load Sample；
- 十四类型 draft/committed 实际渲染矩阵通过；
- workspace/demo 为 `0.0.18`；
- Node baseline 为 154；
- Chromium baseline 为 20；
- README、AGENTS、路线图、设计和算法文档已更新；
- pincer hardening 继续冻结。

## Validation

```text
Initial CI:              30509683256
Corrected core CI:       30510035357
Full implementation CI:  30510457314
Node 20.19:              success
Node 22:                 success
Node tests:              154 passed / 0 failed
Chromium tests:          20 passed / 0 failed
14-type render matrix:   success
Typecheck/build:         success
Playground build:        success
Handover contract:       success
```

## Next tasks

1. 完成最终 handover-inclusive CI；
2. 检查 unresolved review threads；
3. 更新 PR #29 描述；
4. 标记 Ready；
5. squash merge 并 compare main；
6. 核对 Pages `v0.0.18 demo`；
7. 下一组进入闭合行动区域；
8. 冻结 closed-curve、gathering-place、route-loop 语义；
9. 暂不增加更多路线头部变体；
10. 不返回 pincer 加固。

## Risks and decisions

- path reversal 保证双尖拓扑，不要求不同局部投影原点下逐顶点恒等；
- secondary head 是 derived render component，不是 authored objective；
- secondary 参数不得改变 primary body；
- 每个 Polygon 继续严格 simple-ring validation；
- 十四类型矩阵总超时为 60 秒，单次可见性等待仍为 10 秒；
- 当前工具不能可靠直接确认 Pages 缓存；
- packages 仍为 `UNLICENSED`。

Continuation：最终 CI 全绿后直接执行 PR #29 的 review-thread 检查、Ready、squash merge 和 main compare。下一开发组转向闭合行动区域。
