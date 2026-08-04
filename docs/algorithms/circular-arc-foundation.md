# Circular Arc Foundation Algorithm Record

Planned public Definitions:

```text
line.circular-arc@1.0.0
area.sector@1.0.0
area.circular-segment@1.0.0
```

Deferred identifier:

```text
area.lune
```

Planned implementation boundary:

```text
packages/geometry/src/circular-arc.ts
packages/symbols/src/circular-arc.ts
packages/symbols/src/sector.ts
packages/symbols/src/circular-segment.ts
```

Author: PlotLibre project  
Design date: 2026-08-04  
Code reuse: none  
Status: semantic and mathematical design only; no runtime implementation in this branch

## 1. Behavioral references

Behavior and terminology were compared at fixed revisions:

```text
sakitam-fdd/ol-plot
revision c919e60b4edeaeca53c08f9552f793b2ae9537f0
MIT License, copyright 2017 sakitam-fdd

sakitam-fdd/maptalks.plot
revision 37dab8d0dd31650540146e1e0f03f54982f01799
MIT License, copyright 2017 FDD
```

Reviewed files include each repository's Arc, Sector and Lune implementations plus its license. The references agree on observable high-level behavior:

- Arc is a three-control open LineString;
- Sector is a three-control Polygon using centre, radius/start and end direction;
- the type named Lune/弓形 is a three-control Polygon made from one circular arc and a straight closing chord;
- reference helpers normalize a negative end-minus-start angle by adding one full turn;
- references allow temporary two-point fallbacks and may degrade singular input.

PlotLibre intentionally differs:

- use precise public names;
- use `line.circular-arc`, not `area.arc`;
- use `area.circular-segment`, not the mathematically misleading `area.lune`;
- reject two-point completion, collinear input and unstable circles;
- expose sweep semantics explicitly;
- preserve exact authored controls and PlotJSON boundaries;
- retain full Registry generation preflight.

No source expression, helper structure, constants or implementation code is copied. MIT compatibility does not replace PlotLibre's clean-room requirement.

## 2. Local coordinate frame

All version 1.0 construction occurs in a documented local-metre frame after `analyzeCoordinateMode()` returns `local`.

Given projected points:

```text
S = (x1, y1)
T = (x2, y2)
E = (x3, y3)
```

where `S` is start, `T` is through and `E` is end.

The implementation must use a deterministic projection origin independent of incidental render samples. The origin may use the existing order-independent mean policy used by closed areas, provided antimeridian and global-extent ambiguity are rejected before projection.

## 3. Circumcircle solution

Define:

```text
D = 2 * [x1(y2 - y3) + x2(y3 - y1) + x3(y1 - y2)]
```

For a stable non-collinear triple:

```text
Ux = [(x1² + y1²)(y2 - y3)
    + (x2² + y2²)(y3 - y1)
    + (x3² + y3²)(y1 - y2)] / D

Uy = [(x1² + y1²)(x3 - x2)
    + (x2² + y2²)(x1 - x3)
    + (x3² + y3²)(x2 - x1)] / D
```

The derived centre is:

```text
C = (Ux, Uy)
```

and radius:

```text
r = ||S - C||
```

Validation must be scale-aware. A fixed raw determinant tolerance is insufficient because metre coordinates may vary by orders of magnitude. The implementation should compare `|D|` against a tolerance proportional to the squared maximum chord length and reject non-finite or excessive radii.

## 4. Angle normalization

For local Cartesian angle:

```text
θ(P) = normalizeRadians(atan2(Py - Cy, Px - Cx))
```

where normalization maps into `[0, 2π)`.

Counterclockwise delta:

```text
ccw(a, b) = mod(b - a, 2π)
```

Clockwise delta:

```text
cw(a, b) = mod(a - b, 2π)
```

All comparisons use a documented angular tolerance. No sweep is represented by an unbounded or repeatedly wrapped angle.

## 5. Three-point through-arc selection

The authored through-point selects one of the two possible arcs between `S` and `E`.

Counterclockwise is valid when:

```text
ccw(θS, θT) + ccw(θT, θE) ≈ ccw(θS, θE)
```

and `T` is strictly internal rather than coincident with either endpoint.

Clockwise is valid when:

```text
cw(θS, θT) + cw(θT, θE) ≈ cw(θS, θE)
```

Exactly one direction should be valid for a stable distinct triple. If neither or both are valid within tolerance, the frame is ambiguous and must be rejected.

The total sweep is the sum of two directed sub-sweeps:

```text
S → T
T → E
```

This construction guarantees that minor arcs, major arcs, crossing 0° and exact through-point interpolation are all represented without swapping authored roles.

## 6. Deterministic sampling

Public parameter:

```text
segmentsPerCircle: integer [16, 2048]
```

For a directed sweep `Δ` in radians:

```text
segmentCount = max(1, ceil(segmentsPerCircle * Δ / (2π)))
```

Sample `S → T` and `T → E` independently. Replace the first and last coordinate of each sampled sub-arc with the exact authored endpoints. Concatenate while removing only the duplicate shared through-point.

Required exact output positions:

```text
samples[0]       = S
one sample       = T exactly
samples[last]    = E
```

Changing `segmentsPerCircle` changes only density. It must not change centre, radius, selected sweep, exact controls or semantic output type.

## 7. Circular arc output

`line.circular-arc` emits one LineString containing the shared frame samples in authored order:

```text
S → T → E
```

No closure or fill is generated.

## 8. Circular segment output

`area.circular-segment` uses the same samples and adds the derived chord:

```text
S → arc through T → E → S
```

The closed ring must be finite, non-zero-area and simple. It is normalized counterclockwise for rendered Polygon output. Winding normalization may reverse derived coordinates but cannot rewrite canonical controls.

A selected major arc is valid when the resulting chord-closed ring remains simple.

## 9. Sector frame

Authored local controls:

```text
C  centre
R  exact radius/start point
B  end-bearing handle
```

Derived radius:

```text
r = ||R - C||
```

Start geographic bearing is derived from `C → R`; end geographic bearing is derived from `C → B`. Public bearings use 0° north and increase clockwise.

The end-boundary position is derived at radius `r` along the end bearing. The distance `||B - C||` is intentionally ignored after validating that `B` is distinct from `C`.

Public parameter:

```text
sweepDirection: "clockwise" | "counterclockwise"
```

Clockwise sweep:

```text
Δcw = mod(endBearing - startBearing, 360°)
```

Counterclockwise sweep:

```text
Δccw = mod(startBearing - endBearing, 360°)
```

Reject sweeps within tolerance of 0° or 360°. Support crossing north/0° and sweeps above 180°.

For local Cartesian sampling, convert geographic bearing `β` to angle:

```text
θ = π/2 - β
```

with normalization into `[0, 2π)`.

Sector boundary before winding normalization:

```text
C → exact R → directed arc → derived end-boundary → C
```

The rendered ring is normalized counterclockwise. Canonical `sweepDirection` remains unchanged.

## 10. Coordinate-mode and radius policy

Version 1.0 must reject rather than silently switch when:

```text
analyzeCoordinateMode(controls).mode !== "local"
```

The geometry module should expose explicit limits, initially aligned with existing coordinate analysis:

```text
maximum local extent: 250,000 m
maximum local latitude: 80°
```

A separate documented maximum circumradius protects three-point frames from nearly collinear controls whose authored extent is small but implied circle is enormous. The exact constant must be frozen with fixtures before implementation; it must not be hidden in UI code.

Geodesic `destinationPoint()` may support a future geodesic sector version, but it is not used as an invisible fallback in 1.0. Three-point geodesic small-circle fitting is explicitly out of scope.

## 11. Degenerate-input policy

Reject before mutation for:

- fewer or more than three controls;
- invalid WGS84 positions;
- coincident control pairs;
- non-local coordinate mode;
- determinant instability;
- non-finite or policy-exceeding radius;
- ambiguous through-point sweep;
- sector centre/radius coincidence;
- sector centre/bearing-handle coincidence;
- invalid direction or segment parameter;
- zero/full sector sweep;
- non-finite output;
- zero-area or self-intersecting Polygon.

No fallback may:

- persist a line from two controls;
- synthesize a third canonical control;
- turn an arc into a polyline on collinearity;
- turn a circular segment into a triangle;
- move the sector bearing handle onto the radius;
- silently select the minor sweep;
- polygonize an invalid ring.

## 12. Canonicalization policy

All three Definitions return controls unchanged.

```text
line.circular-arc:      order is start / through / end
area.circular-segment: order is start / through / end
area.sector:           order is centre / radius-start / end-bearing
```

Reversal is a user-visible semantic edit, not canonicalization.

## 13. Provenance and notices

Because code reuse is `none`, the planned implementation does not incorporate reference-source expression and does not require copying third-party notices into generated package code. The fixed reference revisions and MIT license review remain recorded for auditability.

PlotLibre packages themselves remain `UNLICENSED` until the repository owner selects a project license.

## 14. Required fixtures before implementation

Freeze numeric fixtures for:

- quarter-circle minor arc;
- three-quarter major arc;
- clockwise and counterclockwise through selection;
- crossing 0°;
- reversed start/end;
- near-collinear rejection at multiple scales;
- excessive circumradius;
- circular-segment minor and major areas;
- sector clockwise 90°;
- sector counterclockwise 270°;
- sector end-bearing distance isolation;
- unsupported antimeridian, high-latitude and large-extent inputs;
- exact WGS84 control round trip after project/unproject.

Implementation must not begin until these fixtures, public identifiers and validation issue expectations are accepted in the design PR.
