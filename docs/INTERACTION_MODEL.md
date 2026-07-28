# PlotLibre Interaction Model

## 1. Purpose

PlotLibre separates semantic interaction state from the map engine. Drawing and editing rules are implemented as pure, engine-independent sessions that can be tested without DOM, WebGL or MapLibre.

The interaction package currently provides:

```text
TwoPointDrawSession
MultiPointDrawSession
```

Both return semantic `PlotFeatureInput` snapshots. Neither writes to the Store nor renders a layer.

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
- it must not import MapLibre, DOM types or browser globals;
- sessions receive geographic `Position` values rather than screen pixels;
- the MapLibre adapter owns event translation, hit testing and rendering;
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

All control points and serializable property records are copied before they are returned.

## 4. Shared session guarantees

All sessions obey these rules:

1. `ready` and `drawing` are non-terminal states;
2. `completed` and `cancelled` are terminal states;
3. terminal sessions ignore subsequent input;
4. invalid or duplicate points do not create invalid features;
5. drafts are emitted only when they satisfy the symbol's minimum semantic point count;
6. pointer previews never modify committed control points;
7. session completion produces one semantic feature, not rendered polygon vertices;
8. sessions do not create Store history entries;
9. parameters, style and metadata remain serializable;
10. Escape cancels a non-completed session.

## 5. TwoPointDrawSession

State transitions:

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

Rules:

- the first point is not rendered as an invalid arrow;
- a preview exists only after a distinct second position is available;
- clicking the first location again does not complete;
- double-click follows the shared contract by delegating to normal two-point completion;
- the completed feature always contains exactly two semantic control points.

Current users:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

## 6. MultiPointDrawSession

`MultiPointDrawSession` supports symbols requiring three or more semantic control points.

Configuration:

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

Let:

```text
candidate = committed points + distinct pointer preview
```

A draft is returned only when:

```text
candidate.length >= minimumPoints
```

This prevents the registry and renderer from receiving a semantically invalid curved arrow during the first one or two clicks.

### 6.3 Click behavior

- clicks append copied semantic positions;
- a click identical to the last committed point is ignored;
- the pointer preview is cleared after a committed click;
- if `maximumPoints` is reached and `completeAtMaximum` is true, completion is automatic;
- fixed-point symbols can therefore use the same session without a separate state machine.

### 6.4 Enter completion

Enter uses the current candidate:

```text
committed points + distinct pointer preview
```

Completion occurs only when the candidate reaches `minimumPoints`.

### 6.5 Double-click completion

Double-click builds an immutable candidate array:

```text
candidate = copy(committed points)
if final point is distinct and capacity remains:
    candidate += final point
complete(candidate)
```

This design prevents two common errors:

- duplicating the last point because a browser double-click is preceded by click events;
- mutating the internal committed-point array while the completion transaction is reading it.

A regression test fixes the required behavior:

```text
click A
click B
doubleClick C
→ completed [A, B, C]
```

### 6.6 Point removal

Backspace and Delete remove exactly one committed point at a time:

```text
3 points → 2 points → 1 point → ready with 0 points
```

The pointer preview is cleared after each removal. This is local drawing-state undo and does not touch `CommandHistory` because the feature has not yet been committed.

### 6.7 Maximum point count

When `maximumPoints` is defined:

- no additional point or preview is accepted after capacity is reached;
- completion slices defensively to the configured maximum;
- default `completeAtMaximum = true` automatically completes fixed-count multi-point symbols;
- setting it to false allows explicit Enter or double-click completion at the maximum.

## 7. MapLibre event adapter

The current adapter translates:

```text
click      → DrawSession.click / plot selection
mousemove  → DrawSession.pointerMove / handle preview
mousedown  → start semantic handle drag
mouseup    → commit one ReplacePlotCommand
style.load → restore PlotLibre sources, layers and visual state
keydown    → session or selection keyboard action
```

The next integration step will add:

```text
dblclick → DrawSession.doubleClick
```

while preventing MapLibre's default double-click zoom during active multi-point drawing.

The adapter uses structural interfaces rather than importing MapLibre runtime classes. This keeps package tests lightweight and avoids forcing implementation types into the semantic layer.

## 8. Source separation

The renderer maintains:

### `plotlibre-committed`

Persistent plots derived from Store features.

### `plotlibre-draft`

The active drawing preview or control-handle drag preview. It is never exported as persistent data.

### `plotlibre-handles`

Semantic control points for the selected object. Generated polygon vertices are never exposed as editable handles.

This separation prevents high-frequency pointer events from rebuilding the persistent Store or generating history entries.

## 9. Completion transaction

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

Only a completed feature enters history. Pointer previews and point-by-point drawing-state removal do not.

## 10. Control-point drag transaction

```text
mousedown handle
→ capture original PlotFeature
→ disable map dragPan
→ pointerMove creates semantic preview
→ registry validation
→ draft + handle rendering
→ mouseup
→ one ReplacePlotCommand
→ clear draft
→ restore dragPan
```

Guarantees:

- committed Store state does not change during pointer movement;
- invalid previews are ignored;
- one drag produces one undo step;
- Escape restores the original feature without a command;
- handles follow Store undo/redo changes.

## 11. Selection and keyboard behavior

When not drawing, clicking committed fill or line layers selects the corresponding semantic object. Clicking empty space clears selection.

Cursor states:

```text
crosshair  active draw session
grab       pointer over selected handle / selected object
grabbing   active handle drag
empty      idle
```

The map canvas is keyboard-focusable.

## 12. Style lifecycle

Calling `map.setStyle()` removes application-added sources and layers. PlotLibre listens to `style.load` and restores:

1. committed, draft and handles sources;
2. rendering layers;
3. committed Store features;
4. the active draft;
5. selected semantic handles.

All renderer initialization methods are idempotent.

## 13. Current limitations

- the MapLibre adapter does not yet instantiate `MultiPointDrawSession` from a definition;
- `dblclick` is not yet wired to the active session;
- no curved-arrow definition exists yet;
- no dynamic centerline guide is rendered before the minimum point count is reached;
- no snapping or angle constraints;
- no touch-specific multi-point completion gesture;
- no box or lasso selection;
- no parameter handles;
- hit testing currently uses fill and line layers rather than a separate expanded hit-area layer.

## 14. Next extension: `arrow.curved`

The next vertical slice will:

1. add a clean-room curved-arrow geometry definition;
2. require at least three semantic control points;
3. create `MultiPointDrawSession` from `PlotDefinition.minPoints/maxPoints`;
4. wire MapLibre `dblclick` and suppress double-click zoom during drawing;
5. support Enter, Escape and point removal through the existing session contract;
6. expose every semantic control point as an editable handle;
7. add Playground instructions and a selector entry;
8. add Node geometry/PlotJSON tests and Chromium rendering tests.
