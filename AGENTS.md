# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical feature state:

```text
plot definition + authored control points + parameters + style + metadata
```

Rendered geometry, samples, inferred frames, selection overlays and transform guides are derived output and must never replace authored state.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

- Core cannot depend on MapLibre or DOM;
- geometry cannot depend on Store, UI, events or map engines;
- interaction state remains engine-independent;
- MapLibre translates semantic state and gestures;
- Playground consumes public APIs only;
- circular dependencies are prohibited.

## 3. Existing merged baseline

```text
main SHA:           4ce59d189b65c8257bf49beabc308a4020249cd0
workspace:          0.0.20
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      184
Chromium baseline:  28
Sources:            3
Layers:             8
Milestone 006J:     implementation and finalization merged
```

Current public Definitions remain unchanged during Milestone 007 design.

## 4. Professional editing state boundary

Selection is transient interaction state, not PlotJSON document state.

Frozen candidate:

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

Invariants:

- ids are unique existing feature ids;
- order is acquisition order;
- `primaryId`, when present, is the final selected id;
- empty selection has no primary;
- one effective operation emits one immutable change;
- no-op emits nothing;
- Store removal/clear reconciles the set once;
- only the primary feature exposes authored handles and Definition guides;
- all selected features may expose lightweight derived overlays;
- selection never increments PlotFeature revision;
- selection is excluded from PlotJSON.

## 5. Selection operations

Engine-independent intent values:

```text
replace
add
subtract
toggle
clear
make-primary
store-reconcile
```

MapLibre modifier normalization:

```text
plain click      → replace / make-primary
Shift            → add
Ctrl or Cmd      → toggle
Alt              → subtract
empty plain click → clear
```

The SelectionController must not inspect browser-specific keyboard events directly.

Backward compatibility:

```text
plot.select(id | undefined)
interaction.selectedId
```

remain aliases for single selection / primary selection.

## 6. Atomic Store transactions

Milestone 007A requires a staged batch transaction over:

```text
add
replace
remove
optional exact orderedIds
```

Rules:

1. validate duplicate/cross-category ids before mutation;
2. added ids must not exist;
3. replaced and removed ids must exist;
4. clone current ordered feature state;
5. apply all changes to the staged state;
6. any error means no mutation;
7. commit once;
8. emit one batch event;
9. no listener observes partial state;
10. exact feature order can be restored on undo.

Appending deleted features during undo is prohibited because it changes render/z-order order.

## 7. Listener failure isolation

Current Store listeners are synchronous. Post-commit listener errors cannot safely trigger rollback after other listeners have observed the state.

Frozen policy:

- mutation validation errors throw before commit;
- after commit, all listeners are invoked;
- listener errors are collected;
- errors are reported through `onListenerError`;
- they do not synchronously escape the committed transaction;
- CommandHistory still records the committed command;
- renderer recovery can occur through explicit render or style reload.

This prevents changed Store state without a history entry.

## 8. BatchEditCommand

Engine-independent interaction command candidate stores:

```text
before features
 after features
before document order
after document order
before selection
after selection
label
```

Execute/redo applies exact after-state then after-selection. Undo applies exact before-state then before-selection. Redo must not increment revisions again.

One command represents one completed gesture or batch action.

## 9. Whole-object translation

Milestone 007A supports local-metre translation only.

Algorithm:

```text
selected authored controls
→ analyze one selection coordinate frame
→ derive one order-independent projection origin
→ pointer meter delta
→ add same delta to every authored control
→ revision = original + 1
→ canonicalize/generate every candidate
→ all valid: preview/commit batch
→ any invalid: no Store mutation
```

Rules:

- parameters/style/metadata remain unchanged;
- one selection uses one projection and delta;
- antimeridian/high-latitude/large-extent selections reject before drag;
- preview is transient;
- Escape cancels;
- movement below 4 CSS pixels remains a click;
- zero local movement creates no command;
- one pointer gesture creates one history entry;
- control-handle drag has priority over object translation;
- dragPan is disabled only during an active transform.

## 10. Batch delete

Delete selected features through one batch command.

- after selection is empty;
- undo restores exact feature values, document order and previous selection/primary;
- redo restores exact after-state;
- locked-object behavior is deferred until lock semantics exist;
- active draw/control edit retains existing key behavior and has priority.

## 11. Selection overlay

Candidate MapLibre resources:

```text
plotlibre-selection source
plotlibre-selection-line layer
plotlibre-selection-point layer
plotlibre-transform-guide layer
```

Overlay is transient and derived from selected Registry outputs. It must not regenerate every document feature for selection-only changes.

- Polygon: boundary highlight;
- LineString: line highlight;
- Point: point highlight;
- compound output: semantic `plotId` de-duplication;
- primary state is explicit overlay metadata;
- only primary handles remain in `plotlibre-handles`.

## 12. Later professional-editing slices

### 007B — box/lasso selection

- screen-space intersection selection first;
- candidate ids de-duplicated by `plotId`;
- deterministic Store/document ordering;
- contain policy deferred until exact projected containment exists;
- lasso must be simple; self-intersection rejects completion;
- spatial index required before large-document support.

### 007C — rotation and scale

- local-metre only initially;
- pivot = selection authored-control bounds center;
- clockwise user rotation with documented Cartesian conversion;
- positive uniform scale only, factor `[0.01, 100]`;
- no reflection or non-uniform scale;
- all candidates preflight atomically;
- parameters remain unchanged unless a Definition explicitly opts into a future pure transform hook.

### 007D — groups, locks, visibility and z-order

Do not put canonical editor state into arbitrary metadata. Formal PlotJSON schema and migration must precede runtime fields.

## 13. Required tests

Design PR remains documentation-only but runs the merged baseline:

```text
184 Node
28 Chromium
```

007A implementation must add tests for:

- selection order, primary fallback and modifiers;
- Store transaction preconditions and no partial mutation;
- one batch event;
- listener-error isolation;
- exact order restoration;
- batch delete/undo/redo selection restoration;
- mixed Arrow/Line/Area translation;
- common meter delta and unchanged parameters;
- invalid one-member atomic rejection;
- revision execute/undo/redo;
- actual selection overlays and batch preview;
- style reload;
- one gesture / one command;
- performance at 100, 1,000 and 10,000 features;
- all historical regressions.

## 14. Clean-room references

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Only observable selection/mode/transform behavior and test organization were studied. Code reuse: `none`.

## 15. Documentation and handover

Every completed design or implementation milestone updates `docs/handover/LATEST.md` and adds an immutable handover.

Required `LATEST.md` headings:

```text
## Current state
## Completed in this milestone
## Validation
## Next tasks
## Risks and decisions
```

Historical immutable handovers are not rewritten.

## 16. Current priority

```text
Milestone: 007 professional editing semantic design
branch:    agent/007-professional-editing-design
scope:     documentation, references, transaction algorithms and test fixtures only
runtime:   prohibited on this branch
```

Binding continuation order:

1. complete design, transaction, reference and handover documents;
2. create a documentation-only Draft PR;
3. pass Node 20.19, Node 22, 184 Node, 28 Chromium, build and handover checks;
4. resolve every design review thread;
5. squash merge using the validated expected head;
6. create `agent/007a-selection-batch-translation` from the new final `main`;
7. implement SelectionController first;
8. implement Store transaction and listener isolation second;
9. implement BatchEditCommand and exact ordered undo third;
10. only then add MapLibre overlays, batch delete and local translation;
11. do not implement box/lasso, rotation/scale, groups, new symbols or snapping in 007A.
