# PlotLibre Development Handover — Milestone 007A Post-Merge Finalization

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
Runtime PR：`#38 Add ordered selection and atomic batch editing`  
Runtime branch：`agent/007a-selection-batch-translation`  
Validated runtime head：`2d499a1cb122abbf6fce7548ec32f1b0031dd8f2`  
Validated CI：`#409 / 30906467230`  
Squash merge SHA / current main：`04dca0b120b1440afb49a300eeee92faf6644a7d`  
Finalization branch：`agent/007a-post-merge-finalization`  
Workspace：`0.0.21`  
Scope：documentation-only actual-merge synchronization；runtime prohibited

## Purpose

This immutable handover records the actual merged state of Milestone 007A after PR #38 completed its current-head validation, was marked Ready with zero unresolved review threads and was squash merged with an expected head SHA.

It replaces pre-merge candidate wording in current-state documentation without rewriting the historical 007A implementation handover.

## Actual merge evidence

```text
PR:                 #38
PR title:           Add ordered selection and atomic batch editing
base main:          780c719860e2371fb41fe9db83685157181420e2
final feature head: 2d499a1cb122abbf6fce7548ec32f1b0031dd8f2
CI run:             #409 / 30906467230
review threads:     0 unresolved
PR state:           Ready before merge
merge method:       Squash and merge
expected head SHA:  2d499a1cb122abbf6fce7548ec32f1b0031dd8f2
squash merge SHA:   04dca0b120b1440afb49a300eeee92faf6644a7d
```

## Merged runtime baseline

```text
workspace:          0.0.21
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         219
Chromium tests:     30
MapLibre Sources:   4
MapLibre Layers:    10
```

## Final validation evidence

```text
Node 20.19:         success
Node 22:            success
Node tests:         219 passed / 0 failed
Playground build:   success
handover contract:  success
Chromium tests:     30 passed / 0 failed
unresolved threads: 0
```

The 30 Chromium tests include real rendered-feature Shift selection, ordered multi-selection, whole-selection body translation, transient preview with unchanged Store, one-command commit, exact undo/redo, Escape rollback and batch Delete restoration of document order and Primary selection.

## Merged 007A capabilities

### Ordered selection

- engine-independent `SelectionController`；
- ordered unique `selectedIds`；
- final selected id is Primary；
- replace/add/subtract/toggle/clear/make-primary/restore/reconcile；
- immutable monotonic snapshots；
- Store remove/clear reconciliation；
- no-op emits no event；
- backward-compatible `select()` and `selectedId` aliases；
- selection excluded from PlotJSON and PlotFeature revision。

### Atomic Store and command history

- staged `PlotStore.applyTransaction()`；
- add/replace/remove/exact document ordering；
- no partial mutation；
- one batch Store event；
- post-commit listener exceptions isolated through `onListenerError`；
- exact-order `BatchEditCommand`；
- exact before/after feature values、revisions、order and selection；
- one explicit final selection restoration per execute/undo/redo。

### MapLibre integration

- independent `plotlibre-selection` source；
- selection line and point layers；
- four Sources and ten Layers；
- lightweight overlay for every selected object；
- authored handles and Definition guides only for Primary；
- plain、Shift、Ctrl/Cmd and Alt selection semantics；
- MapLibre box-zoom preservation/disable/restore lifecycle；
- style reload regeneration of all derived state。

### Batch delete

- `plot.removeSelected()`；
- Delete/Backspace and Playground batch action；
- one command and one Store transaction；
- undo restores exact feature values、document order、selected ids and Primary；
- redo restores exact after-state without revision drift。

### Local whole-selection translation

- one shared local coordinate analysis；
- one order-independent projection origin；
- one common metre delta for all authored controls；
- Store unchanged during preview；
- all candidates canonicalized/generated before commit；
- any invalid member rejects the complete batch；
- Escape cancellation；
- sub-threshold/zero movement no-op；
- authored-handle drag priority；
- dragPan restored after translation；
- parameters、style and metadata preserved。

## Documentation synchronized in finalization

The post-merge branch updates current-state wording in：

```text
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/PLAYGROUND.md
docs/INTERACTION_MODEL.md
docs/design/README.md
docs/algorithms/README.md
docs/handover/LATEST.md
```

The branch records：

- actual squash merge SHA；
- actual current `main`；
- final validated feature head and CI；
- merged 219/30 baseline；
- 007A completion status；
- 007B design as the next slice；
- branch cleanup limitation in the available connector。

No runtime、API、geometry、interaction、test-behavior or package-version change belongs in this finalization.

## Finalization validation gate

Before this documentation-only branch enters `main` it must independently pass the unchanged baseline on its exact current head：

```text
Node 20.19 success
Node 22 success
219 Node tests
Playground /PlotLibre/ build
handover contract
30 Chromium tests
zero unresolved review threads
```

The finalization PR remains Draft until these checks finish.

## Next milestone

After finalization merges, create Milestone 007B design work from the latest `main`.

007B must freeze before runtime：

```text
box gesture ownership
screen-space rectangle representation
intersection policy
candidate source/layer set
plotId de-duplication
Store-order deterministic results
empty-result and Primary behavior
lasso closure and simple-ring validation
self-intersection failure policy
transient overlay ownership
spatial-index boundary and benchmark protocol
```

Do not mix rotation/scale、groups/locks、snapping、new symbols or unrelated runtime into 007B.

## Risks and decisions

- selection remains transient and excluded from PlotJSON；
- only Primary exposes authored handles/guides；
- batch operations remain all-or-nothing；
- exact document order is part of undo correctness；
- listener failures after commit are isolated rather than rolled back；
- whole-object translation remains local-metre only；
- generated vertices are never the transform source；
- performance at 100/1,000/10,000 features remains an uncompleted measured benchmark task；
- packages remain `UNLICENSED`；
- workspace/package versions remain uncoordinated；
- production bundle still needs code splitting；
- source/build/deploy/live verification remain distinct；
- the currently available connector does not expose feature-branch deletion, so manual cleanup may be required。

Continuation：merge this documentation-only finalization after exact current-head validation, then begin 007B design from final `main`。
