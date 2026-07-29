# PlotLibre Interaction Model

## 1. Purpose

PlotLibre separates semantic interaction state from the map engine. Drawing and editing rules are implemented as pure, engine-independent sessions that can be tested without DOM, WebGL or MapLibre.

The interaction package provides:

```text
TwoPointDrawSession
MultiPointDrawSession
```

Both return semantic `PlotFeatureInput` snapshots. Neither writes to Store nor renders a layer.

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

- `@plotlibre/interaction` depends only on `@plotlibre/core`;
- it does not import MapLibre, DOM types or browser globals;
- sessions receive geographic `Position` values rather than screen pixels;
- the MapLibre adapter owns event translation, hit testing, cursor state and rendering;
- only completed and fully validated semantic features may enter Store and CommandHistory.

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

A snapshot may contain:

- `draft`: a temporary semantic `PlotFeatureInput` candidate;
- `completed`: the final semantic feature input;
- only `status` when no candidate reaches minimum point count.

Sessions do not know symbol geometry. The adapter materializes candidates with Definition defaults and asks Registry for validity.

## 4. Shared guarantees

All sessions obey:

1. `ready` and `drawing` are non-terminal;
2. `completed` and `cancelled` are terminal;
3. terminal sessions ignore later input;
4. duplicate points do not create duplicate semantic controls;
5. draft output requires the Definition minimum semantic point count;
6. pointer preview never mutates committed session points;
7. completion returns semantic controls, not polygon vertices;
8. sessions do not create Store history entries;
9. parameters, style and metadata remain serializable;
10. Escape cancels a non-completed session.

## 5. TwoPointDrawSession

```text
ready
  └─ click(start) → drawing

drawing
  ├─ pointerMove(end) → drawing + draft
  ├─ click(end)       → completed
  ├─ doubleClick(end) → completed
  ├─ Enter            → completed using preview end
  ├─ Backspace/Delete → ready
  └─ Escape           → cancelled
```

Current users:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

The completed feature always contains exactly two semantic controls.

## 6. MultiPointDrawSession

`MultiPointDrawSession` serves Definitions requiring three or more semantic points.

```text
ready
  └─ click(point 1) → drawing

drawing
  ├─ click(point n)      → append committed semantic point
  ├─ pointerMove(cursor) → preview candidate
  ├─ Enter               → complete valid candidate
  ├─ doubleClick(point)  → complete valid candidate
  ├─ Backspace/Delete    → remove one committed point
  ├─ maximum reached     → optional automatic completion
  └─ Escape              → cancelled
```

Candidate rule:

```text
candidate = committed points + distinct pointer preview
```

A semantic draft snapshot exists only when candidate length reaches `minimumPoints`. Geometry validity is checked later by Registry.

Current users:

```text
arrow.curved
arrow.attack
```

For `arrow.curved`:

```text
0       = tail center
1..n-2  = path controls
n-1     = exact tip
```

For `arrow.attack`:

```text
0 + 1   = exact tail edges
2..n-2  = attack-spine controls
n-1     = exact objective/tip
```

## 7. Enter, double-click and point removal

Enter completes the current valid candidate.

Double-click uses an immutable candidate copy and de-duplicates the final point because browsers usually emit click events before `dblclick`.

Backspace/Delete removes one uncommitted semantic point at a time. This is local drawing-state undo and does not touch `CommandHistory`.

Additional points and previews beyond `maximumPoints` are ignored. `completeAtMaximum` supports fixed-count symbols; Definitions with `completeOnDoubleClick` retain explicit completion.

## 8. Definition-driven session selection

`MapLibrePlotInteraction.startDraw()` reads:

```text
PlotDefinition.controlSchema.minPoints
PlotDefinition.controlSchema.maxPoints
PlotDefinition.controlSchema.completeOnDoubleClick
```

Selection rule:

```text
minPoints = 2 and maxPoints = 2
→ TwoPointDrawSession

otherwise
→ MultiPointDrawSession
```

The adapter does not hard-code symbol identifiers.

## 9. MapLibre event adapter

The adapter translates:

```text
click      → DrawSession.click / plot selection
mousemove  → DrawSession.pointerMove / handle preview
dblclick   → DrawSession.doubleClick
mousedown  → start semantic handle drag
mouseup    → commit one ReplacePlotCommand
style.load → restore sources, layers and visual state
keydown    → session or selection keyboard action
```

During active drawing:

- mouse events are converted to WGS84 `Position` values;
- double-click default behavior is prevented and propagation stopped;
- MapLibre double-click zoom is disabled and its previous state is remembered;
- cancellation and destroy restore zoom immediately;
- completion defers restoration until the current native `dblclick` event has ended.

### Why completion restoration is deferred

Real Chromium trace showed that enabling MapLibre double-click zoom inside PlotLibre's completion callback was too early. MapLibre's default handler could still observe the re-enabled state later in the same event dispatch and execute a 2× zoom.

Current lifecycle:

```text
dblclick begins
→ PlotLibre handler prevents default and completes semantic feature
→ zoom remains disabled for the rest of the event dispatch
→ next task restores the remembered state
```

If another draw session starts before the deferred callback, the new session remains authoritative and zoom is not incorrectly enabled.

## 10. Source separation

### `plotlibre-committed`

Persistent plots derived from Store features.

### `plotlibre-draft`

The active drawing preview or handle-drag preview. It is never exported.

### `plotlibre-handles`

Semantic control points for the selected object. Generated curve samples and polygon vertices are not editable handles.

`map.querySourceFeatures()` may return tile duplicates. Handle tests must compare unique `plotId + handleIndex` identities.

## 11. Completion transaction

```text
session completed
→ PlotFeatureInput
→ merge Definition defaults
→ Registry validation
→ CreatePlotCommand
→ PlotStore
→ committed renderer
→ select new object
→ render semantic handles
```

For topology-sensitive Definitions such as `arrow.attack`, Registry validation must include complete geometry renderability, not only point and parameter checks.

## 12. Handle-drag transaction

```text
mousedown semantic handle
→ capture original PlotFeature
→ disable dragPan
→ pointerMove builds semantic preview
→ Registry validation
→ valid draft + handles rendering
→ mouseup
→ one ReplacePlotCommand
→ clear draft
→ restore dragPan
```

Guarantees:

- Store does not change during pointer movement;
- invalid previews are ignored and the last valid preview remains active;
- one valid drag produces one undo step;
- Escape restores the original feature without a command;
- every curved or attack semantic control is editable;
- moving a control regenerates geometry from semantic state.

### Renderability validation and partial-commit prevention

A Definition may pass lightweight checks but still fail during geometry generation. If that failure is first discovered by a synchronous Store render listener, Store may already contain the replacement while `CommandHistory.execute()` has not yet pushed the command.

Therefore topology-sensitive Definitions must include generation-equivalent validation before command execution. `attackArrowDefinition.validate()` returns `INVALID_ATTACK_ARROW_GEOMETRY` for self-intersecting or otherwise non-generatable candidates, preventing Store mutation and History inconsistency.

## 13. Selection, cursor and keyboard

When not drawing, clicking committed fill or line layers selects the corresponding semantic object. Clicking empty space clears selection.

```text
crosshair  active draw session
grab       selected object or handle hover
grabbbing  active handle drag
empty      idle
```

The map canvas is keyboard-focusable.

## 14. Style lifecycle

Calling `map.setStyle()` removes application-added sources and layers. PlotLibre restores:

1. committed, draft and handles sources;
2. rendering layers;
3. committed Store features;
4. active draft;
5. selected semantic handles.

All renderer initialization methods are idempotent.

## 15. Current limitations

- no visible guide before a multi-point candidate reaches minimum semantic validity;
- no snapping or angle constraints;
- no touch-specific double-tap/finish gesture;
- no control-point insertion/removal after a feature is committed;
- no box or lasso selection;
- no parameter handles for width, head length, neck, body bulge or tension;
- invalid previews are ignored but the Playground does not yet surface detailed validation messages;
- hit testing currently uses fill and line layers rather than a separate expanded hit-area layer;
- Core Store listener exceptions do not yet have a general transaction rollback mechanism.

## 16. Next extension: `arrow.attack.tailed`

The next multi-point slice reuses the current interaction contract and `AttackArrowFrame`:

1. preserve exact two-edge tail and spine controls;
2. add an independent inward swallowtail closing strategy;
3. validate notch depth/width and topology;
4. preserve flat-tail attack golden behavior;
5. complete PlotJSON, Playground and Chromium coverage;
6. keep one valid tail/spine drag as one undoable command;
7. do not copy the complete flat-tail generator.
