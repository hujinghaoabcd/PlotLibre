# PlotLibre Design Notes

本目录保存公共符号在 geometry 实现前冻结的语义设计，以及多个相关符号共享数学基础时的组设计。

设计文档应回答：

- 公共 `plotType` 和 Definition version；
- authored control roles；
- 控制点顺序和交换不变量；
- derived geometry 边界；
- completion contract；
- validation 和退化输入策略；
- PlotJSON 与 migration 边界；
- shared frame 与独立 public semantics；
- clean-room research boundary；
- test plan 和 non-goals。

## 当前设计文档

| 文档 | 范围 | 当前状态 |
|---|---|---|
| `arrow-double-semantic-design.md` | 四控制双箭头、无序 tail/objective pairs、derived branch | 已实现，`arrow.double@1.0.0` |
| `arrow-pincer-semantic-design.md` | 五控制钳形箭头、paired arms、authored inner junction | 已实现并升级为 `arrow.pincer@1.1.0` |
| `route-corridor-group.md` | 共享 PathRibbon 的有向 route 与无向 flat-cap corridor | 已实现并合并 |
| `route-multihead-group.md` | bidirectional exact-two-tip route 与 derived-secondary-head route | 已实现并合并 |
| `closed-action-area-group.md` | 可变控制闭合曲线与固定三控制集结地 | 已实现并通过 PR #31 合并 |
| `circular-arc-family.md` | 三点圆弧、扇形与圆弓形的精确控制点和方向语义 | 006J 设计冻结候选，尚未实现 |

## Milestone 006I 决策

公共范围：

```text
area.closed-curve@1.0.0
area.gathering-place@1.0.0
```

`area.closed-curve` 的 controls 是有序 boundary waypoints，自动闭合只属于 derived ring。`area.gathering-place` 的 controls 是 flank A、front crown、flank B，并派生后部闭合锚点。

`area.route-loop` 已延期。只有在能够证明独立路线、方向、入口/出口或行动语义时才会成为 public Definition；若只是 closed curve 的参数或样式变体，则不应加入目录。

006I 已落地：

- 输出一个无孔 Polygon；
- authored controls 不重复首点；
- sampled vertices 不进入 PlotJSON；
- derived ring 统一 counterclockwise；
- duplicate、zero-area 和 self-intersection 全部 fail closed；
- 不进行静默 polygon repair；
- 不复用 arrow head、shaft、notch 或 route ribbon 语义；
- 163 Node / 23 Chromium 全绿；
- implementation merge SHA 为 `f873052d44a98f7029f0eda27ea70cda8b1af347`；
- post-merge finalization 已通过 PR #32 进入 `main`。

## Milestone 006J 设计冻结候选

经过两个固定 revision 参考库交叉研究，候选公共标识符调整为：

```text
line.circular-arc@1.0.0
area.sector@1.0.0
area.circular-segment@1.0.0
```

延期：

```text
area.lune
```

关键理由：参考库的 `Lune/弓形` 是“一条圆弧 + 一条弦”的 circular segment，不是由两条圆弧围成的数学 lune。PlotLibre 使用精确名称 `area.circular-segment`，不在 1.0 中添加误导性 alias。

设计冻结候选：

- circular arc 与 circular segment 使用 exact `start / through / end` 三控制点；
- through-point 明确选择 minor 或 major sweep；
- sector 使用 `center / exact radius-start / end-bearing handle`；
- sector 的第三点只定义 end bearing，距离不定义第二半径；
- sector 通过显式 `sweepDirection` 参数区分 clockwise/counterclockwise；
- 三者固定三点，第三次点击自动尝试完成；
- 两点状态只能作为 transient guide，不是合法 committed fallback；
- 1.0 只支持 local-metre mode，非 local 输入 fail closed；
- no hidden control movement、no collinear fallback、no silent geodesic switch；
- `segmentsPerCircle` 只影响采样密度；
- exact authored controls、PlotJSON、major sweep、crossing 0° 和 actual-rendered tests 必须冻结。

详细契约见 `circular-arc-family.md`。数学和 provenance 见 `../algorithms/circular-arc-foundation.md`。

## 状态说明

历史设计文档中的页首状态可能保留设计当时的事实，例如“geometry not yet implemented”。不可通过重写 immutable history 伪造当时状态。当前实现状态以：

```text
main source
README.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
latest merged PR
```

共同确定。
