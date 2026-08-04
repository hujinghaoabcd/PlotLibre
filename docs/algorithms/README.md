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
| `batch-edit-transaction.md` | selection、Store transaction、batch commands、translation/transform | Milestone 007 design freeze candidate |

基础通用几何另见：

```text
../GEOMETRY_FOUNDATION.md
../ALGORITHM_POLICY.md
```

## Milestone 006J merge evidence

```text
workspace:          0.0.20
public symbols:     19
Node tests:         184 passed
Chromium tests:     28 passed
implementation PR: #34
finalization PR:   #35
final main SHA:    4ce59d189b65c8257bf49beabc308a4020249cd0
```

Circular geometry remains governed by `circular-arc-foundation.md` and its local-only、strict topology、authored-control and clean-room contracts。

## Milestone 007 transaction design

`batch-edit-transaction.md` freezes the first professional editing foundation：

### Selection representation

```text
ordered selectedIds
Set membership index
primaryId = final selected id
selection revision
```

Selection is transient and excluded from PlotJSON。Replace/add/subtract/toggle/reconcile operations emit one immutable event per effective change。

### Store transaction

```text
validate all add/replace/remove operations
→ build staged ordered feature Map
→ any error: no mutation
→ commit once
→ emit one batch event
```

No listener may observe a partial transaction。

### Listener failure isolation

Current single-command flow can mutate Store before a listener throws, leaving state changed without a history entry。007 design changes the contract：

- post-commit listener errors are collected；
- all listeners still run；
- errors are reported through `onListenerError`；
- they do not synchronously escape after commit；
- validation errors still throw before mutation；
- command history records the committed edit consistently。

### Ordered undo

Batch delete undo must restore original document order。The transaction design therefore needs an explicit ordered-id sequence or equivalent complete ordered state。Appending restored features is invalid because it changes rendering/z-order semantics。

### BatchEditCommand

Command captures exact before/after feature snapshots and selection snapshots：

```text
execute/redo:
  Store after transaction
  restore after selection

undo:
  Store inverse transaction
  restore before selection
```

Redo reuses exact after revisions and does not increment again。

### Translation

007A supports local-metre whole-object translation only：

- all selected authored controls share one projection and meter delta；
- parameters/style/metadata remain unchanged；
- every candidate is canonicalized/generated before commit；
- one invalid member rejects the complete batch；
- preview is transient；
- one gesture commits one command；
- zero movement commits nothing；
- Escape cancels。

### Later algorithms

- 007B：screen-space box/lasso intersection selection；
- 007C：local rotation and positive uniform scale around authored-control bounds center；
- 007D：canonical groups/locks/visibility/z-order after PlotJSON migration design。

## Clean-room references for 007

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Studied only for observable mode separation、selection lifecycle、keyboard configuration、whole-feature/direct editing and test organization。Code reuse：`none`。

## Required 007A fixture families

- selection ordering and primary fallback；
- batch transaction preconditions and no-partial-mutation；
- listener exception isolation；
- exact document-order restoration；
- mixed Definition translation；
- invalid one-member rollback；
- revision execute/undo/redo；
- selection overlay and primary handles；
- style reload recovery；
- one gesture / one history entry；
- 100/1,000/10,000 feature performance measurements；
- all existing 184 Node / 28 Chromium regressions。

No professional-editing runtime belongs on the documentation-only design branch。
