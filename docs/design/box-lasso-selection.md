# Milestone 007B — Box and Lasso Selection Semantic Design

Status: design freeze candidate. Runtime is prohibited on `agent/007b-box-lasso-design`.

Base runtime:

```text
main:               d08c56b6687ea64e0c599fd04fd77115d320d8f2
workspace:          0.0.21
public symbols:     19
Node tests:         219
Chromium tests:     30
MapLibre Sources:   4
MapLibre Layers:    10
Milestone 007A:     merged through PR #38 and finalized through PR #39
```

## 1. Scope

Milestone 007B adds deterministic screen-space region selection while preserving the 007A canonical boundary:

```text
box/lasso gesture
→ transient screen region
→ broad-phase rendered candidate ids
→ exact projected semantic-geometry intersection
→ one ordered SelectionController mutation
```

007B includes:

- additive Shift-drag box convenience;
- explicit one-shot box mode with replace/add/toggle/subtract intents;
- explicit one-shot freehand lasso mode;
- pure engine-independent screen-region session state;
- deterministic multi-id selection application;
- MapLibre broad-phase candidate resolution;
- exact screen-space narrow-phase geometry predicates;
- transient DOM/SVG region overlay;
- cancellation, rejection and camera lifecycle policy;
- functional and measured-performance test plans.

007B excludes:

- rotation or scale;
- groups, locks, visibility or z-order;
- snapping or angle constraints;
- touch-specific region gestures;
- persisted selection regions;
- contain-only selection;
- arbitrary metadata changes;
- new public plot symbols.

## 2. Canonical-state invariant

Region selection changes only transient interaction state.

It must not modify:

```text
PlotFeature
PlotFeature.revision
Store document order
History undo/redo depth
PlotJSON
Definition RenderBundle
```

The region path, box rectangle, projected candidate geometry, query results and selection overlay are transient derived state.

## 3. Existing 007A conflict to resolve

The merged `MapLibreSelectionModifierCapture` applies Shift-add immediately on `mousedown` because MapLibre box zoom could swallow the later click.

007B also needs:

```text
Shift + drag on empty map → additive box selection
```

Immediate mousedown mutation is incompatible with a thresholded box gesture. 007B runtime must therefore replace `MapLibreSelectionModifierCapture` with one unified region-selection adapter that:

1. owns MapLibre box-zoom disable/restore;
2. never mutates selection on pointer down;
3. arms a possible box gesture;
4. waits for the screen-distance threshold;
5. commits either one click intent or one region intent, never both;
6. suppresses the synthetic post-drag click.

Do not stack a second box listener on top of the existing immediate Shift listener.

## 4. Engine-independent screen types

Candidate public interaction types:

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

type SelectionRegionKind = "box" | "lasso";
type SelectionRegionStatus =
  | "idle"
  | "armed"
  | "active"
  | "rejected";

interface SelectionRegionRejection {
  readonly code: string;
  readonly message: string;
}

interface SelectionRegionSnapshot {
  readonly kind?: SelectionRegionKind;
  readonly status: SelectionRegionStatus;
  readonly intent?: SelectionIntent;
  readonly points: readonly ScreenPoint[];
  readonly bounds?: ScreenBounds;
  readonly rejection?: SelectionRegionRejection;
  readonly revision: number;
}
```

`@plotlibre/interaction` may implement a pure `ScreenSelectionRegionSession`. It captures and validates screen points only. It never queries MapLibre, generates PlotDefinitions or mutates SelectionController.

## 5. Public mode API

Candidate MapLibre-facing API:

```ts
plot.regionSelection.start("box", { intent: "replace" });
plot.regionSelection.start("lasso", { intent: "replace" });
plot.regionSelection.cancel();
plot.regionSelection.snapshot;
plot.regionSelection.rejection;
plot.regionSelection.isActive;
```

Convenience aliases may be provided:

```ts
plot.startBoxSelection(options?);
plot.startLassoSelection(options?);
plot.cancelRegionSelection();
```

Version 1 is one-shot:

- successful completion exits explicit region mode;
- Escape exits explicit region mode;
- invalid lasso completion keeps the mode armed for one retry and exposes rejection;
- starting draw/import/clear/undo/redo cancels any active region gesture first;
- starting a new region mode replaces the previous mode;
- selection membership is preserved when entering or cancelling a mode.

Persistent region tools are deferred until a toolbar-mode lifecycle is designed across wrappers.

## 6. Intent normalization

Selection intents remain:

```text
replace
add
subtract
toggle
```

Modifier priority is frozen to match click selection:

```text
Alt                  → subtract
Ctrl or Cmd          → toggle
Shift                → add
no modifier          → configured default intent
```

Intent is captured at primary-pointer down. Modifier changes during a gesture do not change the pending operation.

### Neutral-mode convenience

```text
Shift + primary drag starting on empty selectable space
→ one-shot box selection
→ default intent add
```

`Shift + Ctrl/Cmd` overrides to toggle and `Shift + Alt` overrides to subtract.

Convenience box does not start when pointer down hits:

- an authored handle;
- a committed or selected plot body;
- an active draw/translation/region gesture.

Shift click on a plot remains click-add/make-primary behavior. Shift drag beginning on a plot does not become box selection.

### Explicit box/lasso mode

Explicit mode owns primary-pointer down anywhere in the canvas. No modifier uses the configured mode intent, normally `replace`. Modifiers override it using the same priority above.

## 7. Gesture arbitration

Binding priority:

```text
active drawing
> explicit authored-handle drag
> active whole-selection translation
> active region gesture
> explicit region-mode start
> neutral Shift-empty box arm
> selected-body translation
> click selection
> map camera gesture
```

Entering explicit region mode hides Primary handles and semantic guides while preserving selection overlays. They are restored when the mode exits.

The region adapter should use capture-phase DOM pointer events and primary-pointer capture so leaving the canvas does not leave a stuck gesture.

Version 1 accepts primary mouse or pen input only. Touch region selection is deferred because it conflicts with map pan/pinch gestures and needs a separate accessibility policy.

## 8. Box selection

### 8.1 State

```text
pointer down
→ armed(start)
→ movement below threshold: no overlay, no selection mutation
→ movement reaches threshold: active rectangle overlay
→ pointer up: resolve candidates and apply once
```

Threshold:

```text
Euclidean movement >= 4 CSS pixels
```

A completed box must have positive width and height. Sub-threshold or degenerate gestures are no-ops and preserve selection.

### 8.2 Rectangle

The screen rectangle is normalized as:

```text
minX = min(start.x, current.x)
minY = min(start.y, current.y)
maxX = max(start.x, current.x)
maxY = max(start.y, current.y)
```

Selection changes only on pointer up. Candidate highlighting is not continuously applied during drag in version 1.

### 8.3 Empty result

A valid region with no intersecting candidates applies:

```text
replace  → clear selection
add      → no-op
subtract → no-op
toggle   → no-op
```

Cancellation, invalid geometry or query failure never clears selection.

## 9. Lasso selection

Lasso is explicit-mode only. Ordinary map drag never infers a lasso.

### 9.1 Capture

- primary pointer down starts one freehand path;
- the first point is accepted exactly;
- a new point is accepted only when at least 2 CSS pixels from the latest accepted point;
- pointer up appends the final point when distinct;
- the ring closes automatically with the first point;
- the lasso path is never persisted.

### 9.2 Minimum geometry

After duplicate removal, the raw path must have:

```text
at least 3 distinct points
absolute screen area >= 16 CSS px²
```

Otherwise completion rejects with a stable too-small/too-few-points code and selection remains unchanged.

### 9.3 Topology and simplification

Validation order:

```text
raw sampled path
→ reject repeated non-consecutive vertices
→ reject non-adjacent segment intersection/overlap
→ Ramer–Douglas–Peucker simplify at 1.5 CSS px
→ validate simplified closed ring again
```

Adjacent segments may share their common endpoint. The first and closing segment may share the first point. Any other crossing, touch or collinear overlap is self-intersection and rejects completion.

Simplification cannot be used to hide an invalid raw loop.

### 9.4 Invalid completion

On invalid pointer up:

- selection is unchanged;
- no SelectionController event is emitted;
- the invalid path remains visible in rejection styling;
- explicit lasso mode remains armed for one retry;
- next pointer down clears the previous rejection;
- Escape exits and removes the overlay.

## 10. One-event multi-id selection contract

Region selection must not call `add`, `toggle` or `subtract` once per id because that emits multiple events and creates order artifacts.

Candidate interaction API:

```ts
selection.applyMany(
  ids: readonly string[],
  intent: SelectionIntent,
  reason: "box" | "lasso",
): SelectionSnapshot;
```

All ids are validated before mutation and deduplicated by first occurrence. The adapter supplies ids in Store/document order.

Frozen algorithms:

### Replace

```text
next = candidateIds
```

Empty candidates clear selection. Primary is the final candidate.

### Add

```text
added = candidateIds not currently selected
next = current selectedIds + added
```

Existing selection order and Primary are preserved when nothing new is added. When features are added, the final newly added id becomes Primary.

### Subtract

```text
next = current selectedIds excluding candidateIds
```

Surviving order is preserved. Primary survives when present; otherwise the final survivor becomes Primary.

### Toggle

```text
survivors = current selectedIds excluding candidateIds
added = candidateIds not currently selected
next = survivors + added
```

New ids are appended in Store order. If no ids are added, the final survivor is Primary.

One effective region completion emits exactly one immutable SelectionChange with reason `box` or `lasso`. No-op completion emits no event.

Region selection never creates a CommandHistory entry.

## 11. Candidate broad phase

MapLibre version 1 uses its rendered feature index as broad phase:

```text
gesture screen bounding box
→ map.queryRenderedFeatures(bounds, committed interactive layers)
→ read plotId
→ deduplicate ids
→ filter to existing Store features
→ reorder by Store/document order
```

Query layers are committed visible plot layers only:

```text
plotlibre-fill
plotlibre-line
plotlibre-point
```

Exclude:

```text
selection overlay layers
draft layers
handles and guides
region overlay
labels
```

Selection overlays are deliberately excluded because their thicker styling must not enlarge region-selection semantics.

MapLibre query result order is never used as selection order. Tile/render duplicates are expected and deduplicated by `plotId`.

The initial 007B implementation does not add a second persistent spatial index. MapLibre's render index is the broad phase. A custom index requires measured evidence and a separate invalidation design.

## 12. Exact screen-space narrow phase

Broad-phase presence is not sufficient, especially for lasso bounding-box false positives. Every candidate id is regenerated from its canonical PlotFeature and tested against the exact screen region.

Pipeline:

```text
Store feature
→ Registry.generate(feature)
→ selectable fills + lines + points
→ map.project every generated coordinate
→ pure screen-geometry intersection
→ any component intersects: select plotId once
```

The exact test uses generated semantic geometry, not rendered CSS footprint:

- line width is ignored;
- point radius is ignored;
- selection-overlay width is ignored;
- labels and semantic guides are ignored;
- generated sampled vertices are authoritative for curved paths;
- boundaries are inclusive.

### Point

A Point intersects when its projected center is inside or on the selection region.

### LineString / MultiLineString

A line intersects when any projected segment intersects the region boundary or any line vertex is inside/on the region.

### Polygon / MultiPolygon

A polygon intersects when any of the following is true:

1. a polygon ring segment intersects the region boundary;
2. a region vertex lies inside the polygon fill, respecting holes;
3. an exterior polygon vertex lies inside the region.

A region fully inside a polygon hole does not select the polygon.

### Compound RenderBundle

A PlotFeature is selected once when any selectable fill, line or point component intersects. RenderBundle component order does not affect selected-id order.

### Failure policy

Candidate generation or projection failure rejects the whole region completion. Partial candidate selection is prohibited. Selection remains unchanged.

## 13. DOM/SVG region overlay

Box and lasso outlines are screen UI, not geographic document data. Version 1 uses one absolutely positioned DOM/SVG overlay attached to `map.getContainer()` rather than adding GeoJSON Sources/Layers.

Requirements:

- exact CSS-pixel coordinates;
- `pointer-events: none`;
- `aria-hidden="true"`;
- clipped to the map container;
- box rectangle fill + outline;
- lasso polyline/polygon fill + outline;
- rejection styling for invalid lasso;
- removed on completion, cancellation and destroy;
- independent of `style.load`;
- no change to the merged four-Source/ten-Layer baseline.

An active gesture is cancelled on style reload, map resize or programmatic camera movement so screen coordinates cannot be applied to a changed camera frame.

## 14. Map and document lifecycle

At pointer-down the controller captures:

```text
intent
selection revision
Store/document state marker
screen start
camera frame marker
```

Cancel active gesture without selection mutation when:

- Escape;
- pointercancel/lost pointer capture;
- style reload;
- map resize or camera movement;
- Store changes;
- selection changes externally;
- draw/import/clear/undo/redo starts;
- controller destroy.

During an active gesture:

- preserve and disable dragPan;
- PlotLibre already owns and disables boxZoom for its lifecycle;
- restore the previous dragPan state exactly once;
- suppress the synthetic click after pointer up/cancel;
- never leave a DOM overlay or pointer capture behind.

## 15. Stable rejection codes

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

Empty candidate results are valid outcomes, not rejections.

Rejections are transient and excluded from PlotJSON, Store and History.

## 16. MapLibre adapter changes required by runtime

007B runtime is expected to:

- replace `MapLibreSelectionModifierCapture` with `MapLibreSelectionRegionInteraction`;
- keep boxZoom ownership in the replacement adapter;
- add `MapLibreMapLike.project()` and `getContainer()` boundaries;
- extend pointer-event test doubles with pointer id/type/button/capture fields;
- expose a shared post-gesture click-suppression hook instead of duplicating private flags;
- add pure screen-region geometry utilities under `@plotlibre/interaction` or a dependency-safe geometry module;
- keep Core independent from screen and MapLibre types;
- keep renderer Sources/Layers at 4/10 in version 1.

## 17. Performance contract

Functional complexity contract:

```text
broad phase: MapLibre rendered index
narrow phase: O(C × V)
C = unique broad-phase candidate PlotFeatures
V = projected generated vertices for those candidates
```

Runtime must not regenerate every Store feature when `C` is smaller than document size.

Tests must instrument and assert:

- generated candidate count does not exceed unique broad-phase ids;
- duplicate rendered components do not multiply Registry generation;
- Store-order normalization is deterministic;
- one selection event per completion.

Measured benchmark fixtures:

```text
100 features
1,000 features
10,000 features
```

For each fixture record:

- hardware and OS;
- browser/version;
- viewport, zoom, pitch and bearing;
- feature-family mix and generated vertex counts;
- broad-phase candidate count;
- query time;
- projection/intersection time;
- total pointer-up-to-selection-event time;
- median and p95 after warmup.

No hard public latency guarantee is frozen until the first measured implementation report.

## 18. Required test matrix

### Pure Node

- box normalization in every drag direction;
- threshold, degenerate and empty box behavior;
- lasso sampling and final-point capture;
- raw and simplified self-intersection rejection;
- repeated vertex and collinear overlap rejection;
- Point/LineString/MultiLineString intersection;
- Polygon containment, crossing and hole exclusion;
- MultiPolygon and compound any-component behavior;
- boundary-inclusive predicates;
- applyMany replace/add/subtract/toggle ordering;
- existing Primary preservation and fallback;
- one event / no-op behavior;
- generation/projection fail-closed behavior.

### MapLibre adapter

- Shift click still adds after immediate mousedown mutation is removed;
- neutral Shift-empty drag arms then completes one additive box;
- Shift down does not mutate selection before pointer up;
- explicit box replace and modifier overrides;
- explicit lasso lifecycle and retry after invalid completion;
- DOM overlay creation/update/cleanup;
- pointer capture and dragPan restoration;
- boxZoom restored on destroy;
- synthetic click suppression;
- committed-layer-only candidate query;
- duplicate/query-order normalization;
- Store/selection/camera/style change cancellation;
- Primary handles hidden/restored in explicit mode;
- no History mutation.

### Actual Chromium

- box selects mixed Arrow/Line/Area objects;
- box crossing a line selects it;
- box fully inside a polygon fill selects it;
- additive/toggle/subtract box intents;
- deterministic Store-order selectedIds and Primary;
- lasso excludes bounding-box false positives;
- invalid self-intersecting lasso changes nothing;
- lasso selection followed by translation commits one batch command;
- region selection followed by Delete/undo restores exact document order and selection;
- Escape and camera/style changes leave no overlay or stuck map interaction;
- historical 219 Node / 30 Chromium regressions remain green.

## 19. Clean-room references

Fixed references:

```text
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52
ISC-style license, Copyright Mapbox
observed: boxSelect option, Shift-mousedown arm, dragPan ownership,
DOM rectangle, bounding-box feature query, id de-duplication

JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b
MIT License, Copyright 2022 James Milner
observed: explicit select-mode lifecycle and adapter separation

geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c
MIT License, Copyright 2024 Geoman
observed: explicit MapLibre edit-mode/tool separation
```

Code reuse: `none`.

PlotLibre independently adds:

- authored-control canonical state;
- exact Registry-generated screen-geometry narrow phase;
- Store-order deterministic results;
- one-event batch intent semantics;
- strict lasso topology validation;
- no generated-vertex mutation;
- no persistent region or selection serialization.

## 20. Implementation order after design merge

1. pure ScreenPoint/box/lasso utilities and fixtures;
2. `SelectionController.applyMany()` and one-event tests;
3. exact projected geometry-intersection predicates;
4. MapLibre candidate resolver and Store-order normalization;
5. unified region adapter replacing immediate Shift capture;
6. DOM/SVG overlay and pointer lifecycle;
7. explicit public box/lasso API;
8. Playground controls and instructions;
9. actual Chromium flows;
10. measured benchmark report;
11. documentation and immutable implementation handover;
12. current-head CI, Ready review and squash merge.
