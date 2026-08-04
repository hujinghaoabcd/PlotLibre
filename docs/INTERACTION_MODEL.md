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

Interaction owns engine-independent drawing sessions, ordered selection, batch commands, local translation and screen-region algorithms. MapLibre owns browser-event normalization, screen projection, rendered-index queries, pointer/camera lifecycle and derived presentation. Core never depends on DOM, MapLibre or CSS-pixel types.

## 2. Drawing

Drawing sessions return authored controls only. Samples, rings, mirrored points, closures and guides remain derived.

```text
candidate
→ canonicalize authored controls
→ Registry validation
→ full Registry generation
→ invalid: active session + rejection, no mutation
→ valid: one command and Store commit
```

Session choice remains schema-driven, never `plotType`-driven.

## 3. SelectionController

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

- ids are unique existing Store ids;
- order is acquisition order;
- Primary is the final selected id;
- one effective operation emits one immutable snapshot;
- no-op emits nothing;
- Store removal reconciles once;
- selection is excluded from PlotJSON and feature revision.

Current click intents:

```text
plain       replace / make-primary
Shift       add
Ctrl/Cmd    toggle
Alt         subtract
empty plain clear
```

Modifier priority: `Alt > Ctrl/Cmd > Shift > default`.

## 4. Selection rendering

Current derived MapLibre resources:

```text
Sources:
  plotlibre-committed
  plotlibre-selection
  plotlibre-draft
  plotlibre-handles

Layers:
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

Polygon selections render as boundaries, LineStrings as lines and Points as points. Only Primary exposes authored handles and Definition guides.

## 5. Direct handle editing

```text
pointer down on authored handle
→ capture original feature
→ generated preview
→ Registry preflight
→ pointer up: one ReplacePlotCommand
```

Invalid preview does not mutate Store. Escape cancels. Handle drag has priority over body translation and region selection.

## 6. Atomic document editing

`PlotStore.applyTransaction()` stages add/replace/remove/exact order and commits once. Listener errors after commit are isolated through `onListenerError`.

`BatchEditCommand` stores exact before/after features, document order and selection. Execute/undo/redo replay exact revisions. One document-mutation gesture creates one History entry.

## 7. Batch delete

Delete/Backspace and `removeSelected()` remove all selected features through one command and one Store transaction. Undo restores exact values, order, selected ids and Primary.

## 8. Whole-selection translation

```text
selected body pointer down
→ one shared local frame
→ one common metre delta
→ transient generated preview
→ all candidates preflight
→ pointer up: one BatchEditCommand
```

Store remains unchanged during preview. Escape cancels. Any invalid member rejects the full batch. Parameters/style/metadata remain unchanged.

## 9. 007B merged design state

```text
Design PR:          #40
Design head:        4a8ee1102bb923801ada95c648a258225ccb9ec4
Design CI:          #413 / 30912109618
Design squash SHA:  a9b9efc090c01f45133f3f136a0049a97ee52b90
```

The design is merged. Runtime remains unimplemented until the post-merge finalization completes and a new branch is created from latest `main`.

## 10. ScreenSelectionRegionSession

Candidate engine-independent types:

```ts
interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

interface ScreenBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

type SelectionRegionStatus = "idle" | "armed" | "active" | "rejected";
```

The pure session captures box/lasso screen geometry and rejection state only. It never queries MapLibre or mutates SelectionController.

## 11. Region activation

Neutral convenience:

```text
Shift + primary drag from empty selectable space
→ one-shot additive box
```

Explicit one-shot modes:

```text
box   default replace
lasso default replace
```

Explicit modes support add/toggle/subtract through modifier override. Intent is captured on pointer down. Lasso is explicit only. Touch is deferred.

The current immediate Shift-add-on-mousedown adapter must be replaced, not supplemented.

## 12. Gesture priority

```text
active drawing
> authored handle drag
> active selection translation
> active region gesture
> explicit region mode
> neutral Shift-empty box arm
> selected-body translation
> click selection
> camera gesture
```

Convenience box never starts from a handle or plot body.

## 13. Box state machine

```text
pointer down: armed
movement <4 CSS px: remain armed
movement >=4 CSS px: active rectangle
pointer up: resolve and apply once
cancel/degenerate: no mutation
```

Positive width and height are required. Selection changes only on pointer up.

Empty result:

```text
replace clears
add/subtract/toggle no-op
```

## 14. Lasso state machine

```text
sample spacing:       2 CSS px
minimum distinct pts: 3
minimum area:         16 CSS px²
RDP tolerance:        1.5 CSS px
```

```text
raw sample path
→ duplicate cleanup
→ raw simple-ring validation
→ RDP simplify
→ simplified simple-ring validation
→ resolve/apply
```

Repeated non-consecutive vertices and non-adjacent crossing/touch/overlap reject. Invalid lasso preserves selection, displays transient rejection and leaves one retry armed.

## 15. One-event multi-id intent

Required direction:

```ts
selection.applyMany(ids, intent, "box" | "lasso")
```

Candidate ids arrive in Store/document order.

```text
replace  candidates
add      current + new candidates
subtract current survivors
toggle   current survivors + newly selected candidates
```

One effective completion emits one selection event. No-op emits nothing. Region selection never enters History.

## 16. Broad phase

```text
region bounds
→ queryRenderedFeatures(committed fill/line/point layers)
→ plotId dedup
→ Store existence filter
→ Store-order normalization
```

Selection, draft, handles, guides and labels are excluded. MapLibre return order and tile duplicates are non-semantic.

MapLibre rendered index is the initial broad phase; custom persistent indexing is deferred pending measurement.

## 17. Exact projected narrow phase

```text
Store feature
→ Registry.generate
→ fills + lines + points
→ map.project coordinates
→ exact region intersection
```

- Point center;
- LineString/MultiLineString segments;
- Polygon/MultiPolygon crossing and containment with holes;
- compound any-component semantics;
- boundary inclusive;
- CSS stroke/radius ignored;
- labels/guides/drafts/selection overlays ignored;
- generated samples authoritative for curved paths;
- query/generation/projection failure rejects the whole completion.

## 18. Region overlay

Box/lasso guides use a DOM/SVG overlay attached to the map container:

```text
CSS-pixel coordinates
pointer-events:none
aria-hidden:true
removed on complete/cancel/destroy
```

007B v1 adds no MapLibre Source/Layer. Baseline remains four Sources and ten Layers.

## 19. Region lifecycle

The unified adapter owns pointer capture, dragPan and existing boxZoom lifecycle.

Cancel without selection mutation on:

```text
Escape
pointercancel/lost capture
style.load
resize
camera movement
Store change
external selection change
draw/import/clear/undo/redo
destroy
```

Explicit region mode hides Primary handles/guides while preserving selection overlays and restores them on exit. Synthetic post-drag click is suppressed.

## 20. Stable rejections

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

Empty candidates are valid outcomes.

## 21. Canonical-state rule

Generated geometry may be projected for exact hit testing but never becomes authored state. Screen regions, overlays and rejections remain transient. Whole-object transforms continue to modify authored controls only.

## 22. Validation baseline

```text
main:              a9b9efc090c01f45133f3f136a0049a97ee52b90
workspace:         0.0.21
Node tests:        219
Chromium tests:    30
Sources/Layers:    4 / 10
007A PRs:          #38 / #39
007B design PR:    #40
```

The documentation-only finalization must pass the unchanged exact-head baseline before merge.

## 23. Runtime implementation order

After finalization, create `agent/007b-box-lasso-selection` from latest `main`:

```text
screen/RDP/topology utilities
→ SelectionController.applyMany
→ exact projected predicates
→ broad-phase resolver
→ unified region adapter
→ DOM/SVG overlay
→ public API
→ Playground/E2E/benchmarks
```

Rotation/scale, groups/locks, snapping, new symbols, touch and contain-only region selection remain separate later work.
