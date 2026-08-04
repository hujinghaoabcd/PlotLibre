# PlotLibre Algorithm Records

本目录记录参数化符号、共享几何基础以及专业编辑事务的独立算法说明、来源边界、失败策略与测试要求。

每份记录至少包含：

```text
public Definition / state model / shared algorithm
canonical authored state
mathematical or transaction construction
coordinate-mode policy
derived/transient boundary
parameter or operation contract
failure and rollback policy
clean-room references and revisions
license review
code reuse declaration
tests and deterministic fixtures
```

目录中的公式和行为说明用于解释 PlotLibre 的独立实现，不代表允许复制参考项目源码。通用政策见 `../ALGORITHM_POLICY.md`。

## 当前算法记录

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
| `circular-arc-foundation.md` | circular arc/segment/sector shared frame | 已实现并合并 |
| `batch-edit-transaction.md` | selection、Store transaction、batch commands、translation/transform | 007A transaction/translation 已实现并通过 PR #38 合并；007B–D 待后续设计 |

## 当前合并基线

```text
workspace:          0.0.21
public symbols:     19
Node tests:         219 passed
Chromium tests:     30 passed
MapLibre Sources:   4
MapLibre Layers:    10
merged PR:          #38
validated head:     2d499a1cb122abbf6fce7548ec32f1b0031dd8f2
validated CI:       #409 / 30906467230
squash SHA:         04dca0b120b1440afb49a300eeee92faf6644a7d
```

## 007A transaction implementation

### Selection representation

```text
ordered selectedIds
Set membership index
primaryId = final selected id
monotonic interaction revision
```

Selection is transient and excluded from PlotJSON。Replace/add/subtract/toggle/reconcile/restore 每次有效变化只发一个 immutable event；no-op 不发 event。

### Store transaction

```text
validate add/replace/remove id sets
→ clone current ordered feature Map
→ stage every operation
→ validate optional exact orderedIds
→ any error: no mutation and no event
→ commit once
→ emit one batch event
```

No listener observes partial state。

### Listener failure isolation

- validation errors throw before mutation；
- post-commit listener errors are collected；
- all listeners still run；
- errors are reported through `onListenerError`；
- they do not synchronously escape after commit；
- CommandHistory records the committed edit consistently。

### Ordered undo and BatchEditCommand

Batch delete undo restores original document order through exact ordered ids。Appending restored features is invalid because it changes rendering/z-order semantics。

The command captures exact before/after feature values, document order and selection snapshots. Execute/redo uses exact after-state; undo uses exact before-state. Redo reuses stored revisions. Selection reconciliation is suspended during Store mutation and followed by one explicit final restore。

### Translation

007A local-metre whole-selection translation：

- all selected authored controls share one coordinate analysis, projection and metre delta；
- projection origin is order-independent；
- parameters/style/metadata remain unchanged；
- Store remains unchanged during transient preview；
- every candidate is canonicalized/generated before commit；
- one invalid member rejects the complete batch；
- Escape cancels；
- zero/sub-threshold movement commits nothing；
- one pointer gesture commits one command；
- active handle drag has priority；
- dragPan is disabled only during active translation。

### MapLibre selection overlay

```text
plotlibre-selection source
plotlibre-selection-line layer
plotlibre-selection-point layer
```

Polygon becomes boundary highlight, LineString remains line and Point remains point。Only Primary exposes semantic handles/guides。Style reload regenerates transient resources from canonical state。

### Shift and box zoom

MapLibre box zoom conflicts with Shift additive selection。PlotLibre records and disables box zoom during its lifecycle, handles Shift through the MapLibre `mousedown` path, and restores the previous state on destroy。

## Implemented fixture families

- selection ordering, modifier intents and Primary fallback；
- immutable snapshots, no-op and Store reconciliation；
- transaction preconditions and no-partial-mutation；
- listener exception isolation；
- exact document-order restoration；
- batch delete execute/undo/redo；
- local translation common metre delta；
- invalid one-member atomic rejection；
- exact revision replay；
- selection overlay and Primary handles；
- style reload recovery；
- Shift/box-zoom lifecycle；
- real MapLibre body drag、Escape and Delete flows；
- all historical 219 Node / 30 Chromium regressions。

Performance measurements at 100/1,000/10,000 features remain a separate measured benchmark task and must not be claimed from functional tests alone。

## Next algorithm design: 007B

Freeze before runtime：

- box gesture and screen-space rectangle；
- default intersection policy；
- candidate layer/source set；
- `plotId` de-duplication；
- deterministic Store/document ordering；
- empty-result and Primary policy；
- lasso closure and simple-ring validation；
- self-intersection fail closed；
- simplification and tolerance boundary；
- spatial-index ownership and invalidation；
- benchmark hardware、browser、feature mix and viewport reporting。

007B must not include rotation/scale、groups/locks、snapping or new symbols。

## Later algorithms

- 007C：local rotation and positive uniform scale around authored-control bounds center；
- 007D：canonical groups/locks/visibility/z-order after PlotJSON migration design。

## Clean-room references for 007

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Studied only for observable mode separation、selection lifecycle、keyboard configuration、whole-feature/direct editing and test organization。Code reuse：`none`。
