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

## 3. Ordered selection

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

Click intents:

```text
plain       replace / make Primary
Shift       add
Ctrl/Cmd    toggle
Alt         subtract
empty plain clear
```

Modifier priority: `Alt > Ctrl/Cmd > Shift > default`.

## 4. Selection rendering

Derived MapLibre resources:

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

Box/lasso guides are a separate DOM/SVG overlay and add no geographic Source or Layer.

## 5. Direct handle editing

```text
pointerdown on authored handle
→ capture original feature
→ generated preview
→ Registry preflight
→ pointerup: one ReplacePlotCommand
```

Invalid preview does not mutate Store. Escape cancels. Handle drag has priority over body translation and region selection.

## 6. Atomic document editing

`PlotStore.applyTransaction()` stages add/replace/remove/exact order and commits once. Listener errors after commit are isolated through `onListenerError`.

`BatchEditCommand` stores exact before/after features, document order and selection. Execute/undo/redo replay exact revisions. One document-mutation gesture creates one History entry.

Delete/Backspace and `removeSelected()` remove all selected features through one command. Undo restores exact values, order, selected ids and Primary.

## 7. Whole-selection translation

```text
selected body pointerdown
→ one shared local frame
→ one common metre delta
→ transient generated preview
→ all candidates preflight
→ pointerup: one BatchEditCommand
```

Store remains unchanged during preview. Escape cancels. Any invalid member rejects the full batch. Parameters, style and metadata remain unchanged.

## 8. Region-selection state

Pure engine-independent session types:

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

`ScreenSelectionRegionSession` captures box/lasso screen geometry and rejection state. It never queries MapLibre or mutates SelectionController.

## 9. Region entry

Neutral convenience:

```text
Shift + primary drag from empty selectable space
→ one-shot additive box
```

Explicit one-shot modes:

```text
plot.startBoxSelection()   default replace
plot.startLassoSelection() default replace
```

Public state:

```text
plot.regionSelection
plot.regionSelectionSnapshot
plot.regionSelectionRejection
plot.cancelRegionSelection()
```

Explicit modes support configured replace/add/toggle/subtract plus modifier override at pointerdown. Lasso is explicit only. Touch is deferred.

Feature Shift-click remains click-add; no selection mutation occurs on the region controller's pointerdown.

## 10. Gesture priority

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

Convenience box never starts from a handle or selectable body.

## 11. Box state machine

```text
pointerdown: armed
movement <4 CSS px: remain armed
movement >=4 CSS px: active rectangle
pointerup: resolve and apply once
cancel/degenerate: no mutation
```

Positive width and height are required. Selection changes only on pointerup.

Empty result:

```text
replace clears
add/subtract/toggle no-op
```

## 12. Lasso state machine

```text
sample spacing:       2 CSS px
minimum distinct pts: 3
minimum area:         16 CSS px²
RDP tolerance:        1.5 CSS px
```

```text
raw sample path
→ consecutive-duplicate cleanup
→ raw point/topology/area validation
→ RDP simplify
→ simplified point/topology/area validation
→ implicit closure
→ resolve/apply
```

Repeated non-consecutive vertices and non-adjacent crossing, touch or overlap reject. Invalid lasso preserves selection, displays transient rejection and remains available for direct retry.

## 13. One-event multi-id intent

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

## 14. Broad phase

```text
region bounds
→ queryRenderedFeatures(committed fill/line/point layers)
→ plotId dedup
→ Store existence filter
→ Store-order normalization
```

Selection, draft, handles, guides, labels and hit-area layers are excluded. MapLibre return order and tile duplicates are non-semantic.

The rendered index is the initial broad phase. Persistent custom indexing is deferred pending measured scale evidence.

## 15. Exact projected narrow phase

```text
Store feature
→ Registry.generate
→ semantic fills + lines + points
→ map.project coordinates
→ exact region intersection
```

- Point center;
- LineString/MultiLineString segments;
- Polygon/MultiPolygon crossing and containment with holes;
- compound any-component semantics;
- boundary inclusive;
- CSS stroke/radius ignored;
- labels, hit areas, guides, drafts, handles and selection overlays ignored;
- generated samples authoritative for curved paths;
- query/generation/projection failure rejects the whole completion;
- partial selection prohibited.

## 16. Region overlay

```text
absolutely positioned DOM/SVG
CSS-pixel coordinates
pointer-events:none
aria-hidden:true
clipped to map container
removed on complete/cancel/destroy
independent from style.load
```

## 17. Pointer and lifecycle

The unified adapter owns pointer capture, dragPan and MapLibre boxZoom lifecycle.

Cancel without selection mutation on:

```text
Escape
pointercancel
unexpected lost pointer capture
style.load
resize
camera movement
Store change
external selection change
draw/import/clear/undo/redo
destroy
```

Synthetic post-drag click is suppressed. Explicit mode hides Primary handles/guides while preserving selection overlays and restores them on exit.

Intentional `releasePointerCapture()` emits `lostpointercapture` in Chromium. The controller clears its owned pointer id before release and ignores the resulting event; unexpected loss while ownership remains active still cancels. This preserves a newly created rejected lasso state.

## 18. Stable rejections

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

Empty candidates are valid outcomes.

## 19. Canonical-state rule

Generated geometry may be projected for exact hit testing but never becomes authored state. Screen regions, overlays and rejections remain transient. Whole-object transforms modify authored controls only.

## 20. Merged evidence

```text
workspace:         0.0.22
main:              f98483d3504ce464c93e5a03a49f7f856d1cc1a0
Node tests:        264
Chromium tests:    32
Sources/Layers:    4 / 10
007A PRs:          #38 / #39
007B design PRs:   #40 / #41
007B runtime PRs:  #42 / #43
```

PR #43 exact head `f7d9e107...` passed CI #445 / `30924648279` with Node 20.19/22, 264 Node tests, build, handover and 32 Chromium tests before squash merge.

## 21. Next work

- produce measured 100 / 1,000 / 10,000 feature evidence before deciding on a persistent index;
- design 007C local rotation and positive uniform scale in a separate PR;
- defer groups/locks/visibility/z-order until formal PlotJSON migration design;
- keep snapping, touch region gestures, contain-only policy, persistent region tools and new symbols outside these slices.
