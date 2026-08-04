# PlotLibre Interaction Model

## 1. Purpose

PlotLibre separates semantic interaction state from the map engine. Drawing and editing rules are implemented as pure, engine-independent sessions that can be tested without DOM, WebGL or MapLibre.

The interaction package currently provides:

```text
TwoPointDrawSession
MultiPointDrawSession
```

Both return semantic snapshots. Neither writes to Store nor renders layers.

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
- only completed and fully validated semantic features may enter Store and CommandHistory;
- session selection comes from `PlotDefinition.controlSchema`, not symbol identifiers.

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
- a structured `rejection` from the latest completion attempt;
- both draft and rejection when an invalid fixed-count final point remains visible;
- only status when no complete candidate exists.

A terminal completed snapshot contains authored semantic controls. Sessions do not generate geometry. The adapter materializes Definition defaults and asks Registry for validation and generation.

## 4. Completion validation

`validateCompletion` accepts either legacy boolean or a Core `ValidationResult`:

```ts
type DrawCompletionValidationResult = boolean | ValidationResult;
```

Rules:

1. `true` completes the candidate;
2. `false` rejects it with `DRAW_COMPLETION_REJECTED`;
3. a valid `ValidationResult` completes it;
4. an invalid `ValidationResult` preserves stable issues in `snapshot.rejection`;
5. a thrown validator becomes `DRAW_COMPLETION_VALIDATION_FAILED`;
6. rejection is non-terminal and never mutates Store, History or PlotJSON.

The MapLibre adapter uses Registry validation as the source of truth, followed by full generation preflight. Unexpected generation failure becomes `DRAW_CANDIDATE_GENERATION_FAILED`.

## 5. Shared guarantees

1. `ready` and `drawing` are non-terminal;
2. `completed` and `cancelled` are terminal;
3. terminal sessions ignore later input;
4. duplicate pointer points do not create duplicate semantic controls;
5. normal pointer drafts require Definition minimum semantic validity;
6. a Definition-derived draft may supply missing controls for rendering only;
7. pointer preview and derived draft generation never mutate committed session points;
8. completion returns authored controls, never transient controls or Polygon vertices;
9. sessions do not create Store history entries;
10. parameters, style and metadata remain serializable;
11. Escape cancels a non-completed session;
12. rejected fixed-count final points remain visible and replaceable;
13. pointer movement, point removal, cancellation and success clear stale rejection;
14. automatic closure, mirrored points, derived tails and secondary heads never become authored controls;
15. an invalid candidate may retain the last valid draft or show a semantic guide.

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
  ├─ click(point n) → append authored point
  ├─ pointerMove(cursor) → preview candidate and clear stale rejection
  ├─ Definition draft → optional transient complete draft
  ├─ Enter → complete actual valid authored candidate
  ├─ doubleClick(point) → complete actual valid authored candidate
  ├─ maximum valid → automatic completion
  ├─ maximum invalid → drawing + visible candidate + rejection
  ├─ Backspace/Delete → remove one authored drawing point
  └─ Escape → cancelled
```

Normal candidate:

```text
candidate = committed authored points + distinct pointer preview
```

Optional transient draft:

```text
if normal candidate is below minPoints
and Definition.deriveDraftControlPoints exists
→ request a complete rendering-only control set
```

The result must satisfy Definition count limits. It is not copied into session points and cannot be used by Enter, double-click or automatic completion.

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
```

## 8. Current semantic control models

### Curved arrow

```text
0       tail centre
1..n-2  path controls
n-1     exact tip
```

### Attack arrow family

```text
0 + 1   exact tail edges
2..n-2  attack-spine controls
n-1     exact objective/tip
```

### Double arrow

```text
0 + 1   exact unordered tail-edge pair
2 + 3   exact unordered objective pair
```

After the third click, `deriveDraftControlPoints()` may reflect the first objective across the forward axis to produce a rendering-only fourth point. Enter with only three authored controls does not complete.

### Pincer arrow

```text
0 + 1   outer tails
2 + 3   canonical objective pair
4       exact shared inner junction
```

Four committed controls plus the fifth pointer candidate create the first full draft. An invalid fifth click remains active, visible and replaceable with structured Registry issues.

### Squad combat

```text
0       tail centre
1..n-2  optional path controls
n-1     exact objective/tip
```

Two derived tail edges never enter canonical state.

### Route

```text
0       route origin
1..n-2  optional path controls
n-1     exact objective/tip
```

### Corridor

```text
0       endpoint A
1..n-2  optional path controls
n-1     endpoint B
```

### Bidirectional route

```text
0       exact start tip
1..n-2  optional path controls
n-1     exact end tip
```

### Double-head route

```text
0       route origin
1..n-2  optional path controls
n-1     exact primary objective/tip
```

The secondary emphasis head is derived geometry and has no interaction control.

## 9. Enter, double-click and point removal

Enter completes the current actual authored candidate. It never commits Definition-derived transient controls.

Double-click builds an immutable candidate and de-duplicates the final point because browsers commonly emit click before `dblclick`.

Backspace/Delete removes one uncommitted authored point. This is drawing-state undo, not `CommandHistory`. Point removal clears stale rejection.

Fixed-count Definitions complete through maximum-point logic. Variable-count Definitions use double-click or Enter when `controlSchema` declares that behavior.

## 10. Definition-driven session selection

`MapLibrePlotInteraction.startDraw()` reads `controlSchema`:

```text
minPoints = 2 and maxPoints = 2
→ TwoPointDrawSession

otherwise
→ MultiPointDrawSession
```

No branch may select a session by checking `plotType`.

A variable schema may use `minPoints = 2` only when `maxPoints > 2` is explicit, as used by squad-combat and route/path families.

## 11. MapLibre event adapter

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

During drawing:

- events convert to WGS84 Positions;
- native double-click default is prevented;
- double-click zoom is disabled and its prior state remembered;
- completion defers restoration until the native event finishes;
- cancellation and destroy restore zoom immediately;
- invalid temporary geometry keeps the last valid draft or semantic guide;
- `drawRejection` exposes the latest completion rejection;
- success, cancellation, a new session or pointer movement clears it.

`drawRejection` describes a completion attempt, not continuous validation for every pointer position.

## 12. Source separation

### `plotlibre-committed`

Persistent derived render output from Store features.

### `plotlibre-draft`

Active drawing or handle-drag preview. It may contain a Definition-derived transient draft or rejected fixed-count candidate, but is never exported.

### `plotlibre-handles`

Authored semantic controls for the selected committed object. Generated curve samples, mirrored objectives, derived tails, secondary heads, notches, necks and Polygon vertices are not handles.

### Semantic guides

Guides are transient visibility aids when full geometry is not yet renderable. They do not complete or persist a feature.

`querySourceFeatures()` may return tile duplicates. Handle tests compare unique `plotId + handleIndex` identities.

## 13. Completion transaction

```text
completion attempt using authored candidate
→ merge Definition defaults
→ canonicalize authored controls
→ Registry validation
→ invalid: rejection + active session, no mutation
→ valid: full Registry generation
→ PlotFeatureInput completed
→ CreatePlotCommand
→ PlotStore
→ committed renderer
→ select new object
→ render authored handles
```

Topology-sensitive Definitions include complete renderability in validation/generation preflight before Store mutation.

## 14. Pincer rejection feedback

Stable pincer issues include:

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

Playground translates stable issue codes into actionable Chinese guidance. It does not duplicate geometry checks.

## 15. Handle-drag transaction

```text
mousedown authored handle
→ capture original PlotFeature
→ disable dragPan
→ pointerMove builds semantic preview
→ Registry validation + generation
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
- moving a control regenerates geometry from semantic state.

## 16. Selection, cursor and keyboard

Clicking committed fill or line layers selects the semantic object. Clicking empty space clears selection.

```text
crosshair  active draw session
grab       selected object or handle hover
grabbing   active handle drag
empty      idle
```

The map canvas is keyboard-focusable.

## 17. Style lifecycle

Calling `map.setStyle()` removes application-added sources and layers. PlotLibre restores sources, layers, committed Store features, active valid draft and selected semantic handles. Renderer initialization is idempotent.

## 18. Current limitations

- no snapping or angle constraints;
- no touch-specific completion gesture;
- no committed control insertion/removal;
- no box or lasso selection;
- no multi-object transform transaction;
- no parameter handles for width, head, neck, body bulge, tension or notch;
- detailed rejection is surfaced for completion attempts, not every temporary pointer position;
- hit testing does not yet use a fully independent expanded hit-area interaction path;
- Core Store listener exceptions do not have general transaction rollback;
- Definition-derived transient drafts support one complete replacement control set rather than multiple alternatives;
- no Area family Definitions yet;
- no authored closed-ring insertion/removal workflow yet.

## 19. Milestone 006I closed-area extension

The next Area family should reuse `MultiPointDrawSession` without identifier branches.

Proposed interaction contract:

```text
click authored boundary controls
→ pointer candidate produces a derived closed-area draft
→ double-click or Enter requests completion
→ Registry validates complete generated ring
→ only authored controls enter Store
```

Required decisions before implementation:

- minimum controls for each Definition;
- whether controls are exact boundary positions;
- whether control order is directional;
- whether reversal preserves geometry;
- whether automatic closure is always derived;
- whether the final pointer double-click is de-duplicated;
- whether a rejected closure remains visible as a candidate or falls back to last-valid draft;
- whether any area type requires fixed maximum completion.

Required guarantees:

1. no repeated first control is appended to canonical controls;
2. sampled closed-curve vertices remain derived;
3. self-intersection remains non-terminal and outside Store/History;
4. Backspace/Delete removes authored controls, not generated ring vertices;
5. every authored control becomes a handle after completion;
6. one valid boundary-handle drag creates one replace command;
7. style reload restores area fill, outline and handles;
8. actual draft and committed area rendering receive Chromium coverage.

The next implementation must not return to pincer hardening or add more route-head variants.
