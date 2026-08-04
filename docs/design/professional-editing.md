# Professional Editing Semantic Design

Milestone 007 introduces professional object editing without abandoning PlotLibre's canonical authored-control model. The milestone is staged so multi-selection and atomic translation can land before box/lasso selection, rotation/scale and canonical groups.

Status: design freeze candidate only. No runtime implementation belongs on `agent/007-professional-editing-design`.

## 1. Product invariant

Professional editing operates on semantic features:

```text
PlotDefinition
+ authored controlPoints
+ parameters
+ style
+ metadata
```

It must never edit generated LineString/Polygon vertices as canonical data.

A gesture may render derived overlays, bounds, transform handles, preview geometry and guides, but completion creates one semantic transaction over authored features.

## 2. Staged implementation scope

### Milestone 007A — selection, atomic batch commands and translation

Implement first:

- engine-independent multi-selection state;
- primary selection;
- click replace/add/subtract/toggle behavior;
- batch delete;
- local-metre whole-object translation;
- atomic batch Store mutation;
- one gesture / one history entry;
- multi-selection overlays and one primary feature's semantic handles;
- structured transform rejection;
- style reload recovery;
- Node and actual-rendered Chromium coverage.

### Milestone 007B — box and lasso selection

Implement only after 007A is merged:

- screen-space rectangle selection;
- intersection policy and modifier behavior;
- lasso capture and validation;
- spatial candidate indexing;
- large-document performance fixtures.

### Milestone 007C — rotation and uniform scale

Implement only after 007B design/validation:

- deterministic pivot;
- local-metre rotation;
- positive uniform scale;
- Definition parameter-transform hook when required;
- transform handles and guides;
- batch preflight and rollback.

### Milestone 007D — groups, locks, visibility and z-order

Canonical group/lock/z-order implementation is deferred until a formal PlotJSON schema and migration plan exist. Milestone 007 may design these fields, but it must not smuggle them into arbitrary feature metadata.

## 3. Existing architecture constraints

The merged baseline has:

```text
MapLibre interaction: one selectedId
PlotStore: one mutation per add/update/remove/clear
PlotStore event: one type + ids
Commands: single create/delete/replace
CommandHistory: command.execute() then push
Renderer: primary authored handles only
```

Current failure risk:

```text
Store mutates
→ synchronous listener throws
→ command.execute throws
→ history does not push
→ state changed without an undo entry
```

Milestone 007 must correct this before batch editing.

## 4. Selection state

Selection is transient interaction state, not PlotJSON or document canonical state.

Proposed model:

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

Invariants:

1. `selectedIds` contains unique existing feature ids;
2. order is acquisition order;
3. `primaryId`, when present, is the final id in `selectedIds`;
4. an empty selection has no `primaryId`;
5. selection revision increases once per effective selection change;
6. programmatic inputs are deduplicated by first occurrence;
7. selection never changes PlotFeature revision;
8. selection is excluded from PlotJSON export/import;
9. selection change emits one immutable before/after event;
10. Store reconciliation preserves surviving order.

Proposed event:

```ts
interface SelectionChange {
  readonly before: SelectionSnapshot;
  readonly after: SelectionSnapshot;
  readonly reason:
    | "replace"
    | "add"
    | "subtract"
    | "toggle"
    | "primary"
    | "clear"
    | "store-reconcile"
    | "history-execute"
    | "history-undo"
    | "history-redo";
}
```

## 5. Selection operations

### Replace

```text
select(id)
→ selectedIds = [id]
→ primaryId = id
```

Clicking empty space without modifiers clears selection.

### Additive

```text
Shift + click unselected id
→ append id
→ primaryId = id
```

Shift-clicking an already selected id keeps the set and makes it primary.

### Toggle

```text
Ctrl/Cmd + click
→ selected: remove id
→ unselected: append id and make primary
```

When removing the primary, the previous final surviving id becomes primary.

### Subtractive

```text
Alt + click selected id
→ remove id
```

Alt-clicking an unselected id has no effect.

### Programmatic API candidate

```ts
selection.replace(ids, primaryId?)
selection.add(ids)
selection.subtract(ids)
selection.toggle(id)
selection.clear()
selection.makePrimary(id)
selection.snapshot()
selection.subscribe(listener)
```

Every operation validates ids against Store before state mutation.

## 6. Primary selection and overlays

Multi-selection must not expose every authored handle simultaneously.

Rules:

- all selected features receive a lightweight selection overlay;
- only the primary feature receives authored control handles and Definition semantic guides;
- clicking an already selected feature without a modifier changes primary without discarding the set;
- handle hit testing has priority over whole-object drag;
- transform overlay is transient and engine-specific;
- selection overlay does not enter Store, History, PlotJSON or committed Definition RenderBundles.

MapLibre implementation candidate:

```text
plotlibre-selection source
plotlibre-selection-line layer
plotlibre-selection-point layer
plotlibre-transform-guide layer
```

The selection source contains derived overlay features keyed by `plotId`. Compound render outputs are deduplicated semantically.

## 7. Store reconciliation

SelectionController subscribes to PlotStore changes.

- removed ids are removed from selection;
- `clear` empties selection once;
- replacements preserve selected ids;
- additions do not auto-select unless an initiating edit command specifies an after-selection snapshot;
- undo that restores deleted features restores selection only through a selection-aware edit command, not through Store reconciliation alone;
- reconciliation emits at most one selection event per Store transaction.

## 8. Atomic Store transaction

Proposed Core API:

```ts
interface PlotStoreTransaction {
  readonly add?: readonly PlotFeature[];
  readonly replace?: readonly PlotFeature[];
  readonly remove?: readonly string[];
}

interface PlotStoreBatchChange {
  readonly type: "batch";
  readonly ids: readonly string[];
  readonly addedIds: readonly string[];
  readonly updatedIds: readonly string[];
  readonly removedIds: readonly string[];
}

PlotStore.applyTransaction(transaction): PlotStoreBatchChange
```

Preconditions are checked against a staged Map before mutation:

- duplicate operation ids rejected;
- added ids must not exist;
- replaced/removed ids must exist;
- a feature id cannot appear in multiple operation categories;
- all inputs cloned before commit;
- transaction with no effective changes is a no-op.

Commit contract:

```text
validate transaction shape
→ clone current feature map
→ apply all operations to staged map
→ no error: replace Store state once
→ emit one batch event
```

No observer may see a partially applied transaction.

## 9. Store listener error policy

Listener exceptions cannot safely roll back after other listeners have observed the commit. Therefore:

1. Store mutation remains committed after notification begins;
2. all listeners are invoked even if one fails;
3. listener errors are collected and reported through a configured error handler;
4. listener errors do not cause command execution to appear failed;
5. renderer recovery remains possible through explicit `render()` or style reload;
6. mutation validation errors still throw before commit.

This prevents the existing state/history divergence where Store changes but CommandHistory does not record the command.

Proposed option:

```ts
interface PlotStoreOptions {
  readonly onListenerError?: (
    errors: readonly unknown[],
    change: PlotStoreChange,
  ) => void;
}
```

Default behavior may report asynchronously or to `console.error`, but must not throw across the transaction boundary.

## 10. Batch edit command

Engine-independent interaction package candidate:

```ts
class BatchEditCommand implements Command {
  readonly label: string;
  readonly beforeFeatures: readonly PlotFeature[];
  readonly afterFeatures: readonly PlotFeature[];
  readonly beforeSelection: SelectionSnapshot;
  readonly afterSelection: SelectionSnapshot;
}
```

Execution:

```text
Store.applyTransaction(after state)
→ SelectionController.restore(afterSelection)
```

Undo:

```text
Store.applyTransaction(before state)
→ SelectionController.restore(beforeSelection)
```

Redo executes the exact stored after-state. It must not increment revisions again.

One command may represent:

- batch replace/translation;
- batch delete;
- future rotation/scale;
- future group metadata changes.

## 11. Revision contract

For one committed batch transform:

- each changed feature revision increases exactly once;
- unchanged features are not included in replace operations;
- preview features may use provisional revisions but never enter Store;
- undo restores exact before revisions;
- redo restores exact after revisions;
- repeated redo does not increase revisions further.

## 12. Whole-object translation

Milestone 007A supports local-metre translation only.

Input:

```text
selected features
pointer-down geographic position
pointer-current geographic position
```

Selection-level authored controls are analyzed together. Translation is rejected before drag begins when:

- controls cross the antimeridian;
- maximum absolute latitude exceeds local policy;
- total authored-control extent exceeds local policy;
- any selected feature is unavailable or future-locked;
- no selected feature is movable.

Algorithm:

```text
derive order-independent selection projection origin
project pointer-down and pointer-current
meter delta = current - down
add same delta to every authored control
preserve parameters/style/metadata
set each changed revision = original + 1
canonicalize and Registry.generate every preview feature
all valid: render batch preview
any invalid: keep last-valid preview + structured rejection
pointer-up with valid movement: one BatchEditCommand
```

Translation does not change Definition parameters.

### Drag arbitration

Priority:

1. authored handle drag;
2. transform handle drag;
3. selected-object translation;
4. selection click;
5. camera drag.

A whole-object drag begins only after a 4 CSS-pixel threshold. Before the threshold, the gesture remains a click.

During translation:

- MapLibre dragPan is disabled;
- pointer capture is used when available;
- all selected features preview together;
- primary and selection overlays move with the preview;
- Escape cancels without Store/History mutation;
- pointer-up commits one history entry;
- zero effective movement commits nothing.

## 13. Translation rejection

Proposed interaction state:

```ts
interface TransformRejection {
  readonly code: string;
  readonly message: string;
  readonly featureIds: readonly string[];
}
```

Stable initial codes:

```text
TRANSFORM_SELECTION_EMPTY
TRANSFORM_FEATURE_MISSING
TRANSFORM_FEATURE_LOCKED
TRANSFORM_UNSUPPORTED_COORDINATE_MODE
TRANSFORM_CANDIDATE_GENERATION_FAILED
TRANSFORM_TRANSACTION_INVALID
```

A rejected preview never enters Store or History. Pointer movement can replace the rejection with a valid preview.

## 14. Batch delete and undo

Delete key with an active draw or control drag retains its existing local meaning. Otherwise:

```text
selected unlocked ids
→ preflight batch removal
→ one BatchEditCommand
→ Store batch remove
→ afterSelection = empty
```

Undo restores all deleted features and the exact previous selection/primary state. Redo removes them and clears selection again.

## 15. Box selection design boundary

Milestone 007B default policy:

```text
intersection selection
```

MapLibre adapter obtains candidate `plotId`s from a screen rectangle over committed interactive layers. Candidates are:

- deduplicated by `plotId`;
- filtered to existing selectable Store features;
- ordered by Store/document order, not renderer return order;
- combined with current selection according to modifiers.

`contain` selection is deferred until precise screen-projected derived-geometry containment is implemented. It must not be approximated by bounding-box containment.

Box gesture:

- Shift + pointer drag on empty map starts box select;
- minimum 4 CSS-pixel rectangle;
- camera box zoom conflict is explicitly disabled during the gesture;
- rectangle overlay is transient;
- selection changes once on pointer-up, not continuously by default.

## 16. Lasso design boundary

Milestone 007B lasso is screen-space and explicit, not inferred from ordinary map drag.

Initial policy:

- dedicated lasso mode or toolbar action;
- at least three distinct screen points;
- path simplification uses a documented pixel tolerance;
- lasso polygon must be simple;
- self-intersecting lasso retains last-valid guide and rejects completion;
- default hit policy is intersection;
- candidates are deduplicated and ordered by Store order;
- one completed lasso emits one selection event;
- lasso path is never persisted.

## 17. Rotation and scale design boundary

Milestone 007C is local-metre only.

Default pivot:

```text
center of the selection-level authored-control bounding box
```

The pivot is derived in one order-independent local projection and is not persisted.

### Rotation

- positive angle is clockwise in screen/user convention;
- internal local Cartesian formula is documented explicitly;
- angle normalized to `(-180°, 180°]` for preview reporting;
- all authored controls rotate around the same pivot;
- parameters remain unchanged unless a Definition opts into a future parameter-transform hook.

### Scale

Initial implementation supports positive uniform scale only:

```text
0.01 <= scaleFactor <= 100
```

- no negative scale/reflection;
- no non-uniform scale;
- all authored controls scale around the same pivot;
- screen-size style values remain unchanged;
- ground-size Definition parameters remain unchanged by default;
- Definitions requiring semantic parameter scaling must explicitly opt into a future pure hook.

Candidate future hook:

```ts
transformParameters?(context): Readonly<Record<string, JsonValue>>
```

It must be pure, deterministic, versioned and tested. Hidden parameter heuristics are prohibited.

## 18. Groups, locks, visibility and z-order

These properties are canonical document concerns and cannot be stored casually in free-form metadata.

Design candidate for a future PlotJSON version:

```ts
interface PlotDocumentObjectState {
  readonly groupId?: string;
  readonly locked?: boolean;
  readonly visible?: boolean;
  readonly zIndex?: number;
}
```

Before implementation, freeze:

- stable group identifiers;
- nested-group policy;
- group deletion and ungroup semantics;
- lock behavior for selection, style, handles, delete and transforms;
- visibility and hit-testing behavior;
- global versus layer/group z-order;
- migration from PlotJSON 1.0;
- unresolved group references on import.

Milestone 007A–C must not add these fields to PlotJSON 1.0.

## 19. Programmatic API candidate

Backward compatibility is preserved:

```ts
plot.select(id | undefined)
plot.interaction.selectedId
```

They remain aliases for single-selection behavior and primary selection.

New API candidate:

```ts
plot.selectMany(ids, options?)
plot.clearSelection()
plot.interaction.selectedIds
plot.interaction.primarySelectedId
plot.interaction.selectionSnapshot
plot.interaction.subscribeSelection(listener)
plot.deleteSelection()
```

`selectedId` returns `primarySelectedId` for compatibility.

## 20. Reference behavior and clean-room boundary

Fixed references:

```text
JamesLMilner/terra-draw
revision 26d7ec91f071ab5d2bdeab774d14763746cd798b
MIT License, Copyright 2022 James Milner

geoman-io/maplibre-geoman
revision b177748cac826fc820ff7ea068186f8eb6e0fc3c
MIT License, Copyright 2024 Geoman

mapbox/mapbox-gl-draw
revision cb0ca464872d8468f0b912a2321f2e0503718c52
ISC-style license, Copyright Mapbox
```

Studied behavior:

- explicit selection modes and lifecycle;
- programmatic select/deselect;
- direct versus whole-feature editing;
- drag, rotate and scale mode separation;
- keyboard configuration;
- event naming and test coverage.

Code reuse: `none`.

PlotLibre does not copy reference mode implementations, Store structures, event systems or generated-GeoJSON editing. The design is independently derived around authored controls, Registry preflight and semantic batch transactions.

## 21. Required 007A test matrix

### SelectionController

- replace/add/subtract/toggle/clear;
- acquisition order and primary invariant;
- duplicate programmatic ids;
- missing id rejection;
- Store remove/clear reconciliation;
- one event per effective change;
- no event for no-op;
- backward-compatible `selectedId` alias.

### Store transaction

- atomic add/replace/remove combinations;
- duplicate operation rejection;
- missing/existing precondition rejection;
- no partial mutation on validation error;
- one batch event;
- listener errors do not undo committed state or prevent history entry;
- all listeners invoked;
- exact revision preservation.

### Batch commands

- multi-feature translation in one history entry;
- batch delete and undo selection restoration;
- redo exact after-state;
- any invalid transformed feature prevents all mutation;
- unchanged feature omitted;
- selection snapshots restored on execute/undo/redo.

### Translation

- mixed Arrow/Line/Area selection;
- exact common meter delta across authored controls;
- Definition parameters unchanged;
- semantic guides update during preview;
- antimeridian/high-latitude/large-extent rejection;
- Escape cancellation;
- zero-movement no-op;
- drag threshold and camera arbitration;
- one pointer gesture / one command.

### Browser

- Ctrl/Cmd toggle and Shift additive selection;
- primary handle behavior;
- multi-selection overlays actually rendered;
- whole-selection drag preview actually rendered;
- one commit and undo/redo;
- batch delete/undo;
- style reload recovery;
- all existing 19-symbol and 28-browser regressions.

## 22. Performance targets

Design targets, not yet measured guarantees:

```text
100 selected features:
  preview target >= 60 fps on reference desktop

1,000 document features:
  click selection < 16 ms adapter work
  box candidate query < 50 ms

10,000 document features:
  no full Registry regeneration for selection-only changes
  spatial index required before lasso/contain selection
```

Performance benchmarks must record browser, hardware, feature mix and render complexity.

## 23. Non-goals for 007A

- box/lasso runtime;
- rotation/scale runtime;
- canonical groups, locks, visibility or z-order;
- PlotJSON schema migration;
- geodesic/global transforms;
- non-uniform scale or reflection;
- collaborative selection/presence;
- editing generated Polygon vertices;
- snapping and constraints;
- new plot symbols.
