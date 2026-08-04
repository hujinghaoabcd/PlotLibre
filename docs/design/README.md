# PlotLibre Design Notes

本目录保存公共符号或专业编辑能力在 runtime 实现前冻结的语义设计，以及多个相关功能共享状态或数学基础时的组设计。

设计文档应回答 public identifiers/modes、authored state、ordering/canonicalization、derived boundary、validation/rollback、PlotJSON migration、clean-room provenance、tests and non-goals。

## 当前设计文档

| 文档 | 范围 | 当前状态 |
|---|---|---|
| `arrow-double-semantic-design.md` | 四控制双箭头 | 已实现，`arrow.double@1.0.0` |
| `arrow-pincer-semantic-design.md` | 五控制钳形箭头 | 已实现，`arrow.pincer@1.1.0` |
| `route-corridor-group.md` | route + flat-cap corridor | 已实现并合并 |
| `route-multihead-group.md` | bidirectional + derived secondary-head route | 已实现并合并 |
| `closed-action-area-group.md` | closed curve + gathering place | 已实现并合并 |
| `circular-arc-family.md` | circular arc + sector + circular segment | 已实现并合并 |
| `professional-editing.md` | 007 总体 selection/transaction/transform 分片 | 007A 已实现；007B–D 分片推进 |
| `box-lasso-selection.md` | 007B screen-space box/lasso selection | 设计已通过 PR #40 合并；runtime 下一步 |

## 当前基线

```text
main:             a9b9efc090c01f45133f3f136a0049a97ee52b90
workspace:        0.0.21
symbols:          19 (14 Arrow + 1 Line + 4 Area)
Node:             219 passed
Chromium:         30 passed
Sources/Layers:   4 / 10
007A PRs:         #38 / #39
007B design PR:   #40
007B design head: 4a8ee1102bb923801ada95c648a258225ccb9ec4
007B design CI:   #413 / 30912109618
```

## Milestone 007 status

```text
007A ordered selection + atomic Store + batch delete + local translation — merged
007B box/lasso design — merged; runtime next
007C rotation + positive uniform scale — deferred
007D groups/locks/visibility/z-order after PlotJSON migration design — deferred
```

## 007B merged design summary

Authoritative design：`box-lasso-selection.md`.

```text
screen region
→ MapLibre committed-layer broad query
→ plotId dedup
→ Store-order normalization
→ Registry-generated screen geometry
→ exact intersection
→ one SelectionController.applyMany event
```

Frozen input：

- current immediate Shift-mousedown add must be replaced；
- neutral `Shift + empty drag` = additive box；
- explicit one-shot box/lasso modes = default replace；
- explicit modes support add/toggle/subtract overrides；
- box threshold `4 CSS px`；
- lasso spacing `2 px`、minimum `3` points/`16 px²`、RDP `1.5 px`；
- raw and simplified self-intersection both reject；
- touch deferred。

Frozen hit semantics：

- MapLibre query is broad phase only；
- committed fill/line/point layers only；
- Store order determines result order；
- exact Point/Line/Polygon/Multi/compound intersection；
- Polygon holes respected；
- CSS stroke/radius、selection、draft、guide and label geometry ignored；
- query/generation/projection failure rejects whole completion；
- partial selection prohibited。

Frozen presentation/lifecycle：

- DOM/SVG screen overlay；
- no new Source/Layer；
- 4/10 baseline retained；
- cancel on pointer/camera/style/resize/Store/selection/programmatic lifecycle changes；
- restore dragPan、boxZoom and pointer capture exactly once；
- region selection remains outside Store、History and PlotJSON。

## Runtime implementation order

After post-merge finalization, create：

```text
agent/007b-box-lasso-selection
```

Then：

1. pure screen/RDP/topology utilities；
2. `SelectionController.applyMany()`；
3. exact projected predicates；
4. MapLibre candidate resolver；
5. unified region adapter；
6. DOM/SVG overlay；
7. public one-shot API；
8. Playground、Chromium and benchmark report；
9. immutable handover and merge。

## Reference boundary

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
code reuse: none
```

Algorithms：

```text
../algorithms/batch-edit-transaction.md
../algorithms/screen-region-selection.md
```

Historical design documents preserve their original state. Current truth is determined by source, README, AGENTS, development/interaction docs, `handover/LATEST.md` and the latest PRs.
