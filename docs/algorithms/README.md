# PlotLibre Algorithm Records

本目录记录复杂参数化符号和共享几何组的独立算法说明、来源边界、退化输入策略与测试要求。

每份记录至少应包含：

```text
public Definition or shared algorithm
canonical authored controls
mathematical construction
coordinate-mode policy
derived geometry boundary
parameter contract
failure policy
clean-room references and revisions
license review
code reuse declaration
tests and golden fixtures
```

目录中的公式和行为说明用于解释 PlotLibre 的独立实现，不代表允许复制参考项目源码。通用政策见 `../ALGORITHM_POLICY.md`。

## 当前算法记录

| 文档 | 公共符号或共享基础 | 状态 |
|---|---|---|
| `arrow-fine.md` | `arrow.fine` | 已实现 |
| `arrow-fine-tailed.md` | `arrow.fine.tailed` | 已实现 |
| `arrow-assault-direction.md` | `arrow.assault-direction` | 已实现 |
| `arrow-curved.md` | `arrow.curved` | 已实现 |
| `arrow-attack.md` | `arrow.attack` 与共享 AttackArrow frame | 已实现 |
| `arrow-attack-tailed.md` | `arrow.attack.tailed` | 已实现 |
| `arrow-double.md` | `arrow.double` | 已实现 |
| `arrow-pincer.md` | `arrow.pincer` | 已实现 |
| `arrow-squad-combat.md` | `arrow.squad-combat` | 已实现 |
| `arrow-route-corridor.md` | `arrow.route`、`arrow.corridor` 与 PathRibbon frame | 已实现 |
| `arrow-route-multihead.md` | `arrow.route.bidirectional`、`arrow.route.double-head` | 已实现 |
| `closed-action-area.md` | `area.closed-curve`、`area.gathering-place` 与 cyclic closed interpolation | 已实现 |
| `circular-arc-foundation.md` | `line.circular-arc`、`area.sector`、`area.circular-segment` 与共享三点圆弧 frame | 006J 设计冻结候选 |

基础通用几何另见：

```text
../GEOMETRY_FOUNDATION.md
../ALGORITHM_POLICY.md
```

## Milestone 006I 算法边界

`closed-action-area.md` 已实现并通过 PR #31 合并：

- 周期 Hermite/Catmull-Rom 数学表达；
- local-metre projection；
- authored control interpolation；
- automatic closure；
- gathering-place derived rear anchor；
- counterclockwise ring normalization；
- duplicate、degenerate 和 self-intersection fail-closed policy；
- gathering flank-only canonical permutation；
- 参数隔离；
- antimeridian/high-latitude 限制；
- 两个固定 revision 的 clean-room 行为参考；
- Node、PlotJSON、interaction 和 browser 测试要求。

不得把最终 Polygon ring 保存为 authored controls，也不得通过静默 ring repair 改变用户控制点语义。

## Milestone 006J 算法冻结候选

`circular-arc-foundation.md` 已记录：

- fixed revisions：
  - `sakitam-fdd/ol-plot@c919e60b4edeaeca53c08f9552f793b2ae9537f0`；
  - `sakitam-fdd/maptalks.plot@37dab8d0dd31650540146e1e0f03f54982f01799`；
- 两个参考仓库均为 MIT License；
- code reuse 为 `none`；
- 三点 circumcircle 的 determinant 公式；
- exact `start / through / end` sweep selection；
- minor/major、clockwise/counterclockwise 和 crossing 0°；
- 分段采样并 exact 保留 through-point；
- `line.circular-arc` LineString 边界；
- `area.circular-segment` arc + chord Polygon；
- `area.sector` centre/radius-start/end-bearing 与显式 sweepDirection；
- local-only 1.0 coordinate policy；
- near-collinear、excessive radius 和 unsupported extent fail closed；
- no two-point fallback、no triangle degradation、no hidden geodesic switch；
- deterministic fixtures 和 browser requirements。

`area.lune` 未进入 006J public scope。参考实现的 `Lune/弓形` 实际是 circular segment；真正由两条圆弧围成的 lune 需要独立设计。

在设计 PR 合并前，不创建 circular-arc geometry 或 Definition。实现必须以合并后的固定数学记录和测试 fixture 为约束。
