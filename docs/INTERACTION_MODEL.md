# PlotLibre Interaction Model

## 1. Boundary

PlotLibre separates semantic interaction from MapLibre:

```text
@plotlibre/core
       ↑
@plotlibre/interaction
       ↑
@plotlibre/maplibre
       ↑
MapLibre GL JS
```

`@plotlibre/interaction` owns engine-independent drawing sessions, ordered selection, batch commands and local translation math. MapLibre owns browser-event normalization, hit testing, cursors and derived Sources/Layers. Only canonicalized, validated and generated PlotFeatures enter Store and History.

## 2. Drawing sessions

```ts
interface DrawSession {
  readonly status: "ready" | "drawing" | "completed" | "cancelled";
  snapshot(): DrawSessionSnapshot;
  click(position: Position): DrawSessionSnapshot;
  doubleClick(position: Position): DrawSessionSnapshot;
  pointerMove(position: Position): DrawSessionSnapshot;
  keyDown(key: string): DrawSessionSnapshot;
  cancel(): DrawSessionSnapshot;
}
```

Sessions return authored controls only. Samples, rings, mirrored controls, closure points and semantic guides remain derived. Invalid completion preserves an active session and structured rejection; Store and History remain unchanged.

Session selection is schema-driven:

```text
minPoints = 2 and maxPoints = 2 → TwoPointDrawSession
otherwise                         → MultiPointDrawSession
```

No session branch selects by `plotType`.

## 3. Completion modes

- exact two-point: straight/fine/tailed-fine/assault-direction arrows;
- variable multi-point: curved, attack, squad, route/corridor and closed curve families;
- fixed four/five: double and pincer arrows;
- fixed three: gathering place, circular arc, circular segment and sector.

A completion attempt follows:

```text
candidate
→ merge defaults
→ canonicalize authored controls
→ Registry validation
→ full Registry generation
→ invalid: rejection, no mutation
→ valid: one create command and Store commit
```

## 4. Semantic guides

`PlotDefinition.deriveSemanticGuidePaths(feature)` returns transient WGS84 paths. Sector uses `center → end-bearing handle`.

Guides:

- do not enter committed RenderBundle, Store, History or PlotJSON;
- are not authored controls;
- are ignored when invalid/non-finite;
- are styled by the map-engine adapter;
- may appear for complete drafts, Primary selection and handle-drag preview.

## 5. SelectionController

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

Invariants:

- ids are unique existing Store ids;
- order is acquisition order;
- Primary is the final selected id;
- empty selection has no Primary;
- one effective operation emits one immutable snapshot;
- no-op emits nothing;
- Store remove/clear reconciles once;
- history restoration preserves membership/order/Primary but allocates a fresh monotonic interaction revision;
- selection does not increment PlotFeature revision and is excluded from PlotJSON.

Operations are `replace`, `add`, `subtract`, `toggle`, `clear`, `make-primary`, `store-reconcile` and `history-restore`.

## 6. MapLibre selection input

```text
plain click       replace or make hit selected object Primary
Shift + click     add
Ctrl/Cmd + click  toggle
Alt + click       subtract
empty plain click clear
Escape            clear when no higher-priority operation is active
```

PlotLibre reserves Shift for additive selection. It records MapLibre box-zoom state, disables box zoom while installed, handles Shift on MapLibre `mousedown`, and restores the previous state on destroy. The subsequent click applies the same idempotent add intent.

Compatibility aliases remain:

```text
plot.select(id | undefined)
plot.selectedId
interaction.select(id | undefined)
interaction.selectedId
```

The complete ordered selection is available through `selectedIds`.

## 7. Selection rendering

Sources:

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

Layers:

```text
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

Polygon selections render as boundaries, LineStrings as lines and Points as points. Compound output is de-duplicated. `plotId` and transient `primary` are derived styling/hit-test properties only. Only Primary contributes authored handles and Definition guides.

## 8. Handle drag

```text
mousedown authored handle
→ capture original feature
→ disable dragPan
→ pointerMove creates generated preview
→ mouseup commits one ReplacePlotCommand
→ clear draft and restore dragPan
```

Invalid preview does not mutate Store. Escape cancels without a command. Authored handle drag has priority over selected-body translation.

## 9. Atomic Store transaction

`PlotStore.applyTransaction()` stages add/replace/remove and optional exact ordering in a cloned ordered map.

```text
validate operation id sets
→ clone current ordered state
→ apply all staged changes
→ validate orderedIds against final staged ids
→ any error: discard stage, no event
→ commit once
→ emit one batch event
```

After commit, all listeners run. Listener exceptions are collected and passed to `onListenerError`; they do not synchronously escape and prevent History from recording an already committed command.

## 10. BatchEditCommand

The command stores exact before/after features, document order, selection snapshots and label.

Execute/redo applies exact after-state; undo applies exact before-state. Revisions are replayed exactly and redo does not increment them. Automatic selection reconciliation is suspended during Store mutation, followed by one explicit final selection restoration.

One completed gesture or batch action creates one History entry.

## 11. Batch delete

```text
Delete / Backspace / removeSelected()
→ capture selected features, document order and selection
→ one BatchEditCommand
→ one atomic remove transaction
→ after selection empty
```

Undo restores exact values, order, selected ids and Primary. Redo restores exact after-state. Active drawing and handle editing consume deletion keys first.

## 12. Whole-selection translation

```text
pointer down on selected body
→ capture exact selected features
→ analyze one shared local coordinate frame
→ derive one order-independent projection origin
→ convert pointer start/current to one metre delta
→ apply the same delta to every authored control
→ revision = original + 1
→ canonicalize/generate every candidate
→ render transient selection preview
→ pointer up commits one BatchEditCommand
```

Guarantees:

- Store remains unchanged during preview;
- parameters, style and metadata remain unchanged;
- all members receive one common metre vector;
- antimeridian, high-latitude, large-extent, non-finite, missing or generation-invalid input rejects the complete batch;
- Escape cancels all preview state;
- zero/sub-threshold movement is a no-op/click;
- dragPan is disabled only during active translation and restored afterward;
- one gesture creates at most one History entry.

## 13. Event priority

```text
active drawing
> authored handle drag
> active selection translation
> selected-body translation start
> selection click
> camera drag
```

MapLibre adapter mapping:

```text
click      drawing click or selection intent
mousedown  Shift add, handle drag or body translation
mousemove  drawing/handle/translation preview
mouseup    one replace or batch translation command
dblclick   drawing completion
style.load restore four sources, ten layers and derived state
keydown    drawing keys, Escape, batch delete or selection clear
```

## 14. Style lifecycle

After `map.setStyle()`, PlotLibre restores four Sources, ten Layers, committed features, ordered selection overlays, active translation preview, active draft, Primary handles and semantic guides. Initialization is idempotent.

## 15. Canonical-state rule

All geometry samples, widths, centers, radii, sweeps, closures, inferred points, selection overlays, translation previews and guides are derived. Whole-object editing transforms authored controls rather than generated Polygon/LineString vertices.

## 16. Validation baseline

```text
workspace:         0.0.21
Node tests:        219
Chromium tests:    30
Sources:           4
Layers:            10
runtime tested:    07449e7fda66069b148fa08c865b209d7dc365a3
CI:                #398 / 30904843935
```

The final documentation head of PR #38 must receive a new full current-head CI run before Ready or merge.

## 17. Current limitations and next slice

007A does not include snapping, touch-specific multi-selection, point insertion/removal, box/lasso, rotation/scale, groups/locks/visibility/z-order, parameter handles, holes/MultiPolygon editing, geodesic circular/translation mode or a published large-document performance guarantee.

After 007A merges, 007B designs screen-space box/lasso selection with deterministic Store ordering, `plotId` de-duplication, simple-lasso validation and spatial indexing before scale claims.
