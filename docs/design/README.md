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
| `professional-editing.md` | multi-selection、batch transaction、translation、box/lasso、rotation/scale、groups | 007 总设计已冻结；007A runtime 已在 PR #38 实现，007B–D 仍仅为设计方向 |

## 当前实现基线

```text
workspace:        0.0.21
symbols:          19 (14 Arrow + 1 Line + 4 Area)
Node:             219 passed on runtime head
Chromium:         30 passed on runtime head
Sources:          4
Layers:           10
007A PR:          #38
runtime head:     07449e7fda66069b148fa08c865b209d7dc365a3
runtime CI:       #398 / 30904843935
```

最终文档 head 必须重新运行完整 CI 后才能把 PR #38 标记 Ready。

## Circular family

```text
line.circular-arc@1.0.0
area.circular-segment@1.0.0
area.sector@1.0.0
```

`area.lune` 继续延期。详细语义见 `circular-arc-family.md`，数学与 provenance 见 `../algorithms/circular-arc-foundation.md`。

## Milestone 007 分片

```text
007A ordered selection + atomic Store + batch delete + local translation
007B box/lasso selection
007C rotation + positive uniform scale
007D canonical groups/locks/visibility/z-order after PlotJSON migration design
```

### 007A 已实现

Selection：

- transient engine-independent ordered `selectedIds`；
- final selected id is Primary；
- replace/add/subtract/toggle/clear/reconcile/restore；
- one immutable event per effective operation；
- Store remove/clear reconciliation；
- secondary lightweight overlay；
- only Primary authored handles and Definition guides；
- backward-compatible `selectedId` aliases；
- excluded from PlotJSON and feature revision。

Atomic transaction：

```text
stage add/replace/remove/order
→ validate complete staged state
→ any invalid: no mutation
→ commit once
→ one batch event
→ listener errors isolated after commit
```

`BatchEditCommand` stores exact before/after features, order and selection. Execute/undo/redo restore exact revisions and one explicit selection state.

Batch delete：

- one command removes all selected ids；
- after selection empty；
- undo restores exact feature order、membership and Primary；
- redo replays exact after-state。

Translation：

- one shared local projection and metre delta；
- transform authored controls only；
- parameters/style/metadata unchanged；
- Store unchanged during preview；
- all candidates Registry-preflighted before atomic commit；
- any invalid member prevents all mutation；
- Escape cancellation；
- one pointer gesture = one history entry。

MapLibre resources：

```text
Sources: committed / selection / draft / handles
Layers: committed fill-line-point, selection line-point,
        draft fill-line-point, handle guide, handle
```

Shift additive selection reserves and temporarily disables MapLibre box zoom; destroy restores prior state.

## Later slices

007B：

- default screen-space box/lasso intersection policy；
- candidate ids de-duplicated by `plotId` and ordered deterministically；
- simple lasso only, self-intersection fail closed；
- spatial index before scale claims。

007C：

- local-metre only；
- pivot from selection authored-control bounds；
- positive clockwise rotation；
- positive uniform scale `[0.01, 100]`；
- no reflection/non-uniform scale；
- atomic all-member preflight。

007D：

- group/lock/visibility/z-order cannot be hidden in free-form metadata；
- formal PlotJSON schema, migration and command semantics must precede runtime。

## Reference boundary

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Code reuse：`none`。只研究 observable selection lifecycle、whole-feature editing、mode separation、keyboard configuration 和 test organization。

详细事务算法见 `../algorithms/batch-edit-transaction.md`。

## 状态说明

历史设计文档保留设计当时状态，不应重写以伪造历史。当前事实由以下入口共同确定：

```text
main source
README.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/INTERACTION_MODEL.md
docs/handover/LATEST.md
latest active/merged PR
```
