# PlotLibre Interaction Model

## 1. Purpose

PlotLibre separates semantic interaction from the map engine. Drawing sessions operate on WGS84 authored controls and are testable without DOM, WebGL or MapLibre.

```text
TwoPointDrawSession
MultiPointDrawSession
```

Sessions return snapshots; they do not write Store, History or render layers.

## 2. Package boundary

```text
@plotlibre/core
       ↑
@plotlibre/interaction
       ↑
@plotlibre/maplibre
       ↑
MapLibre GL JS
```

- interaction depends only on Core;
- session choice comes from `PlotDefinition.controlSchema`;
- MapLibre owns event translation, hit testing, cursor and Sources/Layers;
- only fully canonicalized, validated and generated features enter Store and History.

## 3. DrawSession contract

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

A non-terminal snapshot may contain a temporary complete draft, a structured rejection, both, or neither. Completed snapshots contain authored controls only.

## 4. Completion validation

```ts
type DrawCompletionValidationResult = boolean | ValidationResult;
```

Rules:

1. valid result completes;
2. invalid result preserves stable issues in `snapshot.rejection`;
3. thrown validation becomes `DRAW_COMPLETION_VALIDATION_FAILED`;
4. generation failure becomes `DRAW_CANDIDATE_GENERATION_FAILED`;
5. rejection is non-terminal and never mutates Store, History or PlotJSON;
6. a rejected fixed-count final candidate remains replaceable.

## 5. Shared guarantees

- terminal sessions ignore later input;
- duplicate pointer positions do not create duplicate controls;
- Definition-derived draft controls are rendering-only;
- completion returns authored controls, never samples, rings, endpoints or guide paths;
- pointer movement, point removal, cancellation, a new session and successful completion clear stale rejection;
- invalid pointer geometry retains the last valid draft or an incomplete guide;
- automatic closures, mirrored points, route heads, circular centers/radii and semantic guides remain derived.

## 6. Session selection

```text
minPoints = 2 and maxPoints = 2
→ TwoPointDrawSession

otherwise
→ MultiPointDrawSession
```

No session branch may select by `plotType`.

## 7. Current completion modes

### Exact two-point

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

Second valid click completes.

### Variable multi-point

```text
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
area.closed-curve
```

Double-click or Enter completes. Browser click-before-dblclick behavior is de-duplicated.

### Fixed four/five

```text
arrow.double  maxPoints = 4
arrow.pincer  maxPoints = 5
```

Maximum valid click automatically completes. Invalid maximum candidates remain active with structured rejection.

### Fixed three

```text
area.gathering-place
line.circular-arc
area.circular-segment
area.sector
```

```text
first click  → one authored control
second click → two authored controls
third pointer candidate → first complete renderable draft
third valid click → automatic completion
```

Two-point geometry is never committed as a fallback.

## 8. Circular interaction semantics

### Circular arc

```text
0 start
1 through
2 end
```

The through-point selects the exact minor/major directed sweep. Third click completes one open LineString.

### Circular segment

```text
0 arc/chord start
1 through on selected arc
2 arc/chord end
```

Third click completes one arc-plus-chord Polygon.

### Sector

```text
0 center
1 exact radius/start point
2 end-bearing handle
```

The third control is authored even though it usually does not lie on the rendered arc endpoint. Its distance from the center does not affect radius.

## 9. Definition-driven semantic guide paths

Core hook:

```ts
interface PlotDefinition {
  deriveSemanticGuidePaths?(
    feature: PlotFeature,
  ): readonly (readonly Position[])[];
}
```

This hook describes transient paths that explain authored semantic controls after a complete feature can already be generated.

Sector returns:

```text
center → end-bearing handle
```

Guarantees:

- pure WGS84 path output;
- no Store or History identity;
- no committed RenderBundle role;
- no PlotJSON serialization;
- no hit-test selection identity;
- invalid/non-finite paths are ignored by renderer;
- map-engine adapter chooses visual styling.

## 10. MapLibre rendering of guides

Sources:

```text
plotlibre-committed
plotlibre-draft
plotlibre-handles
```

Layer:

```text
plotlibre-handle-guide
```

Guide placement:

- complete drawing draft: appended to `plotlibre-draft` and rendered through the draft line layer;
- selected feature: appended to `plotlibre-handles` and rendered through `plotlibre-handle-guide`;
- handle-drag preview: draft geometry and selected-state guide are refreshed from the preview feature;
- committed source: never contains semantic guide features.

Guide properties use:

```text
role = "line"
handleKind = "semantic-guide"
```

The dashed layer is not queryable as a control handle because handle hit testing targets only `plotlibre-handle` circle features.

## 11. Completion transaction

```text
completion attempt
→ merge defaults
→ canonicalize authored controls
→ Registry validation
→ full Registry generation
→ invalid: rejection, no mutation
→ valid: PlotFeatureInput
→ CreatePlotCommand
→ Store
→ committed renderer
→ selection + authored handles + optional semantic guides
```

Circular generation includes coordinate-mode, circumcircle, sweep and topology validation.

## 12. Handle-drag transaction

```text
mousedown authored handle
→ capture original feature
→ disable dragPan
→ pointerMove builds preview controls
→ Registry validation + generation
→ valid draft + semantic guides + authored handles
→ mouseup
→ one ReplacePlotCommand
→ clear draft
→ restore dragPan
```

Invalid previews never mutate Store. Escape restores the original feature without a command.

For Sector, dragging control `2` updates the radial guide and sweep while retaining the exact radius from control `1`.

## 13. MapLibre event adapter

```text
click      → DrawSession.click / selection
dblclick   → DrawSession.doubleClick
mousemove  → pointer draft / handle preview
mousedown  → start authored-handle drag
mouseup    → commit one replacement
style.load → restore sources, eight layers and visual state
keydown    → completion, removal, cancellation or selection action
```

Multi-point drawing temporarily disables double-click zoom. Completion restores it after the native event finishes; cancellation and destroy restore immediately.

## 14. Style lifecycle

`map.setStyle()` removes application Sources/Layers. PlotLibre restores:

- three Sources;
- committed fill/line/point layers;
- draft fill/line/point layers;
- `plotlibre-handle-guide`;
- `plotlibre-handle`;
- committed features;
- active valid draft;
- selected authored handles and semantic guides.

Renderer initialization is idempotent. Current layer count is 8.

## 15. Playground listener precedence

`PlaygroundApp.start()` binds generic lifecycle/status listeners first. Symbol-group installers bind specialized guidance afterwards so generic messages cannot overwrite actionable pincer, closed-area or circular instructions.

Production calls the fully wrapped `loadSample()` once and loads 19 features. E2E starts empty and enables optional groups through query flags.

## 16. Canonical semantic models

```text
arrow.curved:
  tail center + path + exact tip

arrow.attack / arrow.attack.tailed:
  exact tail pair + spine + exact objective

arrow.double:
  tail pair + objective pair

arrow.pincer:
  outer tails + paired objectives + exact inner junction

arrow.squad-combat:
  tail center + path + exact objective

arrow.route / corridor / multi-head routes:
  authored center path with Definition-specific endpoint roles

area.closed-curve:
  ordered boundary waypoints

area.gathering-place:
  flank + crown + flank

line.circular-arc:
  exact start + through + end

area.circular-segment:
  exact arc/chord start + through + arc/chord end

area.sector:
  center + exact radius/start + end-bearing handle
```

All samples, widths, centers, radii, sweeps, closure points, endpoints and guides are derived.

## 17. Current limitations

- no snapping or angle constraints;
- no touch-specific completion gesture;
- no committed point insertion/removal UI;
- no box/lasso or multi-selection;
- no multi-object transform transaction;
- no parameter handles for width, radius, sweep, tension or rear depth;
- rejection describes explicit completion attempts rather than every pointer location;
- no holes or MultiPolygon editing;
- no geodesic circular/closed-area mode;
- no general Store transaction rollback.

## 18. Next interaction milestone

After PR #34 merges, Milestone 007 must first freeze a professional editing model for multi-selection, box/lasso selection, whole-object translation, rotation/scale pivots, groups/locks, multi-object commands and atomic rollback. It must preserve authored controls as the transform source and avoid manipulating generated Polygon vertices directly.
