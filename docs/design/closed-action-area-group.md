# Closed Action Area Symbol Group

Milestone 006I introduces PlotLibre's first built-in area family. The group contains two public Definitions with separate semantic contracts and one shared pure geometry foundation.

## Scope

Included public identifiers:

```text
area.closed-curve@1.0.0
area.gathering-place@1.0.0
```

Deferred:

```text
area.route-loop
```

`area.route-loop` is not added until it has an independently documented direction, route, entry/exit or operational meaning. A differently styled closed curve is not a separate semantic Definition.

## Shared canonical-state rule

Only authored WGS84 control points, explicit parameters, style and metadata are persisted. The following are always derived and must not enter PlotJSON canonical state:

- repeated closing coordinates;
- sampled spline vertices;
- tangent and normal vectors;
- a gathering-place rear closure anchor;
- winding-normalized copies;
- rendered Polygon coordinates.

Both Definitions emit one simple Polygon without holes. The derived exterior ring is closed and counterclockwise. Invalid, zero-area or self-intersecting output fails closed before Store mutation.

## `area.closed-curve`

### Meaning

A smooth closed operational boundary whose authored controls are ordered boundary waypoints.

### Control schema

```text
minimum: 3
maximum: 64
completion: double-click or Enter
insertion: allowed
removal: allowed while at least three controls remain
```

Authored controls do not repeat the first coordinate at the end. Traversal order determines the cyclic boundary path, but clockwise and counterclockwise input are normalized only in derived output; canonical control order is not silently rewritten.

### Parameters

```text
tension:        [0, 1]
segmentsPerSpan: integer [4, 128]
```

The default curve must interpolate every authored control, auto-close from the final control to the first, and remain deterministic under identical input.

## `area.gathering-place`

### Meaning

A fixed-role gathering area with a front crown and a rounded rear closure. It is not an alias for a generic three-point closed curve.

### Canonical controls

```text
0  flank A
1  front crown
2  flank B
```

The two flank controls are an unordered semantic pair. Canonicalization may swap only indices `0` and `2` to establish deterministic orientation while preserving the exact crown at index `1`. It may not add, remove or move coordinates.

### Control schema

```text
minimum: 3
maximum: 3
completion: automatic on the third click
insertion: not allowed
removal: not allowed for a committed valid feature
```

During drawing, the live pointer supplies the third transient control through the normal fixed-count session. A two-control fallback may derive a preview crown or flank only as transient draft state; such a point must never be persisted.

### Derived frame

A rear closure anchor is derived from the midpoint of the two flank controls. The smooth cyclic boundary passes through:

```text
flank A -> front crown -> flank B -> derived rear anchor -> flank A
```

The derived anchor creates a recognizable rear enclosure and keeps the public three-control semantic model distinct from `area.closed-curve`.

### Parameters

```text
tension:        [0, 1]
segmentsPerSpan: integer [4, 128]
rearDepthRatio: [0, 1]
```

`rearDepthRatio` moves the derived rear anchor along the crown-to-flank-midpoint axis. It does not create a fourth authored control.

## Shared geometry boundary

The group may reuse:

- local-metre projection and unprojection;
- finite-vector validation;
- cyclic Hermite/Catmull-Rom sampling;
- ring closure and winding normalization;
- signed-area and simple-ring validation.

It must not reuse arrow-only head, neck, notch, shaft-width or route-ribbon semantics.

## Interaction contract

- Draft rendering begins only when a complete renderable transient control set exists.
- Double-click completion for `area.closed-curve` must not duplicate the final click.
- The third click for `area.gathering-place` attempts completion immediately.
- A rejected candidate remains editable and exposes a structured validation issue.
- Committed handle drags preview transient geometry and create exactly one replace command on pointer release.
- Undo restores the complete previous semantic feature, not rendered Polygon vertices.

## PlotJSON contract

A round trip preserves exactly the authored controls and explicit parameters. Import performs full Registry generation preflight before replacing current Store contents. No migration is required for version `1.0.0` because these are new public identifiers.

## Test contract

The milestone is incomplete without:

- deterministic geometry fixtures;
- finite, closed, counterclockwise and simple-ring assertions;
- control interpolation assertions;
- reversal and flank-swap behavior tests;
- parameter-isolation tests;
- degenerate and self-intersection rejection tests;
- Registry and PlotJSON round trips;
- drawing, editing and undo tests;
- actual MapLibre draft and committed rendering tests;
- the full existing fourteen-arrow regression matrix.
