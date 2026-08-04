# PlotLibre Development Handover — Milestone 007B Box and Lasso Selection Design

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
Base `main`：`d08c56b6687ea64e0c599fd04fd77115d320d8f2`  
分支：`agent/007b-box-lasso-design`  
Workspace：`0.0.21`  
状态：007B screen-space box/lasso semantic and algorithm design frozen as a documentation-only candidate；runtime prohibited

## Purpose

Milestone 007B extends the merged 007A ordered-selection foundation with region selection while preserving PlotLibre's canonical authored-control model.

The design freezes:

```text
box/lasso screen session
input arbitration
one-event multi-id intent
MapLibre broad-phase candidates
exact projected semantic-geometry narrow phase
DOM/SVG region overlay
cancellation and rejection policy
performance and validation boundary
```

No runtime, package version, public symbol, Store schema or PlotJSON change belongs on this branch.

## Current state

```text
main:               d08c56b6687ea64e0c599fd04fd77115d320d8f2
workspace:          0.0.21
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         219
Chromium tests:     30
MapLibre Sources:   4
MapLibre Layers:    10
007A runtime PR:    #38
007A finalization:  #39
```

## Canonical boundary

Region selection changes only transient `SelectionController` state.

It never changes:

```text
PlotFeature values
PlotFeature revision
Store/document order
CommandHistory
PlotJSON
Definition RenderBundle
```

Screen points, region bounds, lasso paths, projected candidate geometry, MapLibre query results, DOM overlays and rejections remain derived/transient.

## Input conflict identified

The merged 007A `MapLibreSelectionModifierCapture` applies Shift-add on `mousedown` because MapLibre box zoom can suppress the later click.

007B needs:

```text
Shift + drag starting on empty selectable space
→ additive box selection
```

Immediate mousedown mutation makes thresholded click-versus-box arbitration impossible. Runtime must replace the existing capture adapter with one unified region-selection adapter rather than add parallel listeners.

The replacement must arm on pointer down, wait for threshold, and commit exactly one click or region intent on pointer up.

## Region modes

Frozen modes：

```text
neutral Shift-empty primary drag → one-shot additive box
explicit one-shot box mode       → default replace
explicit one-shot lasso mode     → default replace
```

Explicit mode supports add、toggle and subtract through modifier override.

Modifier priority：

```text
Alt > Ctrl/Cmd > Shift > configured default
```

Intent is captured at pointer down and remains fixed during the gesture.

Lasso is explicit-mode only. Primary mouse/pen input is supported first; touch is deferred.

## Gesture priority

```text
active drawing
> authored-handle drag
> active whole-selection translation
> active region gesture
> explicit region mode
> neutral Shift-empty box arm
> selected-body translation
> click selection
> camera gesture
```

Convenience box starts only when pointer down does not hit a handle or plot body. Shift click on a plot remains additive click selection.

## Engine-independent screen session

Candidate types：

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

A pure interaction session captures and validates screen geometry only. It never queries MapLibre or mutates SelectionController.

## Box policy

```text
activation threshold: Euclidean movement >= 4 CSS px
completion:           pointer up
valid rectangle:      positive width and height
```

Sub-threshold or degenerate gestures are no-ops.

Valid empty result：

```text
replace  → clear selection
add      → no-op
subtract → no-op
toggle   → no-op
```

Selection does not update continuously during box drag in version 1.

## Lasso policy

```text
sample spacing:       2 CSS px
minimum distinct pts: 3
minimum area:         16 CSS px²
RDP tolerance:        1.5 CSS px
```

Validation order：

```text
raw sampled path
→ consecutive duplicate removal
→ repeated non-consecutive vertex rejection
→ non-adjacent crossing/touch/overlap rejection
→ RDP simplification
→ simplified closed-ring validation
```

Simplification cannot hide an invalid raw loop.

Invalid completion：

- changes no selection；
- emits no selection event；
- keeps rejection path visible transiently；
- keeps explicit lasso mode armed for one retry；
- clears rejection on next pointer down；
- Escape exits and removes overlay。

## One-event multi-id selection

Region selection must not call per-id selection methods.

Candidate API：

```ts
selection.applyMany(
  ids: readonly string[],
  intent: SelectionIntent,
  reason: "box" | "lasso",
): SelectionSnapshot;
```

Input ids are validated and deduplicated before mutation and supplied in Store/document order.

Frozen algorithms：

```text
replace  = candidates
add      = current + candidates not already selected
subtract = current survivors
 toggle  = current survivors + newly selected candidates
```

One effective region completion emits one immutable SelectionChange. No-op emits nothing. Region selection never creates a History entry.

## Broad phase

MapLibre's rendered index is the initial broad phase：

```text
region bounding box
→ queryRenderedFeatures on committed fill/line/point layers
→ read plotId
→ deduplicate
→ filter existing Store ids
→ reorder by Store/document order
```

Excluded：

```text
selection overlays
drafts
handles
guides
labels
region overlay
```

MapLibre return order and tile/render duplicates are never semantic selection order.

No second persistent spatial index is added before measured evidence and an explicit invalidation design.

## Exact projected narrow phase

Every unique broad-phase candidate is regenerated from canonical Store state：

```text
Registry.generate(feature)
→ fills + lines + points
→ map.project generated coordinates
→ exact screen-region intersection
```

Frozen predicates：

- Point center inside/on region；
- LineString/MultiLineString segment intersection or contained vertex；
- Polygon/MultiPolygon crossing and containment with holes respected；
- compound PlotFeature selected once when any component intersects；
- boundaries inclusive；
- CSS line width、dash and point radius ignored；
- labels、guides、drafts and selection overlays ignored；
- generated samples authoritative for curved paths。

Query、generation or projection failure rejects the entire completion. Partial selection is prohibited.

## DOM/SVG overlay

Box and lasso guides are screen UI and use an absolutely positioned DOM/SVG overlay attached to the map container.

Requirements：

```text
CSS-pixel coordinates
pointer-events:none
aria-hidden:true
clipped to map container
removed on complete/cancel/destroy
independent of style.load
```

007B version 1 adds no GeoJSON Source or Layer. The merged 4/10 baseline remains unchanged.

## Lifecycle

The unified adapter uses capture-phase pointer events and pointer capture.

Cancel active region without selection mutation on：

```text
Escape
pointercancel / lost pointer capture
style.load
resize
camera movement start
Store change
external selection revision change
draw/import/clear/undo/redo
destroy
```

During active gesture：

- capture prior dragPan state；
- disable dragPan；
- own the existing boxZoom disable/restore lifecycle；
- restore state exactly once；
- suppress synthetic post-drag click；
- leave no overlay or capture behind。

Explicit mode hides Primary handles/guides while preserving selection overlays and restores them on exit.

## Stable rejection codes

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

Empty candidates are valid outcomes, not rejection.

## Performance boundary

Expected first-runtime pipeline：

```text
MapLibre broad query
→ unique candidate ids C
→ Registry generation/project/intersection only for C
```

The implementation must not regenerate all Store features when `C` is smaller than document size.

Measured fixtures：

```text
100 features
1,000 features
10,000 features
```

Each report records hardware、OS、browser、viewport、zoom/pitch/bearing、feature mix、generated vertices、candidate count、query time、exact-test time、total latency、median and p95 after warmup。

No hard public latency guarantee is frozen before measurement.

## Required tests

### Pure Node

- box normalization in every direction；
- threshold/degenerate/empty behavior；
- lasso sampling、area、RDP and topology；
- bow-tie、repeat、touch and overlap rejection；
- Point/Line/MultiLine predicates；
- Polygon containment/crossing/hole exclusion；
- MultiPolygon/compound any-component hit；
- boundary inclusion；
- applyMany intent order and Primary behavior；
- one event/no-op；
- fail-closed generation/projection。

### MapLibre and Chromium

- Shift click still adds after immediate mousedown mutation is removed；
- neutral Shift-empty additive box；
- explicit box replace and modifier overrides；
- explicit lasso lifecycle and invalid retry；
- lasso removes bounding-box false positives；
- DOM overlay and pointer/camera cleanup；
- committed-layer-only query；
- duplicate/query-order normalization；
- no History mutation；
- region selection followed by translation/delete/undo；
- all historical 219 Node / 30 Chromium regressions。

## Reference evidence

```text
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52
ISC-style license, Copyright Mapbox
observed: boxSelect option、Shift-mousedown arm、dragPan ownership、DOM rectangle、bounds query、id dedup

JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b
MIT License, Copyright 2022 James Milner
observed: explicit selection mode and adapter separation

geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c
MIT License, Copyright 2024 Geoman
observed: explicit edit/tool mode separation

maplibre/maplibre-gl-js@v6.0.0
BSD-3-Clause, Copyright MapLibre contributors
observed: screen PointLike、project/queryRenderedFeatures/layer-filter adapter boundary
```

Code reuse：`none`。

PlotLibre independently specifies exact semantic-geometry narrow phase、hole-aware topology、Store-order selection、one-event batch intent and canonical authored-state boundaries。

## Documentation completed on this branch

```text
docs/design/box-lasso-selection.md
docs/algorithms/screen-region-selection.md
docs/design/README.md
docs/algorithms/README.md
docs/REFERENCE_LIBRARY_MATRIX.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/INTERACTION_MODEL.md
docs/handover/LATEST.md
this immutable handover
```

## Validation gate

This design PR must pass the unchanged exact-head baseline before Ready/merge：

```text
Node 20.19 success
Node 22 success
219 Node tests
Playground /PlotLibre/ build
handover contract
30 Chromium tests
zero unresolved review threads
```

## Next runtime branch

After design merge and post-merge finalization：

```text
agent/007b-box-lasso-selection
```

Implementation order：

1. pure screen and topology utilities；
2. `SelectionController.applyMany()`；
3. exact projected intersection；
4. candidate broad-phase resolver；
5. unified region adapter replacing immediate Shift capture；
6. DOM/SVG overlay；
7. public one-shot box/lasso API；
8. Playground、Chromium and measured benchmark report；
9. immutable implementation handover and current-head CI。

## Risks and decisions

- screen regions are not geographic document geometry；
- `queryRenderedFeatures` is broad phase only；
- semantic generated geometry, not CSS visual footprint, defines exact hit；
- candidate order is Store order；
- selection updates once and remains outside History；
- invalid query/generation/projection fails closed；
- active region cancels when screen/camera/document frame changes；
- custom persistent indexing is deferred pending measurement；
- touch is deferred；
- contain-only policy is deferred；
- packages remain `UNLICENSED`；
- branch deletion may require manual cleanup because the connector does not expose delete-ref here。

Continuation：finish the design PR, merge/finalize it, then implement 007B from the latest final `main`. Do not add runtime to this design branch。
