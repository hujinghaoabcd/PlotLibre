# PlotLibre Design Notes

本目录保存公共符号或专业编辑能力在 runtime 实现前冻结的语义设计，以及多个相关功能共享状态或数学基础时的组设计。

设计文档应回答：

- public identifiers、versions 或 interaction modes；
- authored controls、selection state 或 transaction ownership；
- 顺序、交换、canonicalization 与 mutation 不变量；
- derived geometry、overlay 和 transient guide 边界；
- completion、validation、rollback 和 degenerate-input policy；
- PlotJSON/migration boundary；
- shared frame/state model 与独立 public semantics；
- clean-room references、licenses 和 code-reuse declaration；
- deterministic test plan and non-goals。

## 当前设计文档

| 文档 | 范围 | 当前状态 |
|---|---|---|
| `arrow-double-semantic-design.md` | 四控制双箭头 | 已实现，`arrow.double@1.0.0` |
| `arrow-pincer-semantic-design.md` | 五控制钳形箭头 | 已实现，`arrow.pincer@1.1.0` |
| `route-corridor-group.md` | route + flat-cap corridor | 已实现并合并 |
| `route-multihead-group.md` | bidirectional + derived secondary-head route | 已实现并合并 |
| `closed-action-area-group.md` | closed curve + gathering place | 已实现并合并 |
| `circular-arc-family.md` | circular arc + sector + circular segment | 已实现并合并 |
| `professional-editing.md` | 007 总体 selection/transaction/transform 分片 | 007A 已合并；007B–D 由独立设计继续冻结 |
| `box-lasso-selection.md` | 007B screen-space box/lasso selection | 当前设计冻结候选；runtime 禁止 |

## 当前合并基线

```text
main:             d08c56b6687ea64e0c599fd04fd77115d320d8f2
workspace:        0.0.21
symbols:          19 (14 Arrow + 1 Line + 4 Area)
Node:             219 passed
Chromium:         30 passed
Sources:          4
Layers:           10
007A runtime PR:  #38
007A docs PR:     #39
```

## Milestone 007 分片

```text
007A ordered selection + atomic Store + batch delete + local translation — merged
007B box/lasso selection — current design branch
007C rotation + positive uniform scale — deferred
007D groups/locks/visibility/z-order after PlotJSON migration design — deferred
```

## 007A merged foundation

- transient ordered `selectedIds` and final-id Primary；
- one immutable selection event per effective operation；
- atomic `PlotStore.applyTransaction()`；
- post-commit listener-error isolation；
- selection-aware `BatchEditCommand`；
- exact document-order undo；
- Primary-only authored handles and Definition guides；
- four Sources and ten Layers；
- batch delete and local-metre whole-selection translation；
- 219 Node and 30 actual Chromium tests。

## 007B frozen direction

Detailed contract: `box-lasso-selection.md`.

Core decisions：

```text
screen-space region capture
→ MapLibre rendered-index broad phase
→ exact projected Registry geometry narrow phase
→ Store-order candidate normalization
→ one SelectionController.applyMany event
```

Input and architecture：

- replace immediate Shift-mousedown mutation with one unified region adapter；
- neutral Shift-empty drag = additive box convenience；
- explicit one-shot box and lasso modes expose replace/add/toggle/subtract；
- box threshold = 4 CSS px；
- lasso sampling = 2 px；
- lasso RDP tolerance = 1.5 px；
- raw and simplified self-intersection both reject；
- region overlay uses DOM/SVG screen UI, not geographic GeoJSON；
- 4 Source / 10 Layer baseline remains unchanged；
- region selection changes no Store、History、revision or PlotJSON state。

Exact selection semantics：

- broad-phase query uses committed fill/line/point layers only；
- query return order and tile duplicates are ignored；
- candidate ids are ordered by Store/document order；
- exact predicates project generated fills、lines and points；
- labels、guides、drafts、selection overlay and CSS stroke/radius are excluded；
- Polygon holes are respected；
- any generation/projection/query failure rejects the whole completion；
- valid empty replace clears selection；other empty intents are no-op。

## 007B runtime implementation order

1. pure ScreenPoint、box、lasso and topology utilities；
2. `SelectionController.applyMany()` one-event semantics；
3. exact projected geometry predicates；
4. MapLibre broad-phase resolver and Store ordering；
5. unified region adapter replacing immediate Shift capture；
6. DOM/SVG overlay and pointer lifecycle；
7. public one-shot box/lasso API；
8. Playground controls、actual Chromium tests and benchmark report；
9. immutable implementation handover and current-head CI。

## Later slices

007C：local-metre rotation and positive uniform scale, deterministic authored-control pivot, no reflection/non-uniform scale, atomic all-member preflight。

007D：group/lock/visibility/z-order only after formal PlotJSON schema、migration and command semantics。Free-form metadata shortcuts are prohibited。

## Reference boundary

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

007B additionally studies Mapbox GL Draw's observable Shift-box lifecycle, DOM rectangle, dragPan ownership, bounding-box query and id de-duplication. Code reuse：`none`。

Algorithms：

```text
../algorithms/batch-edit-transaction.md
../algorithms/screen-region-selection.md
```

## 状态说明

历史设计文档保留设计时状态，不应重写以伪造历史。当前事实由以下入口共同确定：

```text
main source
README.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/INTERACTION_MODEL.md
docs/handover/LATEST.md
latest active/merged PR
```
