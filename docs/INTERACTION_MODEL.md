# PlotLibre Interaction Model

## 1. Purpose

PlotLibre separates semantic interaction state from the map engine. Drawing and editing rules are pure, engine-independent sessions testable without DOM, WebGL or MapLibre.

```text
TwoPointDrawSession
MultiPointDrawSession
```

Sessions return semantic snapshots. They do not write Store or render layers.

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

Rules:

- interaction depends only on Core;
- no MapLibre, DOM or browser globals in sessions;
- sessions receive geographic Positions, not screen pixels;
- MapLibre adapter owns event translation, hit testing, cursor and rendering;
- only fully validated/generated semantic features enter Store and History;
- session selection comes from `PlotDefinition.controlSchema`, never identifiers.

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

A non-terminal snapshot may contain:

- temporary semantic `draft`;
- structured `rejection` from the latest completion attempt;
- both when an invalid fixed-count final point remains visible;
- neither when a complete candidate does not yet exist.

A completed snapshot contains authored semantic controls only. The adapter merges Definition defaults, canonicalizes controls, validates and performs Registry generation preflight.

## 4. Completion validation

`validateCompletion` accepts:

```ts
type DrawCompletionValidationResult = boolean | ValidationResult;
```

Rules:

1. `true` or valid result completes;
2. `false` returns `DRAW_COMPLETION_REJECTED`;
3. invalid result preserves stable issues in `snapshot.rejection`;
4. a thrown validator becomes `DRAW_COMPLETION_VALIDATION_FAILED`;
5. unexpected generation failure becomes `DRAW_CANDIDATE_GENERATION_FAILED`;
6. rejection is non-terminal and never mutates Store, History or PlotJSON.

## 5. Shared guarantees

1. `ready` and `drawing` are non-terminal;
2. `completed` and `cancelled` are terminal;
3. terminal sessions ignore later input;
4. duplicate pointer positions do not create duplicate controls;
5. Definition-derived draft controls are rendering-only;
6. completion returns authored controls, never transient controls or Polygon vertices;
7. sessions create no Store history;
8. rejected fixed-count candidates remain visible and replaceable;
9. pointer movement, point removal, cancellation and success clear stale rejection;
10. automatic closure, mirror points, derived tails, closure anchors and secondary heads remain derived;
11. invalid candidates retain last-valid draft or semantic guide where available.

## 6. TwoPointDrawSession

```text
ready
  └─ click(start) → drawing

drawing
  ├─ pointerMove(end) → drawing + draft
  ├─ click(valid end) → completed
  ├─ click(invalid end) → drawing + rejection
  ├─ Enter → attempt with preview end
  ├─ Backspace/Delete → ready
  └─ Escape → cancelled
```

Current users:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

## 7. MultiPointDrawSession

```text
ready
  └─ click(point 1) → drawing

drawing
  ├─ click(point n) → append authored point
  ├─ pointerMove(cursor) → preview candidate
  ├─ Definition draft → optional transient complete draft
  ├─ Enter → explicit completion attempt
  ├─ doubleClick(point) → explicit completion attempt
  ├─ maximum valid → automatic completion
  ├─ maximum invalid → drawing + rejection
  ├─ Backspace/Delete → remove one authored point
  └─ Escape → cancelled
```

Normal candidate:

```text
committed authored points + distinct pointer preview
```

Transient draft controls may satisfy a Definition minimum for rendering, but are never copied into session points and cannot be committed by Enter, double-click or maximum completion.

Current users:

```text
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
arrow.pincer
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
area.closed-curve
area.gathering-place
```

## 8. Completion modes by semantic group

### Variable path arrows

```text
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
```

Double-click or Enter completes. Browser click-before-dblclick behavior is de-duplicated so the terminal point is persisted once.

### Fixed compound arrows

```text
arrow.double  maxPoints = 4
arrow.pincer  maxPoints = 5
```

The maximum valid click automatically completes. Invalid maximum candidates remain active with structured rejection.

### Closed curve area

```text
plotType: area.closed-curve
minPoints: 3
maxPoints: 64
completion: double-click or Enter
```

Controls are ordered boundary waypoints. Pointer movement after two committed points can produce the first complete closed Polygon draft using the live third candidate. Completion persists only authored controls; ring closure and sampled vertices remain derived.

Double-click de-duplicates the final browser click and never appends the repeated first ring coordinate.

### Gathering place

```text
plotType: area.gathering-place
minPoints: 3
maxPoints: 3
completion: automatic on third click
```

Controls are flank A, front crown and flank B. After two clicks the live pointer is the third authored candidate and can produce a full draft. The third valid click completes automatically. A derived rear closure anchor has no session point, handle or history identity.

## 9. Canonical semantic models

```text
arrow.curved:
  tail centre, path controls, exact tip

arrow.attack / arrow.attack.tailed:
  two exact tail edges, spine controls, exact objective

arrow.double:
  unordered tail pair + unordered objective pair

arrow.pincer:
  outer tails + canonical objective pair + exact inner junction

arrow.squad-combat:
  tail centre + optional path + exact objective

arrow.route:
  route origin + path + exact tip

arrow.corridor:
  endpoint A + path + endpoint B

arrow.route.bidirectional:
  exact start tip + path + exact end tip

arrow.route.double-head:
  route origin + path + exact primary tip

area.closed-curve:
  ordered boundary waypoints

area.gathering-place:
  flank A + front crown + flank B
```

Derived mirrored objectives, tail edges, route heads, secondary emphasis heads, sampled boundaries and rear closure anchors are not interaction controls.

## 10. Enter, double-click and point removal

- Enter completes the current actual authored candidate.
- Enter never commits Definition-derived transient controls.
- Double-click creates an immutable de-duplicated candidate.
- Backspace/Delete removes one uncommitted authored point.
- Drawing-state point removal is not CommandHistory.
- Fixed-count Definitions complete through maximum-point logic.
- Variable-count Definitions complete explicitly.

## 11. Definition-driven session selection

```text
minPoints = 2 and maxPoints = 2
→ TwoPointDrawSession

otherwise
→ MultiPointDrawSession
```

No branch may select by `plotType`. A variable schema may use `minPoints = 2` only with explicit `maxPoints > 2`.

## 12. MapLibre event adapter

```text
click      → DrawSession.click / selection
mousemove  → DrawSession.pointerMove / handle preview
dblclick   → DrawSession.doubleClick
mousedown  → start semantic handle drag
mouseup    → commit one ReplacePlotCommand
style.load → restore sources, layers and visual state
keydown    → session or selection action
```

During drawing:

- events convert to WGS84 Positions;
- double-click default is prevented;
- double-click zoom is disabled and previous state remembered;
- completion defers restoration until the native event finishes;
- cancellation and destroy restore immediately;
- invalid temporary geometry keeps last-valid draft or guide;
- `drawRejection` exposes the latest completion rejection.

## 13. Playground listener precedence

`PlaygroundApp.start()` binds generic lifecycle/status listeners first. Symbol-group installers bind semantic guidance afterwards.

This order is required because generic map refresh text such as “继续点击” must not overwrite:

- pincer actionable fifth-point rejection;
- fixed-count automatic completion instructions;
- route/corridor semantic guidance;
- closed-area automatic closure instructions.

Production then calls the fully wrapped `loadSample()` once to load all sixteen samples. E2E starts empty and enables optional symbol groups by query flags.

## 14. Source separation

### `plotlibre-committed`

Persistent derived output from Store features.

### `plotlibre-draft`

Active drawing or handle-drag preview; never exported.

### `plotlibre-handles`

Authored controls of the selected committed object.

### Semantic guides

Transient visibility aids when full geometry is not yet renderable.

`querySourceFeatures()` can return tile duplicates. Handle tests compare unique `plotId + handleIndex` identities.

## 15. Completion transaction

```text
completion attempt
→ merge defaults
→ canonicalize authored controls
→ Registry validation
→ invalid: rejection, no mutation
→ valid: full Registry generation
→ completed PlotFeatureInput
→ CreatePlotCommand
→ PlotStore
→ committed renderer
→ selection + authored handles
```

For closed areas, generated ring closure, winding and topology are part of the preflight.

## 16. Handle-drag transaction

```text
mousedown authored handle
→ capture original feature
→ disable dragPan
→ pointerMove builds semantic preview
→ Registry validation + generation
→ valid draft + handles
→ mouseup
→ one ReplacePlotCommand
→ clear draft
→ restore dragPan
```

Invalid previews never mutate Store. Escape restores the original feature without a command.

## 17. Selection, cursor and keyboard

```text
crosshair  active draw
grab       selected object or handle hover
grabbing   active handle drag
empty      idle
```

The canvas is keyboard-focusable. Clicking committed fill/line selects the semantic feature; clicking empty space clears selection.

## 18. Style lifecycle

`map.setStyle()` removes application Sources/Layers. PlotLibre restores committed features, active valid draft and selected authored handles. Renderer initialization is idempotent.

## 19. Current limitations

- no snapping or angle constraints;
- no touch-specific completion gesture;
- no committed control insertion/removal UI despite schema capability metadata;
- no box/lasso selection;
- no multi-object transform transaction;
- no parameter handles for width, bearings, tension or rear depth;
- rejection describes completion attempts, not every temporary pointer position;
- hit testing lacks a fully independent expanded hit-area path;
- Store listener exceptions lack general transaction rollback;
- transient draft API exposes one replacement control set rather than alternatives;
- no hole editing or MultiPolygon Area Definition;
- no geodesic closed-area mode for global extents.

## 20. Next interaction milestone

After 006I merge, 006J arc/sector/lune design must determine:

- fixed versus variable control count;
- center/radius/bearing authored roles;
- clockwise/counterclockwise direction;
- whether third click auto-completes;
- whether arc is LineString while sector/lune are Polygon;
- exact endpoint and center handle behavior;
- geodesic versus local-metre completion preflight.

No identifier-specific session branch should be added unless the generic schema cannot express a proven semantic requirement.
