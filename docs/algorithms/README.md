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

| 文档 | 公共符号或共享基础 |
|---|---|
| `arrow-fine.md` | `arrow.fine` |
| `arrow-fine-tailed.md` | `arrow.fine.tailed` |
| `arrow-assault-direction.md` | `arrow.assault-direction` |
| `arrow-curved.md` | `arrow.curved` |
| `arrow-attack.md` | `arrow.attack` 与共享 AttackArrow frame |
| `arrow-attack-tailed.md` | `arrow.attack.tailed` |
| `arrow-double.md` | `arrow.double` |
| `arrow-pincer.md` | `arrow.pincer` |
| `arrow-squad-combat.md` | `arrow.squad-combat` |
| `arrow-route-corridor.md` | `arrow.route`、`arrow.corridor` 与 PathRibbon frame |
| `arrow-route-multihead.md` | `arrow.route.bidirectional`、`arrow.route.double-head` |
| `closed-action-area.md` | `area.closed-curve`、`area.gathering-place` 与 cyclic closed interpolation |

基础通用几何另见：

```text
../GEOMETRY_FOUNDATION.md
../ALGORITHM_POLICY.md
```

## Milestone 006I 算法边界

`closed-action-area.md` 已冻结：

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
