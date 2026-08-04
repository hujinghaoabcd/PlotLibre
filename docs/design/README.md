# PlotLibre Design Notes

本目录保存公共符号或专业编辑能力在 runtime 前冻结的语义设计。设计文档必须说明 authored state、derived boundary、数学、交互所有权、失败原子性、测试、性能边界和非目标。

## Current records

| 文档 | 范围 | 状态 |
|---|---|---|
| `arrow-double-semantic-design.md` | 四控制双箭头 | 已实现 |
| `arrow-pincer-semantic-design.md` | 五控制钳形箭头 | 已实现 |
| `route-corridor-group.md` | route + corridor | 已实现 |
| `route-multihead-group.md` | bidirectional + double-head route | 已实现 |
| `closed-action-area-group.md` | closed curve + gathering place | 已实现 |
| `circular-arc-family.md` | circular arc + segment + sector | 已实现 |
| `professional-editing.md` | 007 总体分片 | 007A/B 已实现；历史总体设计 |
| `box-lasso-selection.md` | 007B screen-region selection | 已实现并合并 |
| `rotation-uniform-scale.md` | 007C shared-pivot rotation + positive uniform scale | 当前 design freeze candidate |

## Current baseline

```text
main:               349a09160ac2e17883e2270123d371c164ef28c2
workspace:          0.0.22
public symbols:     19
Node tests:         264
Chromium tests:     32
Sources/Layers:     4 / 10
benchmark job:      required in CI
007B-P:             merged through PR #45/#46
current branch:     agent/007c-rotation-scale-design
runtime on branch:  prohibited
```

## 007C summary

Authoritative design：`rotation-uniform-scale.md`.

```text
selected authored controls
→ one order-independent local-metre frame
→ AABB-center fixed pivot
→ clockwise rotation or positive uniform scale
→ canonicalize + Registry.generate every member
→ one transient complete preview
→ one BatchEditCommand
```

Frozen boundaries：

- rotation and positive uniform scale only；
- local-metre only；
- scale `[0.01,100]`；
- no reflection/non-uniform scale/skew/snapping；
- parameters/style/metadata unchanged；
- absolute ground parameter caps may prevent strict derived similarity；
- explicit one-shot modes and DOM/SVG handles；
- no new MapLibre Source/Layer；
- selection/order/Primary preserved；
- all-member fail-closed preflight and exact undo/redo；
- runtime deferred to a separate branch after design merge/finalization。

Algorithms：

```text
../algorithms/batch-edit-transaction.md
../algorithms/screen-region-selection.md
../algorithms/selection-local-transform.md
```

## Reference boundary

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
code reuse: none
```

Historical records preserve their original state. Current truth is determined by source, AGENTS, development/interaction docs, `handover/LATEST.md` and current PR evidence.
