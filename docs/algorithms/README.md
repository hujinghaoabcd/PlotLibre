# PlotLibre Algorithm Records

本目录记录参数化符号、共享几何和专业编辑事务的独立算法、失败策略与测试要求。

## Current records

| 文档 | 公共符号或共享基础 | 状态 |
|---|---|---|
| `arrow-fine.md` | `arrow.fine` | 已实现 |
| `arrow-fine-tailed.md` | `arrow.fine.tailed` | 已实现 |
| `arrow-assault-direction.md` | `arrow.assault-direction` | 已实现 |
| `arrow-curved.md` | `arrow.curved` | 已实现 |
| `arrow-attack.md` | AttackArrow frame | 已实现 |
| `arrow-attack-tailed.md` | `arrow.attack.tailed` | 已实现 |
| `arrow-double.md` | `arrow.double` | 已实现 |
| `arrow-pincer.md` | `arrow.pincer` | 已实现 |
| `arrow-squad-combat.md` | `arrow.squad-combat` | 已实现 |
| `arrow-route-corridor.md` | route/corridor PathRibbon | 已实现 |
| `arrow-route-multihead.md` | bidirectional/double-head route | 已实现 |
| `closed-action-area.md` | closed curve/gathering place | 已实现 |
| `circular-arc-foundation.md` | circular arc/segment/sector | 已实现 |
| `batch-edit-transaction.md` | atomic Store、selection、batch command、translation | 已实现 |
| `screen-region-selection.md` | box/lasso、exact screen resolver | 已实现 |
| `selection-local-transform.md` | shared-pivot rotation and positive uniform scale | 007C design freeze candidate |

## Current baseline

```text
main:               349a09160ac2e17883e2270123d371c164ef28c2
workspace:          0.0.22
public symbols:     19
Node tests:         264
Chromium tests:     32
Sources/Layers:     4 / 10
benchmark job:      required
current branch:     agent/007c-rotation-scale-design
runtime:            prohibited
```

## 007C algorithm summary

Detailed record：`selection-local-transform.md`.

### Shared frame

```text
all selected authored controls
→ validate one local coordinate domain
→ order-independent geographic seed
→ one local projection
→ local authored-control AABB
→ fixed AABB-center pivot
```

### Clockwise rotation

```text
x' = px + cosθ(x-px) + sinθ(y-py)
y' = py - sinθ(x-px) + cosθ(y-py)
```

Pointer angle accumulates successive signed local-vector deltas, avoiding ±180° discontinuity.

### Positive uniform scale

```text
k = current local radius / start local radius
x' = px + k(x-px)
y' = py + k(y-py)
0.01 <= k <= 100
```

Out-of-range factor rejects rather than clamps. Crossing pivot cannot reflect because `k` remains positive.

### Canonical mutation

- authored controls only；
- each changed feature revision +1；
- parameters/style/metadata unchanged；
- all candidates canonicalized and generated before preview/commit；
- partial preview and partial transaction prohibited；
- one `BatchEditCommand`；
- undo/redo reuse exact captured values。

### Parameter caveat

The catalog contains absolute ground limits such as `minimumWidthMeters` and `maximumWidthMeters`. 007C v1 does not transform parameters and therefore does not promise strict rendered similarity when an absolute cap becomes active. A future parameter-transform hook is a separate design.

## Required runtime fixtures

- order-independent frame/pivot；
- clockwise cardinal rotations and distance preservation；
- angle unwrapping；
- scale `0.01/1/100` and range rejection；
- pointer crossing pivot without reflection；
- antimeridian/high-latitude/large-extent rejection；
- all 19 Definitions Registry smoke；
- all-member failure atomicity；
- revision、selection and document-order preservation；
- exact execute/undo/redo；
- explicit transform-mode overlay/lifecycle；
- historical 264 Node / 32 Chromium regressions。

## Performance boundary

Runtime must measure at least `1 / 100 / 1,000` selected features and report generation, total preview preparation and memory. The design PR publishes no latency threshold.

## Clean-room boundary

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
code reuse: none
```
