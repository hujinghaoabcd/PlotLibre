# PlotLibre Interaction Model

## 1. Purpose

PlotLibre separates semantic interaction state from the map engine. The goal is to make drawing and editing rules testable without WebGL, while allowing MapLibre to provide screen events, hit testing, cursor state and rendering.

The current implementation establishes the first complete two-point symbol interaction. Future multi-point arrows, regions, flags and military control measures will reuse the same boundaries.

## 2. Package boundary

```text
@plotlibre/interaction
    engine-independent sessions
            ↓
@plotlibre/maplibre
    event translation and rendering
            ↓
MapLibre GL JS
```

`@plotlibre/interaction` depends only on `@plotlibre/core`. It must not import MapLibre, DOM types or browser globals.

## 3. DrawSession contract

A session receives semantic geographic positions and returns snapshots:

```ts
interface DrawSession {
  readonly status: "ready" | "drawing" | "completed" | "cancelled";
  snapshot(): DrawSessionSnapshot;
  click(position: Position): DrawSessionSnapshot;
  pointerMove(position: Position): DrawSessionSnapshot;
  keyDown(key: string): DrawSessionSnapshot;
  cancel(): DrawSessionSnapshot;
}
```

A snapshot may contain:

- `draft`: a temporary `PlotFeatureInput` for preview;
- `completed`: the final semantic feature input;
- status only when no valid preview exists.

The session never writes to the Store and never renders a map layer.

## 4. TwoPointDrawSession

Current state transitions:

```text
ready
  └─ click(start) → drawing

drawing
  ├─ pointerMove(end) → drawing + draft
  ├─ click(end)       → completed
  ├─ Enter            → completed using preview end
  ├─ Backspace/Delete → ready
  └─ Escape           → cancelled
```

Rules:

- the first point is not rendered as an invalid arrow;
- a preview exists only after a distinct second position is available;
- clicking the same location as the first point does not complete;
- terminal sessions are immutable;
- all returned coordinates and property records are copied.

## 5. MapLibre event adapter

`MapLibrePlotInteraction` translates:

```text
click      → DrawSession.click / plot selection
mousemove  → DrawSession.pointerMove / handle preview
mousedown  → start semantic handle drag
mouseup    → commit one ReplacePlotCommand
style.load → restore PlotLibre sources, layers and visual state
keydown    → session or selection keyboard action
```

The package uses structural interfaces rather than importing MapLibre runtime classes. This keeps the package testable with a fake map and avoids forcing a concrete MapLibre version into the build graph.

## 6. Source separation

The renderer maintains:

### `plotlibre-committed`

Persistent plots derived from the Store.

### `plotlibre-draft`

At most the active drawing preview or control-handle drag preview. It is never exported as persistent data.

### `plotlibre-handles`

Semantic control points for the selected object. The generated polygon vertices are never exposed as editable handles.

This separation prevents high-frequency pointer events from rebuilding the persistent Store or producing history entries.

## 7. Completion transaction

Drawing completion follows:

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

Only the completed feature enters history. Pointer previews do not.

## 8. Control-point drag transaction

A handle drag follows:

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

Important guarantees:

- the committed Store is unchanged during pointer movement;
- invalid previews are ignored;
- one drag produces one undo step;
- Escape restores the original feature without a command;
- the selected handle set follows Store undo/redo changes.

## 9. Selection

When not drawing, clicking committed fill or line layers queries `plotId` and selects the corresponding semantic object. Clicking empty space clears selection.

The current implementation also exposes:

```ts
plot.select(id);
plot.select(undefined);
```

Selection is controller state, not persisted in PlotJSON.

## 10. Style lifecycle

Calling `map.setStyle()` removes application-added sources and layers. PlotLibre listens to `style.load` and restores:

1. committed/draft/handles sources;
2. seven rendering layers;
3. committed Store features;
4. active draft if present;
5. selected control handles.

All renderer initialization methods are idempotent.

## 11. Cursor and keyboard behavior

Cursor states:

```text
crosshair  active draw session
grab       pointer over selected handle / completed selection
grabbing   active handle drag
empty      idle
```

The map canvas is made keyboard-focusable by setting `tabIndex = 0` when needed.

## 12. Current limitations

- only definitions requiring exactly two control points can start an interactive session;
- no double-click multi-point completion yet;
- no snapping or angle constraints;
- no touch-specific gestures;
- no box/lasso selection;
- no parameter handles such as width or head length;
- no browser E2E test against real MapLibre yet;
- hit testing currently uses rendered fill/line layers, not a separate expanded hit-area layer.

## 13. Next extension points

### MultiPointDrawSession

Will support variable point counts, double-click completion, undo-last-point, and dynamic centerline preview.

### HandleProvider

`PlotDefinition` will later expose semantic handles so width, curvature, arrow-head length and tail depth can be edited without special cases in the MapLibre adapter.

### SnappingService

Will consume pointer position and indexed candidates, then return a proposed snapped coordinate plus guides. The DrawSession remains unaware of MapLibre layers.

### Interaction events

A public event system will expose draw start/update/complete/cancel, selection change, edit start/update/complete and validation failures.

### Browser playground

The next milestone will create a real MapLibre 6 application, Playwright tests, and a GitHub Pages deployment workflow. The app will use the same public API documented here rather than private test hooks.
