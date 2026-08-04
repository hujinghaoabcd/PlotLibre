# PlotLibre Development Handover — Milestone 006J Circular Arc Design Active

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
设计基线：`main@b3a1a18c5aaf0b26a4c7c5e42a6e307eaa331873`  
活跃分支：`agent/006j-arc-sector-lune-design`  
Workspace：`0.0.19`  
状态：006I implementation 与 post-merge finalization 均已合并；006J 正在冻结 circular arc family 语义，尚无运行时代码

## Current state

```text
workspace:          0.0.19
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     16
public Arrow types: 14
public Area types:  2
Node tests:         163
Chromium tests:     23
base main SHA:      b3a1a18c5aaf0b26a4c7c5e42a6e307eaa331873
active branch:      agent/006j-arc-sector-lune-design
active phase:       semantic and mathematical design only
```

当前已实现公共 Definitions 仍为 16 个。006J 候选尚未进入 Registry、PlotJSON、Playground 或 public API。

设计冻结候选：

```text
line.circular-arc@1.0.0
area.sector@1.0.0
area.circular-segment@1.0.0
```

延期：

```text
area.lune
```

## Completed in this milestone

- 在两个固定 revision 参考库中交叉研究 Arc、Sector 和 Lune；
- 核对两个参考仓库的 MIT License；
- 声明 code reuse 为 `none`；
- 确认参考 `Arc` 是固定三点 open LineString；
- 确认参考 `Sector` 是 centre/radius-start/end-direction 三点 Polygon；
- 确认参考 `Lune/弓形` 实际为一条圆弧加直线弦的 circular segment；
- 拒绝使用误导性 `area.lune` 作为 circular-segment alias；
- 将候选 `area.arc` 修正为 output/category 一致的 `line.circular-arc`；
- 冻结 `line.circular-arc` 的 exact `start / through / end` controls；
- 冻结 `area.circular-segment` 的 exact arc controls 与 derived chord；
- 冻结 `area.sector` 的 `center / exact radius-start / end-bearing handle` controls；
- 冻结显式 `sweepDirection` 参数；
- 冻结 fixed-three automatic completion；
- 冻结 no two-point fallback、no collinear degradation、no hidden control movement；
- 冻结 local-metre-only 1.0 coordinate policy；
- 记录三点 circumcircle、directed sweep、exact-through sampling 和 sector bearing 数学；
- 记录 minor/major、crossing 0°、sweep > 180° 与 reversal test matrix；
- 新增 `docs/design/circular-arc-family.md`；
- 新增 `docs/algorithms/circular-arc-foundation.md`；
- 更新 design 与 algorithm indexes。

## Validation

当前分支只包含 Markdown 设计和 provenance，不包含：

```text
geometry
Definitions
Registry entries
PlotJSON changes
interaction changes
Playground selectors or samples
tests
```

设计 PR 的 merge gate 仍执行完整回归：

```text
Node 20.19
Node 22
163 Node tests
23 Chromium tests
Playground build
handover contract
0 unresolved review threads
```

设计内容的人工冻结门槛：

- public identifiers 与 output type 一致；
- control roles 无歧义；
- through-point 明确选择 minor/major sweep；
- sector bearing handle 与 rendered endpoint 区分明确；
- local/geodesic 边界明确；
- legacy Lune 命名问题明确；
- deterministic fixtures 在实现前列出；
- clean-room revisions、licenses 和 no-code-reuse 声明完整。

## Next tasks

1. 更新 AGENTS 与 DEVELOPMENT_PLAN 到活跃 006J design branch；
2. 增加 immutable 006J design handover；
3. 创建只含文档的 Draft design PR；
4. 对该 PR 运行完整 163 Node / 23 Chromium 回归；
5. 处理设计评审问题，不在 design PR 中写 geometry；
6. 全绿且 0 线程后 squash merge design PR；
7. 从设计合并后的 `main` 创建独立 implementation branch；
8. 先实现 pure circular frame 和 deterministic Node fixtures；
9. geometry 全绿后再接 Definition、Registry、PlotJSON、Playground 和 browser tests；
10. 不添加 `area.lune` alias，不回到 pincer hardening 或 route-head variants。

## Risks and decisions

- `line.circular-arc` 将引入第一个非 Arrow 的 open LineString category，Registry 与 Playground 必须验证 category/output assumptions；
- sector 的 end-bearing handle 是 authored semantic control，但通常不位于 rendered arc endpoint，必须有清晰 semantic guide；
- reference libraries 的 two-point fallback 和 singular degradation 不适用于 PlotLibre；
- local-only 1.0 会拒绝 antimeridian、high-latitude、large-extent 和 geodesic small-circle cases；
- near-collinear triples 可能产生巨大 circumradius，必须冻结 scale-aware determinant 与 radius policy；
- true mathematical lune 需要两条圆弧的独立控制模型，不能与 circular segment 混同；
- packages 仍为 `UNLICENSED`；
- root workspace 与 public package versions 尚未统一；
- PlotJSON 尚缺正式 JSON Schema 和 migration framework；
- Vite bundle code-splitting 风险仍存在但不属于 design PR；
- connector 无法删除已合并分支。

Continuation：继续在 `agent/006j-arc-sector-lune-design` 完成文档冻结和设计 PR。不要在该分支创建 `packages/geometry/src/circular-arc.ts` 或任何新 Definition。
