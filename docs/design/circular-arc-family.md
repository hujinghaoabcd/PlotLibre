# Circular Arc Family Semantic Design

Milestone 006J evaluates the legacy plotting group commonly named Arc, Sector and Lune. PlotLibre freezes precise public semantics before any geometry or Definition is implemented.

## 1. Scope decision

Proposed public Definitions for the implementation slice:

```text
line.circular-arc@1.0.0
area.sector@1.0.0
area.circular-segment@1.0.0
```

Deferred:

```text
area.lune
```

Two studied reference libraries use the name `Lune` together with the Chinese description `弓形`, but generate one circular arc closed by a straight chord. That geometry is a **circular segment**, not a mathematical lune bounded by two circular arcs. PlotLibre therefore uses `area.circular-segment` as the canonical identifier and does not add a misleading compatibility alias in version 1.0.

A future true `area.lune` requires a separate two-arc semantic design, likely with two shared endpoints and one through-control for each arc. It is not part of 006J implementation scope.

## 2. Shared canonical-state rules

Only exact authored WGS84 controls, explicit parameters, style and metadata are canonical.

Never persist:

- circumcentres;
- radii derived from controls;
- normalized or unwrapped angles;
- inferred arc direction;
- sampled arc vertices;
- derived sector endpoints;
- repeated ring-closing coordinates;
- winding-normalized ring copies;
- rendered LineString or Polygon coordinates.

All three proposed Definitions are fixed-count semantic plots. A valid third authored click attempts automatic completion. Two-point geometry may be shown only as a transient semantic guide and is never a valid committed fallback.

## 3. Shared coordinate policy

Version `1.0.0` is explicitly local-metre only.

Before generation, `analyzeCoordinateMode()` must classify the controls as `local`. Reject rather than silently switch algorithms when:

- the authored controls cross the antimeridian;
- maximum absolute latitude exceeds the current local policy;
- control extent exceeds the local threshold;
- a three-point circumcircle has an unstable or excessive radius.

The current geometry package already contains geodesic distance, bearing, destination and coordinate-mode primitives. A future Definition version may introduce geodesic small-circle semantics, but local and geodesic behavior must not be mixed invisibly in 1.0.

## 4. Shared circular-arc frame

The shared pure frame is defined by three distinct local-metre controls:

```text
S  exact arc start
T  exact through-point on the selected arc
E  exact arc end
```

The three controls define a unique circumcircle only when they are non-collinear and numerically stable.

The frame derives:

```text
center
radius
start angle
through angle
end angle
inferred direction
start-to-through sweep
through-to-end sweep
total sweep
```

The inferred direction is the unique clockwise or counterclockwise direction in which traversal from `S` to `E` passes through `T` strictly inside the sweep.

Required invariants:

1. output order is always authored `S → T → E`;
2. `S`, `T` and `E` appear exactly in sampled output;
3. total sweep is strictly greater than 0° and strictly less than 360°;
4. minor and major arcs are both supported;
5. crossing 0° is handled by angle unwrapping, not endpoint swapping;
6. reversing controls to `E, T, S` produces the same footprint in reverse order;
7. no public canonicalization reorders the controls;
8. collinear or nearly collinear controls fail closed.

Sampling occurs in two sub-arcs, `S → T` and `T → E`, so the authored through-point is exact rather than approximately present in a uniform sample.

## 5. `line.circular-arc@1.0.0`

### Meaning

An open circular arc passing through three exact authored positions.

### Canonical controls

```text
0 start
1 through
2 end
```

### Control schema

```text
minimum: 3
maximum: 3
completion: automatic on the third click
insertion: not allowed
removal: not allowed for a committed valid feature
```

### Output

```text
one LineString
```

The LineString begins at exact control `0`, contains exact control `1`, and ends at exact control `2`. No chord, fill or automatic closure is generated.

### Parameters

```text
segmentsPerCircle: integer [16, 2048]
```

Actual samples per sub-arc are proportional to sweep and always include both sub-arc endpoints. Parameter changes affect sampling density only, never the mathematical circle or exact controls.

## 6. `area.circular-segment@1.0.0`

### Meaning

A circular segment bounded by one selected circular arc and the straight chord connecting its exact endpoints.

### Canonical controls

```text
0 arc/chord start
1 through-point on circular arc
2 arc/chord end
```

### Control schema

```text
minimum: 3
maximum: 3
completion: automatic on the third click
insertion: not allowed
removal: not allowed for a committed valid feature
```

### Output

```text
one simple Polygon without holes
```

The derived boundary follows the selected arc from control `0` through exact control `1` to control `2`, then closes by a straight chord back to control `0`. The output ring is normalized counterclockwise without rewriting canonical control order.

Both minor and major circular segments are valid when the resulting ring is finite and simple. A major segment may cover more than half of the circumcircle.

### Parameters

```text
segmentsPerCircle: integer [16, 2048]
```

No tail, width, bulge or fill-geometry parameter changes the semantic circle.

## 7. `area.sector@1.0.0`

### Meaning

A circular sector with one authored centre, one exact radius/start control and one authored end-bearing handle.

### Canonical controls

```text
0 center
1 exact radius and start-boundary point
2 end-bearing handle
```

Control `2` defines direction from the centre. Its distance from the centre does **not** define a second radius and it is not required to lie on the rendered arc. The exact derived end-boundary point is placed at the radius defined by control `1` along the bearing from control `0` to control `2`.

This role distinction avoids silently averaging unequal radii or rejecting ordinary pointer clicks that are not exactly equidistant from the centre.

### Control schema

```text
minimum: 3
maximum: 3
completion: automatic on the third click
insertion: not allowed
removal: not allowed for a committed valid feature
```

### Parameters

```text
sweepDirection: "clockwise" | "counterclockwise"
segmentsPerCircle: integer [16, 2048]
```

Default direction:

```text
clockwise
```

Public direction uses geographic bearing convention: 0° is north and bearings increase clockwise. The selected direction determines the sweep from the exact start-bearing to the derived end-bearing. Sweeps above 180° and crossing 0° are supported. Zero or effectively 360° sweeps are rejected in version 1.0.

### Output

```text
one simple Polygon without holes
```

The semantic boundary is:

```text
center
→ exact start-boundary control
→ sampled directed circular arc
→ derived end-boundary point
→ center
```

The output ring is normalized counterclockwise. Winding normalization does not alter `sweepDirection` in canonical parameters.

### Interaction guide

Because the end-bearing handle may not lie on the rendered arc, selected and draft states should expose a radial semantic guide from centre through control `2`. The guide is transient and not part of exported geometry.

## 8. Canonicalization policy

No proposed Definition canonicalizes or reorders controls.

- Circular arc: swapping start/end reverses output order and inferred direction.
- Circular segment: swapping start/end reverses authored traversal while preserving the same footprint when the same through-point is retained.
- Sector: controls have fixed distinct roles; swapping radius/start and end-bearing changes radius and meaning.

Any future convenience action such as “reverse sweep” must be an explicit command that updates canonical controls or parameters, not hidden canonicalization.

## 9. Validation and failure policy

Reject before Store mutation when any condition is true:

- control count is not exactly three;
- any control is non-finite or invalid WGS84;
- any pair of controls is coincident within the local tolerance;
- coordinate-mode analysis is not local;
- three-point arc controls are collinear or numerically unstable;
- circumradius is non-finite, below minimum scale or above the local radius policy;
- inferred through-sweep is zero or approaches a full circle ambiguously;
- sector radius is zero or non-finite;
- sector end-bearing handle coincides with the centre;
- `sweepDirection` is invalid;
- sampling parameter is invalid;
- Polygon output is zero-area, non-finite or self-intersecting.

Do not:

- commit a two-point straight-line fallback;
- synthesize a permanent third control;
- degrade collinear arc controls to a polyline;
- degrade a circular segment to a triangle;
- average or move authored sector controls;
- polygonize self-intersection;
- silently switch to geodesic behavior.

## 10. PlotJSON contract

Round trips preserve exactly:

```text
plotType
definitionVersion
three authored controls
explicit parameters
style
metadata
revision
```

For sector, the end-bearing handle remains canonical even though the rendered end-boundary point is derived. Import performs full Registry generation preflight before Store replacement.

## 11. Interaction contract

All three use schema-driven `MultiPointDrawSession` with `minPoints = maxPoints = 3`.

```text
first click:  semantic guide only
second click: semantic guide / incomplete draft
third pointer candidate: full renderable draft when valid
third click: automatic completion attempt
```

A rejected third point keeps the session active, exposes structured validation issues and allows pointer replacement. Rejection, sampled arcs and guides never enter Store or History.

Committed handle dragging previews transient geometry and creates one replace command on release. Undo restores the complete three-control semantic feature.

## 12. Required test matrix

### Shared circular frame

- exact `S`, `T`, `E` interpolation;
- minor clockwise and counterclockwise arcs;
- major clockwise and counterclockwise arcs;
- crossing 0°;
- reversed-control footprint equivalence;
- deterministic sampling;
- segments-per-circle isolation;
- duplicate, collinear and near-collinear rejection;
- excessive circumradius rejection;
- unsupported coordinate-mode rejection.

### Circular arc

- LineString output only;
- exact first/through/last positions;
- no fill or closure;
- fixed-three drawing and actual rendered line.

### Circular segment

- finite closed counterclockwise simple Polygon;
- exact arc controls on the boundary;
- exact chord endpoints;
- minor and major segment fixtures;
- no derived point in PlotJSON;
- actual draft and committed fill/line rendering.

### Sector

- exact centre and start control;
- derived end boundary at the start radius;
- end-bearing distance isolation;
- clockwise/counterclockwise parameter isolation;
- crossing 0° and sweep > 180°;
- zero/full sweep rejection;
- radial semantic guide;
- fixed-three completion and actual rendered fill/line.

### Integration

- independent Registry identifiers and categories;
- PlotJSON authored-control round trips;
- create/replace/import preflight;
- handle edit and one-command undo;
- style reload recovery;
- full existing 16-symbol regression suite.

## 13. Non-goals

- true two-arc lune;
- full circle or ellipse;
- annular sector;
- geodesic small circles;
- holes or MultiPolygon;
- parameter handles for radius or sweep;
- snapping or equal-radius constraints;
- compatibility alias named `area.lune`.
