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

A snapshot may contain a temporary semantic `draft`, a final `completed` feature input, or only status when no complete draft candidate exists.

Sessions do not know symbol geometry. The adapter materializes candidates with Definition defaults and asks Registry for validity. A Definition may optionally provide `deriveDraftControlPoints()` to build a complete transient draft from an incomplete authored state.

## 4. Shared guarantees

1. `ready` and `drawing` are non-terminal;
2. `completed` and `cancelled` are terminal;
3. terminal sessions ignore later input;
4. duplicate points do not create duplicate semantic controls;
5. normal pointer drafts require the Definition minimum semantic point count;
6. a Definition-derived draft may temporarily supply missing controls for rendering only;
7. pointer preview and derived draft generation never mutate committed session points;
8. completion returns authored semantic controls, not transient draft controls or polygon vertices;
9. sessions do not create Store history entries;
10. parameters, style and metadata remain serializable;
11. Escape cancels a non-completed session.

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

## 6. MultiPointDrawSession

```text
ready
  └─ click(point 1) → drawing

drawing
  ├─ click(point n)      → append committed semantic point
  ├─ pointerMove(cursor) → preview candidate
  ├─ Definition draft   → optional transient complete draft
  ├─ Enter               → complete actual valid candidate
  ├─ doubleClick(point)  → complete actual valid candidate
  ├─ Backspace/Delete    → remove one committed point
  ├─ maximum reached     → optional automatic completion
  └─ Escape              → cancelled
```

Normal candidate rule:

```text
candidate = committed points + distinct pointer preview
```

Optional transient-draft rule:

```text
if candidate is below minimumPoints
and there is no active pointer candidate
and Definition.deriveDraftControlPoints exists
→ request a complete transient draft from the Definition
```

A derived draft is accepted only when its control count satisfies the Definition minimum and maximum. It is not copied into committed session points and cannot be used by Enter, double-click or automatic completion. Geometry validity remains the Registry's responsibility.

Current users:

```text
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
```

Semantic controls:

```text
arrow.curved
0       = tail center
1..n-2  = path controls
n-1     = exact tip

arrow.attack / arrow.attack.tailed
0 + 1   = exact tail edges
2..n-2  = attack-spine controls
n-1     = exact objective/tip

arrow.double
0 + 1   = exact unordered tail-edge pair
2 + 3   = exact unordered objective pair
```

The tailed attack variant does not add notch roots or notch tip to the session. Those are derived vertices generated from parameters and `AttackArrowFrame`.

For `arrow.double`, the Definition reflects the first objective across the forward axis through the tail midpoint after the third click. This temporary fourth objective is computed in local metres and exists only in the draft snapshot. Moving the pointer replaces it with the real fourth-point candidate; clicking that candidate completes the symbol with four authored controls.

## 7. Enter, double-click and point removal

Enter completes the current actual candidate. It never commits a Definition-derived transient control set.

Double-click uses an immutable candidate copy and de-duplicates the final point because browsers usually emit click events before `dblclick`.

Backspace/Delete removes one uncommitted semantic point at a time. This is local drawing-state undo and does not touch `CommandHistory`.

For fixed-four `arrow.double`, pressing Enter after only three authored clicks leaves the session in `drawing` state even if a transient mirrored draft is visible.

## 8. Definition-driven session selection

`MapLibrePlotInteraction.startDraw()` reads the Definition control schema.

```text
minPoints = 2 and maxPoints = 2
→ TwoPointDrawSession

otherwise
→ MultiPointDrawSession
```

The adapter also passes the optional Definition draft-control derivation callback into the generic multipoint session. It does not hard-code symbol identifiers.

## 9. MapLibre event adapter

```text
click      → DrawSession.click / plot selection
mousemove  → DrawSession.pointerMove / handle preview
dblclick   → DrawSession.doubleClick
mousedown  → start semantic handle drag
mouseup    → commit one ReplacePlotCommand
style.load → restore sources, layers and visual state
keydown    → session or selection keyboard action
```

During active multi-point drawing:

- events are converted to WGS84 Positions;
- double-click default behavior is prevented and propagation stopped;
- MapLibre double-click zoom is disabled and its previous state remembered;
- cancel and destroy restore zoom immediately;
- completion defers restoration until the current native `dblclick` event ends;
- an invalid transient draft is cleared without cancelling or completing the session.

This prevents MapLibre's later default handler from observing an already re-enabled state and executing a 2× camera zoom, while also preventing a temporary invalid geometry from breaking continued drawing.

## 10. Source separation

### `plotlibre-committed`

Persistent plots derived from Store features.

### `plotlibre-draft`

The active drawing preview or handle-drag preview. It is never exported. It may contain Definition-derived transient controls that are absent from canonical feature state.

### `plotlibre-handles`

Semantic control points for the selected committed object. Generated curve samples, temporary mirrored objectives, notch vertices, head vertices and polygon vertices are not handles.

`querySourceFeatures()` may return tile duplicates. Handle tests compare unique `plotId + handleIndex` identities.

## 11. Completion transaction

```text
session completed using authored candidate
→ PlotFeatureInput
→ merge Definition defaults
→ Registry validation
→ CreatePlotCommand
→ PlotStore
→ committed renderer
→ select new object
→ render semantic handles
```

For topology-sensitive Definitions, Registry validation includes complete geometry renderability before Store mutation.

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
- every curved, attack-family or double-arrow authored control is editable;
- moving a control regenerates the full geometry from semantic state.

### Renderability validation and partial-commit prevention

If geometry failure is first discovered by a synchronous Store render listener, Store may already contain the replacement while `CommandHistory.execute()` has not yet pushed the command.

Therefore topology-sensitive Definitions perform generation-equivalent checks before command execution. They return symbol-specific validation issues for non-generatable candidates, preventing Store mutation and History inconsistency.

Transient drawing drafts are materialized and validated before rendering. A failure clears the draft Source but leaves committed drawing points and session status unchanged.

## 13. Selection, cursor and keyboard

Clicking committed fill or line layers selects the semantic object. Clicking empty space clears selection.

```text
crosshair  active draw session
grab       selected object or handle hover
grabbing   active handle drag
empty      idle
```

The map canvas is keyboard-focusable.

## 14. Style lifecycle

Calling `map.setStyle()` removes application-added sources and layers. PlotLibre restores sources, layers, committed Store features, an active valid draft and selected semantic handles. Renderer initialization is idempotent.

## 15. Current limitations

- no snapping or angle constraints;
- no touch-specific completion gesture;
- no committed control-point insertion/removal;
- no box or lasso selection;
- no parameter handles for width, head, neck, body bulge, tension or notch;
- invalid previews are ignored but detailed issues are not yet shown in the Playground;
- hit testing does not yet use a separate expanded hit-area layer;
- Core Store listener exceptions do not yet have general transaction rollback;
- Definition-derived transient drafts currently support one complete replacement control set rather than multiple alternatives.

## 16. Next extension: `arrow.pincer` semantic design

The interaction foundation can support another compound symbol only after its canonical semantic design is frozen.

Before implementation define:

1. every authored control and its role;
2. ordered versus unordered control groups;
3. fixed or variable completion mode;
4. whether an incomplete state benefits from a Definition-derived transient draft;
5. exact handles versus derived branch/body/head points;
6. one coherent topology rather than persisted component arrows;
7. input-order invariance and failure policies;
8. PlotJSON representation and migration boundaries.

No `arrow.pincer` identifier checks should be added to the interaction package or MapLibre adapter.
