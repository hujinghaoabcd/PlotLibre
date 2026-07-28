# `arrow.curved` Algorithm Record

## Status

- Plot type: `arrow.curved`
- Milestone: 005E
- Implementation policy: clean-room
- Coordinate mode: local metre projection
- Minimum semantic points: 3
- Maximum semantic points: 64
- Completion: Enter or double-click

## Semantic model

```text
controlPoints[0]       = tail centre
controlPoints[1..n-2]  = path controls that the centreline passes through
controlPoints[n-1]     = arrow tip
```

Generated curve samples, offset vertices and polygon vertices are derived data. They are not persisted as editable control points.

## Public behavior research

Public curved-arrow examples generally share two observable behaviors:

1. three or more points define a smooth curve, with middle points controlling the route;
2. the arrow head is aligned with the tangent at the curve end.

References used only for behavioral orientation:

- Excalidraw public arrow data examples: multi-point arrows use middle points to shape a smooth curve;
- public Canvas curved-arrow examples: the end tangent determines arrow-head orientation;
- public cubic-Bezier arrow examples: a smooth path is sampled and the final direction is used at the endpoint.

No reference implementation source, class layout, constants or default parameters are copied or translated.

## Independent PlotLibre model

### 1. Projection

All semantic WGS84 control points are projected into the existing local tangent metre plane, using the first control point as the projection origin.

Consecutive duplicate or near-duplicate points are removed. At least three distinct projected points are required.

### 2. Centreline

The projected controls are interpolated with PlotLibre's existing Catmull–Rom/Hermite implementation:

```text
sampleCatmullRom(projectedControls, tension, segmentsPerSpan)
```

The interpolated centreline passes through every semantic control point.

### 3. Arc-length measurement

The sampled centreline is measured using cumulative segment length. All width transitions and head placement are based on path length rather than control-point index.

### 4. Width model

Let:

```text
L = sampled centreline length
Wtail = clamp(L × tailWidthRatio, minimumWidthMeters, maximumWidthMeters)
Htail = Wtail / 2
Hneck = Htail × neckWidthRatio
Hhead = Htail × headWidthRatio
```

The shaft half-width changes linearly by cumulative arc-length ratio:

```text
H(s) = Htail + (Hneck - Htail) × s
```

where `s` ranges from `0` at the tail to `1` at the neck.

### 5. Head model

The last centreline tangent defines the arrow direction. The common `buildArrowHead()` primitive constructs:

```text
neckLeft → headLeft → tip → headRight → neckRight
```

Head length:

```text
headLength = min(L × headLengthRatio, 0.4L)
```

The shaft is trimmed before the head and connected to the head's explicit neck points.

### 6. Polygon ring

```text
left shaft from tail to neck
→ neckLeft
→ headLeft
→ tip
→ headRight
→ neckRight
→ right shaft from neck to tail
→ close
```

The ring is normalized to counterclockwise winding and must be finite, closed and simple.

### 7. Exact semantic tip

After unprojection, the polygon tip coordinate is replaced with the original final semantic control point. Projection round-off must not move the canonical tip.

## Default parameters

| Parameter | Default | Constraint |
|---|---:|---|
| `tailWidthRatio` | `0.065` | `[0.005, 0.25]` |
| `headLengthRatio` | `0.22` | `[0.05, 0.45]` |
| `headWidthRatio` | `2.3` | `[1, 6]` |
| `neckWidthRatio` | `0.55` | `[0.1, 1]` |
| `tension` | `0.15` | `[0, 1]` |
| `segmentsPerSpan` | `16` | integer `[4, 128]` |
| `miterLimit` | `3` | `[1, 10]` |
| `minimumWidthMeters` | `1` | `> 0` |
| `maximumWidthMeters` | `100000` | `>= minimum` |

## Degenerate-input policy

- fewer than three distinct controls: `RangeError`;
- non-finite WGS84 positions: projection layer rejects;
- unstable polar projection: explicit `RangeError`;
- zero-length sampled centreline: `RangeError`;
- invalid parameters: `RangeError`;
- duplicate sampled offset input: explicit error;
- self-intersecting derived ring: `RangeError` with guidance to reduce width or simplify controls;
- all output coordinates must be finite.

## Interaction contract

- click appends semantic path controls;
- pointer movement previews a valid candidate only after the third candidate point exists;
- Enter completes using the pointer preview;
- double-click completes without duplicating the final point;
- Backspace/Delete removes one uncommitted semantic point;
- Escape cancels;
- MapLibre double-click zoom is disabled only during multi-point drawing and restored afterward;
- every semantic control point is rendered as an editable handle after completion.

## Tests required

- deterministic golden fixture;
- exact semantic tip;
- closed, finite, counterclockwise, simple ring;
- centreline passes through semantic controls;
- parameter validation;
- consecutive duplicate cleanup;
- self-intersection rejection;
- Registry and RenderBundle roles;
- PlotJSON round trip preserving all controls;
- MapLibre double-click event translation;
- double-click zoom restoration;
- Chromium draft, completion, committed Source and rendered-feature checks;
- dragging an interior semantic control changes the curve through one ReplacePlotCommand.
