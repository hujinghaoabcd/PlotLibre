# PlotLibre Development Handover — Milestone 007A Selection, Atomic Batch Editing and Translation

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
分支：`agent/007a-selection-batch-translation`  
Pull Request：`#38 Add selection and atomic batch editing foundation`  
Base main：`780c719860e2371fb41fe9db83685157181420e2`  
Workspace：`0.0.21`  
状态：007A runtime 已实现；运行时 head 已完整验证；版本、权威文档与交接正在同一 Draft PR 收尾

## Purpose

Milestone 007A establishes the first professional-editing runtime slice without introducing box/lasso, rotation/scale, groups, locks, visibility, z-order, snapping or new public symbols.

The slice implements:

```text
ordered transient multi-selection
Primary selection semantics
atomic PlotStore transaction
post-commit listener failure isolation
selection-aware BatchEditCommand
selection overlays
atomic batch delete
local-metre whole-selection translation
real MapLibre/Playground integration
```

## Canonical boundary

Canonical document data remains:

```text
plotType
controlPoints
parameters
style
metadata
revision
```

The following remain transient/derived and never enter PlotJSON:

```text
selectedIds
Primary id
selection revision
selection overlays
translation preview
semantic guides
MapLibre source/layer features
```

Whole-object editing transforms authored controls, never generated Polygon or LineString vertices.

## SelectionController

Implemented in `@plotlibre/interaction`.

Snapshot:

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

Implemented operations:

```text
replace
add
subtract
toggle
clear
make-primary
store-reconcile
history-restore
snapshot
subscribe
destroy
applyIntent
```

Frozen invariants:

- ids are unique existing Store ids；
- order is acquisition order；
- Primary is the final selected id；
- empty selection has no Primary；
- one effective operation emits one immutable event；
- no-op emits nothing；
- Store removal/clear reconciles surviving ids once；
- historical selection restoration keeps membership/order/Primary but allocates a fresh monotonic interaction revision；
- selection never increments PlotFeature revision。

Backward compatibility remains:

```text
plot.select(id | undefined)
plot.selectedId
interaction.select(id | undefined)
interaction.selectedId
```

Complete ordered selection is available through `selectedIds`.

## PlotStore atomic transaction

`PlotStore.applyTransaction()` stages:

```text
add
replace
remove
optional exact orderedIds
```

Algorithm:

```text
validate duplicate/cross-operation ids
→ clone current ordered Map
→ apply all staged removals/replacements/additions
→ validate exact final ordering
→ any error: discard stage, no mutation, no event
→ commit once
→ one batch event
```

Existing single-operation Store APIs remain compatible.

Exact `orderedIds` enables batch-delete undo to restore the original document/render order rather than append restored features.

## Listener failure isolation

Post-commit listener errors cannot safely roll back state after another listener has observed the commit.

Implemented policy:

- validation/precondition errors throw before commit；
- every listener runs after commit；
- listener exceptions are collected；
- errors are reported through `onListenerError`；
- they do not synchronously escape the committed transaction；
- CommandHistory records the committed command；
- renderer can recover through explicit render or style reload。

This closes the previous risk of changed Store state without a History entry.

## BatchEditCommand

The engine-independent command stores exact:

```text
before features
after features
before document order
after document order
before selection
after selection
label
```

Execute/redo applies the exact after-state and after-selection. Undo applies the exact before-state and before-selection. Revisions are replayed exactly; redo does not increment them again.

During Store transaction, automatic selection reconciliation is suspended. One explicit final selection restoration follows, so execute/undo/redo do not publish intermediate removal states.

## MapLibre selection integration

Input semantics:

```text
plain click       replace / make-primary
Shift + click     add
Ctrl/Cmd + click  toggle
Alt + click       subtract
empty plain click clear
```

MapLibre box zoom conflicts with Shift. PlotLibre records the previous box-zoom state, disables it during the PlotLibre lifecycle, handles Shift additive selection through the MapLibre `mousedown` path and restores the previous state on destroy.

Only Primary exposes authored handles and Definition semantic guides.

MapLibre resources after 007A:

```text
Sources: 4
  plotlibre-committed
  plotlibre-selection
  plotlibre-draft
  plotlibre-handles

Layers: 10
  plotlibre-fill
  plotlibre-line
  plotlibre-point
  plotlibre-selection-line
  plotlibre-selection-point
  plotlibre-draft-fill
  plotlibre-draft-line
  plotlibre-draft-point
  plotlibre-handle-guide
  plotlibre-handle
```

Selection overlay conversion:

- Polygon → boundary highlight；
- LineString → line highlight；
- Point → point highlight；
- compound generated output de-duplicated；
- Primary expressed only as transient derived property。

Style reload reconstructs committed geometry, selection overlays, drafts, Primary handles and guides.

## Batch delete

Delete/Backspace and `plot.removeSelected()` share one command path:

```text
capture exact selected features/order/selection
→ one BatchEditCommand
→ one atomic remove transaction
→ after selection empty
→ one History entry
```

Undo restores exact feature values, document order, ordered selected ids and Primary. Redo restores exact after-state.

## Local whole-selection translation

Implemented in interaction + MapLibre adapter.

Algorithm:

```text
pointer down on selected body
→ capture exact selected features and selection
→ collect all authored controls
→ analyze one shared local coordinate frame
→ derive one order-independent projection origin
→ project pointer start/current into metres
→ one common metre delta
→ apply delta to every authored control
→ candidate revision = original + 1
→ canonicalize/generate every candidate
→ render transient selection preview
→ pointer up commits one BatchEditCommand
```

Guarantees:

- Store remains unchanged during preview；
- all selected members use one projection and one metre vector；
- parameters/style/metadata remain unchanged；
- any missing, non-finite, high-latitude, antimeridian, large-extent or generation-invalid member rejects the complete batch；
- Escape cancels all preview state；
- zero/sub-threshold movement is a no-op/click；
- dragPan is disabled only during active translation and restored afterward；
- authored handle drag has priority；
- one completed gesture creates one History entry。

## Playground

Playground now exposes:

- selection count and Primary；
- Primary-only style editing；
- modifier instructions；
- atomic batch-delete action；
- selected-body translation preview/commit；
- Escape and rejection feedback；
- public API access used by real Chromium integration tests。

Version badge and root workspace are `0.0.21`.

## Tests added

New Node coverage includes:

- selection snapshots, ordering, Primary fallback and intents；
- no-op/event/reconciliation/destroy behavior；
- transaction preconditions and no partial mutation；
- exact ordering and one batch event；
- listener failure isolation；
- BatchEditCommand execute/undo/redo；
- batch delete and exact restoration；
- local translation projection, common delta and invalid input；
- MapLibre multi-selection and overlays；
- Shift/box-zoom lifecycle；
- translation preview, commit, cancellation and atomic rejection。

New real Chromium coverage includes:

- plain + Shift rendered-feature selection；
- whole-selection body translation；
- Store unchanged during preview；
- one-command commit；
- exact undo/redo；
- Escape rollback；
- Delete all selected；
- undo document order and Primary restoration。

## Runtime validation evidence

```text
runtime head:       07449e7fda66069b148fa08c865b209d7dc365a3
GitHub Actions:     #398 / 30904843935
Node 20.19:         success
Node 22:            success
Node tests:         219 passed / 0 failed
Playground build:   success
handover contract:  success
Chromium tests:     30 passed / 0 failed
```

This evidence applies to the runtime head above. Subsequent version/documentation commits require a new full current-head run before Ready or merge.

## Files and packages affected

Runtime implementation spans:

```text
packages/core/src/store.ts
packages/interaction/src/selection-controller.ts
packages/interaction/src/batch-edit-command.ts
packages/interaction/src/local-translation.ts
packages/maplibre/src/renderer.ts
packages/maplibre/src/interaction.ts
packages/maplibre/src/selection-translation.ts
packages/maplibre/src/selection-modifier-capture.ts
packages/maplibre/src/plotlibre.ts
apps/playground/src/playground-app.ts
apps/playground/e2e/selection-editing.spec.ts
new Node test files under tests/
```

Documentation synchronization includes README, AGENTS, development plan, Playground, interaction model, design/algorithm indices and handover files.

## Non-goals preserved

Not implemented in 007A:

- box or lasso selection；
- rotation or scale；
- groups, locks, visibility or z-order；
- snapping or constraints；
- new plot symbols；
- geodesic whole-selection translation；
- formal large-document performance guarantee。

## Remaining before merge

1. finish all authority-document synchronization；
2. update `docs/handover/LATEST.md`；
3. update PR #38 body；
4. run full CI on exact final head；
5. confirm zero unresolved review threads；
6. mark PR Ready；
7. Squash and merge with exact expected head SHA；
8. delete branch if connector capability permits；
9. if needed, create a documentation-only finalization PR from new main to record actual squash SHA and live deployment state。

## Next milestone

After 007A is merged and finalized, start 007B design from the latest `main`:

```text
screen-space box selection
simple lasso selection
plotId de-duplication
Store-order deterministic results
spatial index before scale claims
```

Do not mix rotation/scale, groups/locks, snapping or new symbols into 007B.
