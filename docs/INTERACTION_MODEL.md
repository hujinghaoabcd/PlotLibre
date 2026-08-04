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

`@plotlibre/interaction` owns engine-independent drawing sessions, ordered selection, batch commands, local translation and future screen-region session mathematics. MapLibre owns browser-event normalization, screen projection, rendered-index queries, cursors and derived presentation. Only canonicalized, validated PlotFeatures enter Store and History.

Core never depends on DOM, MapLibre or CSS-pixel types.

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

Sessions return authored controls only. Samples, rings, mirrored controls, closure points and semantic guides remain derived. Invalid completion preserves the active session and structured rejection; Store and History remain unchanged.

Session selection is schema-driven:

```text
minPoints = 2 and maxPoints = 2 → TwoPointDrawSession
otherwise                         → MultiPointDrawSession
```

## 3. Drawing completion

```text
candidate
→ merge defaults
→ canonicalize authored controls
→ Registry validation
→ full Registry generation
→ invalid: rejection, no mutation
→ valid: one create command and Store commit
```

Current modes include exact two-point, variable multi-point, fixed four/five and fixed three-control Definitions.

## 4. Semantic guides

`PlotDefinition.deriveSemanticGuidePaths(feature)` returns transient WGS84 paths. Guides do not enter committed RenderBundle, Store, History or PlotJSON. They may appear for complete drafts, Primary selection and handle-drag preview.

## 5. SelectionController

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
- empty selection has no Primary;
- one effective operation emits one immutable snapshot;
- no-op emits nothing;
- Store remove/clear reconciles once;
- history restoration preserves membership/order/Primary but allocates a fresh monotonic interaction revision;
- selection does not increment PlotFeature revision and is excluded from PlotJSON.

Current operations are replace, add, subtract, toggle, clear, make-primary, Store reconcile and history restore.

007B adds one batch operation candidate:

```ts
selection.applyMany(ids, intent, "box" | "lasso")
```

It must validate all ids and emit at most one SelectionChange.

## 6. Click selection

```text
plain click       replace or make hit selected object Primary
Shift + click     add
Ctrl/Cmd + click  toggle
Alt + click       subtract
empty plain click clear
Escape            clear when no higher-priority operation is active
```

Modifier priority is Alt, then Ctrl/Cmd, then Shift, then default.

The current 007A adapter performs Shift-add on MapLibre `mousedown`. 007B runtime must replace this with a unified thresholded region adapter so Shift click and Shift-empty box cannot both mutate selection.

Compatibility aliases remain:

```text
plot.select(id | undefined)
plot.selectedId
interaction.select(id | undefined)
interaction.selectedId
```

## 7. Selection rendering

Current Sources:

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

Current Layers:

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

Polygon selections render as boundaries, LineStrings as lines and Points as points. Compound output is de-duplicated. Only Primary contributes authored handles and Definition guides.

## 8. Handle drag

```text
mousedown authored handle
→ capture original feature
→ disable dragPan
→ pointerMove creates generated preview
→ mouseup commits one ReplacePlotCommand
→ clear draft and restore dragPan
```

Invalid preview does not mutate Store. Escape cancels without a command. Handle drag has priority over body translation and region selection.

## 9. Atomic Store transaction

`PlotStore.applyTransaction()` stages add/replace/remove and optional exact ordering in a cloned ordered map.

```text
validate complete transaction
→ apply staged changes
→ validate exact order
→ any error: no mutation/event
→ commit once
→ emit one batch event
```

After commit, every listener runs. Listener errors are collected and reported through `onListenerError`; they do not prevent History from recording an already committed command.

## 10. BatchEditCommand

The command stores exact before/after features, document order and selection snapshots. Execute/redo applies exact after-state; undo applies exact before-state. Revisions are replayed exactly. One completed document-mutation gesture or batch action creates one History entry.

## 11. Batch delete

```text
Delete / Backspace / removeSelected()
→ capture selected features, order and selection
→ one BatchEditCommand
→ one atomic remove transaction
→ after selection empty
```

Undo restores exact values, order, selected ids and Primary.

## 12. Whole-selection translation

```text
pointer down on selected body
→ capture selected features
→ one shared local coordinate frame
→ one common metre delta
→ generated transient preview
→ pointer up commits one BatchEditCommand
```

Store is unchanged during preview. Any invalid member rejects the full batch. Escape cancels. Parameters/style/metadata remain unchanged. One gesture creates at most one History entry.

## 13. 007B ScreenSelectionRegionSession

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

The pure session captures screen points, box bounds, lasso samples and topology rejection only. It never queries MapLibre or mutates SelectionController.

## 14. 007B region activation

Neutral convenience:

```text
Shift + primary drag from empty selectable space
→ one-shot additive box
```

Explicit one-shot API:

```text
start box mode   → default replace
start lasso mode → default replace
```

Explicit modes support modifier override to add/toggle/subtract. Intent is captured at pointer down and does not change during the gesture.

Lasso is explicit-mode only. Touch region selection is deferred.

## 15. Box state machine

```text
idle
→ Shift-empty pointer down: armed
→ movement <4 CSS px: armed
→ movement >=4 CSS px: active
→ pointer up: resolve candidates and apply once
→ cancel/degenerate: no selection mutation
```

A valid box has positive width and height. Selection changes only on pointer up.

Empty result:

```text
replace clears
add/subtract/toggle no-op
```

## 16. Lasso state machine

```text
explicit mode armed
→ pointer down: active freehand capture
→ accept points at >=2 CSS px spacing
→ pointer up: validate raw ring
→ simplify at 1.5 CSS px
→ validate simplified ring
→ resolve/apply and exit
```

Minimum: three distinct points and 16 CSS px² absolute area.

Non-adjacent segment crossing, touch, collinear overlap or repeated non-consecutive vertex rejects. Invalid completion preserves selection, shows rejection and leaves the mode armed for one retry.

## 17. Region multi-id intent

Candidate ids arrive in Store/document order.

```text
replace  candidate ids
add      current + newly added candidates
subtract current survivors
toggle   current survivors + newly selected candidates
```

One effective completion emits one immutable `box` or `lasso` SelectionChange. Region selection never enters CommandHistory.

## 18. MapLibre broad phase

```text
region screen bounds
→ queryRenderedFeatures on committed fill/line/point layers
→ plotId de-duplication
→ Store existence filter
→ Store/document-order normalization
```

Exclude selection overlays, drafts, handles, guides and labels. MapLibre return order and tile duplicates are not semantic ordering.

MapLibre's rendered index is the first broad phase. No custom persistent spatial index is added before measured evidence.

## 19. Exact projected narrow phase

```text
Store candidate
→ Registry.generate
→ fills + lines + points
→ map.project every generated coordinate
→ exact region intersection
```

- Point uses center;
- LineString/MultiLineString use segment intersection;
- Polygon/MultiPolygon support crossing and containment with holes;
- compound feature selects once when any component intersects;
- boundaries are inclusive;
- CSS line width and point radius are ignored;
- labels, guides, drafts and selection overlays are ignored;
- generated samples are authoritative for curved paths;
- query/generation/projection failure rejects the whole completion;
- partial selection is prohibited.

## 20. Region overlay

Box/lasso guides use a DOM/SVG overlay attached to the MapLibre container:

```text
CSS-pixel coordinates
pointer-events:none
aria-hidden:true
removed on all terminal paths
```

No new MapLibre Source or Layer is added in 007B version 1. The four-Source/ten-Layer baseline remains.

## 21. Region lifecycle

The unified adapter owns pointer capture, dragPan and boxZoom interaction.

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

Explicit region mode hides Primary handles/guides while preserving selection overlays, then restores them on exit. Synthetic post-drag click is suppressed.

## 22. Event priority after 007B

```text
active drawing
> authored handle drag
> active selection translation
> active region gesture
> explicit region-mode start
> neutral Shift-empty box arm
> selected-body translation
> click selection
> camera drag
```

Expected adapter mapping:

```text
capture pointerdown  arm click/box/lasso ownership
pointermove          drawing/handle/translation/region preview
pointerup            one replace/batch document command or one selection event
pointercancel        cancel region/drag safely
style/camera/resize  cancel screen region; restore derived state
keydown              drawing keys, Escape, delete or selection clear
```

## 23. Stable region rejections

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

Empty candidates are valid outcomes.

## 24. Style and camera lifecycle

Style reload restores four Sources, ten Layers and canonical-derived state. Active region gestures cancel because their screen frame is invalidated; DOM overlays are independent of style resources and must still be removed.

## 25. Canonical-state rule

Generated vertices may be used for exact screen hit testing but never become authored state. Region selection, overlays and rejections remain transient. Whole-object transforms continue to modify authored controls only.

## 26. Validation baseline

```text
main:              d08c56b6687ea64e0c599fd04fd77115d320d8f2
workspace:         0.0.21
Node tests:        219
Chromium tests:    30
Sources/Layers:    4 / 10
007A PRs:          #38 / #39
```

007B design branch is Markdown-only and must pass the unchanged baseline on its exact head before merge.

## 27. Current limitations

Still deferred:

- touch region gestures;
- contain-only region policy;
- persistent region tools;
- custom persistent spatial index;
- rotation/scale;
- groups/locks/visibility/z-order;
- snapping;
- geodesic transform mode;
- published large-document latency guarantee.

## 28. Next runtime slice

After design merge/finalization, create `agent/007b-box-lasso-selection` from latest `main` and implement in this order:

```text
pure screen utilities
→ applyMany
→ exact predicates
→ broad-phase resolver
→ unified region adapter
→ DOM/SVG overlay
→ public API
→ Playground/E2E/benchmarks
```
