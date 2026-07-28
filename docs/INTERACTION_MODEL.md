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
- only completed semantic features may enter Store and CommandHistory.

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

- `draft`: a temporary valid `PlotFeatureInput` used for preview;
- `completed`: the final semantic feature input;
- only `status` when no valid preview exists.

All control points and serializable property records are copied before return.

## 4. Shared guarantees

All sessions obey:

1. `ready` and `drawing` are non-terminal;
2. `completed` and `cancelled` are terminal;
3. terminal sessions ignore later input;
4. invalid or duplicate points do not create invalid features;
5. draft output requires the definition's minimum semantic point count;
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

`MultiPointDrawSession` serves definitions requiring three or more semantic points.

```ts
interface MultiPointDrawSessionOptions {
  id: string;
  plotType: string;
  minimumPoints: number;       // integer >= 3
  maximumPoints?: number;      // integer >= minimumPoints
  completeAtMaximum?: boolean; // default true
  definitionVersion?: string;
  parameters?: Record<string, JsonValue>;
  style?: PlotStyle;
  metadata?: Record<string, JsonValue>;
}
```

### 6.1 State transitions

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

### 6.2 Draft validity

```text
candidate = committed points + distinct pointer preview
```

A draft exists only when:

```text
candidate.length >= minimumPoints
```

For `arrow.curved`, the first and second clicks therefore do not send an invalid Polygon candidate to Registry or renderer. The third candidate point creates the first valid draft.

### 6.3 Enter and double-click

Enter completes from the current candidate.

Double-click uses an immutable candidate copy:

```text
candidate = copy(committed points)
if final point is distinct and capacity remains:
    candidate += final point
complete(candidate)
```

This avoids duplicate final points and mutation coupling with browser click/double-click event order.

### 6.4 Point removal

Backspace/Delete removes one uncommitted semantic point at a time. This is local drawing-state undo and does not touch `CommandHistory`.

### 6.5 Maximum point count

When `maximumPoints` is defined:

- additional points and previews beyond capacity are ignored;
- completion defensively slices to the maximum;
- `completeAtMaximum = true` supports fixed-count multi-point symbols;
- explicit Enter/double-click completion remains available when automatic completion is disabled.

Current user:

```text
arrow.curved
```

## 7. Definition-driven session selection

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

The adapter does not hard-code symbol identifiers. Future attack, route and corridor definitions reuse the same boundary.

## 8. MapLibre event adapter

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
- MapLibre double-click zoom is disabled and its previous enabled state is remembered;
- zoom is restored on completion, cancellation or destroy.

The adapter uses structural interfaces rather than importing MapLibre runtime classes.

## 9. Source separation

### `plotlibre-committed`

Persistent plots derived from Store features.

### `plotlibre-draft`

The active drawing preview or handle-drag preview. It is never exported.

### `plotlibre-handles`

Semantic control points for the selected object. Generated curve samples and polygon vertices are not editable handles.

High-frequency pointer movement therefore does not rebuild persistent Store state or generate history entries.

## 10. Completion transaction

```text
session completed
→ PlotFeatureInput
→ merge definition defaults
→ registry validation
→ CreatePlotCommand
→ PlotStore
→ committed renderer
→ select new object
→ render semantic handles
```

Only completion enters history.

## 11. Handle-drag transaction

```text
mousedown semantic handle
→ capture original PlotFeature
→ disable dragPan
→ pointerMove builds semantic preview
→ registry validation
→ draft + handles rendering
→ mouseup
→ one ReplacePlotCommand
→ clear draft
→ restore dragPan
```

Guarantees:

- Store does not change during pointer movement;
- invalid geometry previews are ignored;
- one drag produces one undo step;
- Escape restores the original feature without a command;
- every `arrow.curved` path control is editable;
- moving an interior control changes the path while preserving tail and tip controls.

## 12. Browser event and Source caveats

### 12.1 Native double-click order

Browsers usually emit click events before `dblclick`. Session-level final-point de-duplication remains mandatory even when the adapter prevents default zoom.

### 12.2 Source Feature duplication

`map.querySourceFeatures()` may return duplicate tile copies. Semantic handle tests must use unique:

```text
plotId + handleIndex
```

rather than raw Feature count. Store `controlPoints.length` is authoritative.

## 13. Selection, cursor and keyboard

When not drawing, clicking committed fill or line layers selects the corresponding semantic object. Clicking empty space clears selection.

```text
crosshair  active draw session
grab       selected object or handle hover
grabbing   active handle drag
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
- no parameter handles for width, head length or tension;
- invalid previews are ignored but the Playground does not yet surface detailed validation messages;
- hit testing currently uses fill and line layers rather than a separate expanded hit-area layer.

## 16. Next extension: `arrow.attack`

The next multi-point slice will reuse the interaction contract but define a structurally distinct attack-arrow geometry:

1. clean-room semantic and provenance record;
2. attack-specific body/head/tail model;
3. shared multi-point frame only where it preserves independent symbol contracts;
4. PlotJSON full-path persistence;
5. double-click/Enter completion;
6. all semantic handles editable;
7. golden, degenerate and self-intersection tests;
8. Playground selector/sample;
9. Chromium actual rendering and interior-handle edit tests.
