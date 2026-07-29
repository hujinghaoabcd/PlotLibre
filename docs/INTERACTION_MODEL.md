# PlotLibre Interaction Model

## 1. Purpose

PlotLibre separates semantic interaction state from the map engine. Drawing and editing rules are implemented as pure, engine-independent sessions that can be tested without DOM, WebGL or MapLibre.

The interaction package provides:

```text
TwoPointDrawSession
MultiPointDrawSession
```

Both return semantic snapshots. Neither writes to Store nor renders a layer.

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

interface DrawSessionSnapshot {
  readonly status: DrawSessionStatus;
  readonly draft?: PlotFeatureInput;
  readonly completed?: PlotFeatureInput;
  readonly rejection?: DrawSessionRejection;
}
```

A non-terminal snapshot may contain:

- a temporary semantic `draft`;
- a structured `rejection` from the most recent completion attempt;
- both draft and rejection when a rejected fixed-count final point remains visible;
- only status when no complete candidate exists.

A terminal completed snapshot contains the final `completed` feature input. Sessions do not know symbol geometry. The adapter materializes candidates with Definition defaults and asks Registry for validity.

## 4. Completion validation

`validateCompletion` accepts either the legacy boolean result or a full Core `ValidationResult`:

```ts
type DrawCompletionValidationResult = boolean | ValidationResult;
```

Rules:

1. `true` completes the candidate;
2. `false` rejects it with generic issue code `DRAW_COMPLETION_REJECTED`;
3. a valid `ValidationResult` completes the candidate;
4. an invalid `ValidationResult` preserves its stable issues in `DrawSessionSnapshot.rejection`;
5. a thrown validator becomes `DRAW_COMPLETION_VALIDATION_FAILED`;
6. rejection is non-terminal and never mutates Store, History or PlotJSON.

The MapLibre adapter uses Registry validation as the source of truth, then performs full generation as a final renderability check. Unexpected generation failures become `DRAW_CANDIDATE_GENERATION_FAILED`.

## 5. Shared guarantees

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
11. Escape cancels a non-completed session;
12. a rejected fixed-count final point remains visible and replaceable;
13. pointer movement, point removal, cancellation and successful completion clear stale rejection details.

## 6. TwoPointDrawSession

```text
ready
  └─ click(start) → drawing

drawing
  ├─ pointerMove(end) → drawing + draft
  ├─ click(valid end) → completed
  ├─ click(invalid end) → drawing + draft + rejection
  ├─ doubleClick(end) → completion attempt
  ├─ Enter → completion attempt using preview end
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
  ├─ click(point n) → append committed semantic point
  ├─ pointerMove(cursor) → preview candidate and clear stale rejection
  ├─ Definition draft → optional transient complete draft
  ├─ Enter → complete actual valid candidate
  ├─ doubleClick(point) → complete actual valid candidate
  ├─ maximum valid → automatic completion
  ├─ maximum invalid → drawing + visible candidate + rejection
  ├─ Backspace/Delete → remove one committed point
  └─ Escape → cancelled
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
arrow.pincer
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

arrow.pincer
0 + 1   = outer tails
2 + 3   = canonical objective pair
4       = exact shared inner junction
```

For `arrow.double`, the Definition reflects the first objective across the forward axis through the tail midpoint after the third click. This temporary fourth objective exists only in the draft. Moving the pointer replaces it with the actual fourth-point candidate.

For `arrow.pincer`, four committed controls plus the fifth pointer candidate form the first full draft. An invalid fifth click remains in the active session as a replaceable candidate and carries the Registry issue that explains why completion failed.

## 8. Enter, double-click and point removal

Enter completes the current actual candidate. It never commits a Definition-derived transient control set.

Double-click uses an immutable candidate copy and de-duplicates the final point because browsers usually emit click events before `dblclick`.

Backspace/Delete removes one uncommitted semantic point at a time. This is local drawing-state undo and does not touch `CommandHistory`. Removing a point also clears stale completion rejection state.

For fixed-four `arrow.double`, pressing Enter after only three authored clicks leaves the session in `drawing` state even if a transient mirrored draft is visible.

## 9. Definition-driven session selection

`MapLibrePlotInteraction.startDraw()` reads the Definition control schema:

```text
minPoints = 2 and maxPoints = 2
→ TwoPointDrawSession

otherwise
→ MultiPointDrawSession
```

The adapter passes optional Definition draft-control derivation into the generic multipoint session. It does not hard-code symbol identifiers.

## 10. MapLibre event adapter

```text
click      → DrawSession.click / plot selection
mousemove  → DrawSession.pointerMove / handle preview
             and clear stale completion rejection
dblclick   → DrawSession.doubleClick
mousedown  → start semantic handle drag
mouseup    → commit one ReplacePlotCommand
style.load → restore sources, layers and visual state
keydown    → session or selection keyboard action
```

During active drawing:

- events are converted to WGS84 Positions;
- double-click default behavior is prevented and propagation stopped;
- MapLibre double-click zoom is disabled and its previous state remembered;
- cancel and destroy restore zoom immediately;
- completion defers restoration until the current native `dblclick` event ends;
- invalid transient geometry preserves the last valid full draft or shows a semantic guide;
- `MapLibrePlotInteraction.drawRejection` exposes the most recent structured completion rejection;
- successful completion, cancellation, a new draw session or pointer movement clears `drawRejection`.

`drawRejection` describes a completion attempt. It is not a continuous validator for every temporary pointer draft.

## 11. Source separation

### `plotlibre-committed`

Persistent plots derived from Store features.

### `plotlibre-draft`

The active drawing preview or handle-drag preview. It is never exported. It may contain Definition-derived transient controls or a rejected fixed-count candidate that is absent from canonical Store state.

### `plotlibre-handles`

Semantic control points for the selected committed object. Generated curve samples, temporary mirrored objectives, notch vertices, head vertices and polygon vertices are not handles.

`querySourceFeatures()` may return tile duplicates. Handle tests compare unique `plotId + handleIndex` identities.

## 12. Completion transaction

```text
completion attempt using authored candidate
→ merge Definition defaults
→ Registry validation
→ invalid: snapshot rejection + active session, no mutation
→ valid: full Registry generation
→ PlotFeatureInput completed
→ CreatePlotCommand
→ PlotStore
→ committed renderer
→ select new object
→ render semantic handles
```

For topology-sensitive Definitions, Registry validation includes complete geometry renderability before Store mutation.

## 13. Pincer rejection feedback

`arrow.pincer` reports stable issue codes for actionable failures, including:

```text
PINCER_CONTROL_POINTS_NOT_DISTINCT
PINCER_FORWARD_DIRECTION_UNDEFINED
PINCER_TAILS_SAME_SIDE
PINCER_JUNCTION_OUTSIDE_ZONE
PINCER_JUNCTION_TOO_FAR_LATERALLY
PINCER_TAIL_SPAN_TOO_SHORT
PINCER_TAIL_SPAN_TOO_LONG
PINCER_ARM_TOO_SHORT
PINCER_OBJECTIVE_NOT_AHEAD
PINCER_ARM_PAIRING_CROSSES
PINCER_TAIL_FRAME_INVALID
PINCER_JUNCTION_TOPOLOGY_INVALID
PINCER_SELF_INTERSECTION
PINCER_PARAMETERS_INVALID
```

The Playground translates these codes into Chinese adjustment guidance. It does not reimplement geometry checks. Unknown codes fall back to the Registry issue message.

## 14. Handle-drag transaction

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
- every authored control remains editable;
- moving a control regenerates the full geometry from semantic state.

## 15. Selection, cursor and keyboard

Clicking committed fill or line layers selects the semantic object. Clicking empty space clears selection.

```text
crosshair  active draw session
grab       selected object or handle hover
grabbing   active handle drag
empty      idle
```

The map canvas is keyboard-focusable.

## 16. Style lifecycle

Calling `map.setStyle()` removes application-added sources and layers. PlotLibre restores sources, layers, committed Store features, an active valid draft and selected semantic handles. Renderer initialization is idempotent.

## 17. Current limitations

- no snapping or angle constraints;
- no touch-specific completion gesture;
- no committed control-point insertion/removal;
- no box or lasso selection;
- no parameter handles for width, head, neck, body bulge, tension or notch;
- detailed rejection is currently surfaced for completion attempts, not every temporary invalid pointer position;
- hit testing does not yet use a separate expanded hit-area layer;
- Core Store listener exceptions do not yet have general transaction rollback;
- Definition-derived transient drafts support one complete replacement control set rather than multiple alternatives.

## 18. Next extension

Before adding another compound symbol, finish pincer robustness work:

1. asymmetric and off-center fixtures;
2. junction admissibility boundary fixtures;
3. high-latitude and antimeridian cases;
4. live Pages verification of rejection guidance;
5. migration/API review.

A future complex symbol must begin with an independent semantic design and must not be implemented as an alias or default-only variant of an existing arrow.
