# `arrow.attack` Algorithm Record

## Status

- Plot type: `arrow.attack`
- Milestone: 005F
- Implementation policy: clean-room
- Coordinate mode: local metre projection
- Minimum semantic points: 3
- Maximum semantic points: 64
- Completion: Enter or double-click

## Semantic model

```text
controlPoints[0]       = first tail-edge control
controlPoints[1]       = second tail-edge control
controlPoints[2..n-2]  = attack-spine path controls
controlPoints[n-1]     = exact objective/tip
```

The first two controls define the exact physical tail width. Their input order is not treated as left/right; orientation is resolved from the initial attack-spine direction.

Generated centreline samples, body offsets and polygon vertices are derived data and are not persisted as semantic controls.

## Public behavior research

A public AttackArrow implementation in ol-plot exposes the following observable semantics:

1. the first two controls define the two tail edges;
2. their midpoint starts the attack spine;
3. later controls define the route toward the arrow head;
4. the tail width influences body and head proportions;
5. the tailed variant preserves the same body/head behavior and adds a swallowtail point.

References used only for behavioral orientation:

- `sakitam-fdd/ol-plot` `AttackArrow.ts`, revision `c919e60b4edeaeca53c08f9552f793b2ae9537f0`;
- `sakitam-fdd/ol-plot` `TailedAttackArrow.ts`, same revision.

No source implementation, helper layout, interpolation formula, constants or default factors are copied or translated.

## Structural distinction from `arrow.curved`

`arrow.curved`:

```text
one tail centre
+ path controls
+ exact tip
+ length-derived tail width
```

`arrow.attack`:

```text
two exact tail-edge controls
+ attack-spine controls
+ exact tip
+ tail-control-derived body/head scale
```

Therefore `arrow.attack` is not a parameter alias of `arrow.curved` and cannot share its public parameter contract.

## Independent PlotLibre model

### 1. Projection and tail orientation

All semantic WGS84 controls are projected into a local tangent metre plane using the midpoint of the two tail controls as projection origin.

Let:

```text
A, B        = projected tail controls
T           = midpoint(A, B)
P           = first attack-spine control
D           = normalize(P - T)
```

The control lying to the left of `D` becomes `tailLeft`; the other becomes `tailRight`. Tail controls must be distinct and the first spine direction must be non-zero.

### 2. Attack spine

```text
spineControls = [T, ...projected controlPoints[2..]]
```

Consecutive duplicate spine controls are removed. The spine is interpolated using PlotLibre's existing Catmull–Rom/Hermite primitive and measured by cumulative arc length.

### 3. Exact tail width

```text
Wtail = distance(tailLeft, tailRight)
Htail = Wtail / 2
```

Unlike `arrow.curved`, tail width is not derived from total path length and is not clamped to another width. Invalid extremely small or extremely large tail controls are rejected explicitly.

### 4. Attack body profile

The shaft half-width is a piecewise arc-length profile:

```text
s = cumulative shaft distance / total shaft distance

0 <= s <= bodyBulgePosition:
    H(s) = lerp(Htail, Htail × bodyBulgeRatio, s / bodyBulgePosition)

bodyBulgePosition < s <= 1:
    H(s) = lerp(Htail × bodyBulgeRatio, Hneck, ...)
```

This gives the attack body a broad, slightly reinforced middle before narrowing toward the neck.

```text
Hneck = Wtail × neckHalfWidthTailRatio
```

The exact tail controls are inserted as the first and last polygon vertices; offset-derived start vertices are discarded.

### 5. Attack head

The final sampled spine tangent defines head direction.

```text
headLength = min(
  spineLength × headLengthRatio,
  Wtail × maximumHeadLengthTailRatio,
  spineLength × 0.4
)

headHalfWidth = Wtail × headHalfWidthTailRatio
neckHalfWidth = Wtail × neckHalfWidthTailRatio
```

The shared `buildArrowHead()` primitive constructs the neck, shoulders and exact tip.

### 6. Head/shaft connection

As with `arrow.curved`, the last pre-trim spine sample connects directly to the tangent-defined neck centre. The arc-length trim point and neck centre are not both retained, preventing a short reverse bend at the shoulder.

### 7. Polygon ring

```text
tailLeft
→ left body offsets excluding generated tail/neck endpoints
→ neckLeft
→ headLeft
→ exact tip
→ headRight
→ neckRight
→ reversed right body offsets excluding generated endpoints
→ tailRight
→ tailLeft
```

The ring is normalized to counterclockwise winding and must be finite, closed and simple.

### 8. Exact semantic controls

After unprojection:

- polygon tail vertices are replaced with the original tail-control coordinates in resolved left/right order;
- polygon tip is replaced with the original final semantic control.

No projection round-off may move these canonical controls.

## Default parameters

| Parameter | Default | Constraint |
|---|---:|---|
| `headLengthRatio` | `0.22` | `[0.05, 0.45]` |
| `maximumHeadLengthTailRatio` | `2.4` | `[0.5, 6]` |
| `headHalfWidthTailRatio` | `0.95` | `[0.35, 2]` |
| `neckHalfWidthTailRatio` | `0.32` | `[0.1, 0.75]` |
| `bodyBulgeRatio` | `1.08` | `[0.75, 1.75]` |
| `bodyBulgePosition` | `0.35` | `[0.05, 0.85]` |
| `tension` | `0.12` | `[0, 1]` |
| `segmentsPerSpan` | `16` | integer `[4, 128]` |
| `miterLimit` | `3` | `[1, 10]` |
| `minimumTailWidthMeters` | `1` | `> 0` |
| `maximumTailWidthMeters` | `100000` | `>= minimum` |

## Degenerate-input policy

- fewer than three controls: `RangeError`;
- coincident tail controls: `RangeError`;
- tail width outside explicit limits: `RangeError`;
- zero-length first spine direction: `RangeError`;
- fewer than two distinct spine controls: `RangeError`;
- invalid parameters: `RangeError`;
- unstable polar projection: projection-layer error;
- self-intersecting output: `RangeError` with guidance to narrow the tail or simplify controls;
- all output coordinates must be finite.

## Interaction contract

- click first tail edge;
- click second tail edge;
- move/click route controls and objective;
- the third candidate creates the first valid draft;
- double-click the objective or press Enter to complete;
- Backspace/Delete removes one uncommitted semantic control;
- Escape cancels;
- every tail/spine control is editable after completion;
- moving either tail control changes exact tail width and orientation;
- moving an interior spine control changes the route;
- one handle drag produces one `ReplacePlotCommand`.

## Tests required

- deterministic golden fixture;
- exact two tail vertices and exact tip;
- input tail-order invariance;
- finite, closed, counterclockwise, simple ring;
- tail width controls body scale;
- interior spine control changes geometry;
- straight three-control minimum case;
- duplicate spine cleanup;
- invalid tail width and parameter rejection;
- tight-path self-intersection rejection;
- Registry and RenderBundle roles;
- PlotJSON round trip preserving both tail controls and full spine;
- Fake MapLibre draft/double-click/zoom lifecycle;
- Chromium actual drawing/rendering;
- tail-handle and interior-spine-handle edit/undo;
- no regression to the `arrow.curved` golden fixture.
