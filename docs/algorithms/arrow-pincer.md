# `arrow.pincer` Clean-room Algorithm Record

日期：2026-07-29  
Milestone：006B  
状态：implementation algorithm frozen before runtime code

## 1. Canonical input

Version 1.0 consumes exactly five authored controls:

```text
P0 outer tail A
P1 outer tail B
P2 objective A
P3 objective B
P4 shared inner junction J
```

The authored pairing is positional and persistent:

```text
arm A = P0 → J → P2
arm B = P1 → J → P3
```

No control is mirrored, inserted, clamped or replaced by the generator.

## 2. Clean-room boundary

Observable public behavior was recorded in the approved semantic design. This implementation is derived independently from PlotLibre's existing pure primitives and the five-control contract.

Prohibited:

- copying reference formulas, constants, point lists or class structure;
- calling the public double-arrow generator;
- using `DoubleArrowFrame` as the pincer semantic frame;
- persisting two component arrows;
- silently converting four-control data.

Permitted reusable pure primitives:

```text
local-metre projection
vector operations
cubic Bézier sampling
polyline measurement
arrow-head construction
polyline offsetting
ring closing/winding/simple-topology validation
```

## 3. One shared local frame

All five controls are projected into one local-metre frame centered near the authored tail pair.

```text
T = midpoint(P0, P1)
O = midpoint(P2, P3)
D = normalize(O - T)
N = leftNormal(D)
```

The shared projection is mandatory so both arms and the junction are compared in one numerical space.

## 4. Junction admissibility

The exact authored junction is validated, never moved.

```text
progress = dot(J - T, D) / distance(T, O)
lateral = dot(J - T, N)
```

Initial implementation policy:

- finite and distinct from all four other controls;
- progress remains within a calibrated tail/junction zone;
- lateral displacement remains bounded relative to global length and tail separation;
- both semantic tail spans `|P0-J|` and `|P1-J|` satisfy configured minimum/maximum values;
- each paired objective remains sufficiently ahead of its local tail frame;
- enough arm length remains for a non-degenerate head.

Invalid junctions fail closed.

## 5. Independent arm construction

Each arm is built independently in the shared projection.

For arm `i`:

```text
outerTail = Pi
tip       = P(i+2)
tailCenter = midpoint(outerTail, J)
tailSpan   = distance(outerTail, J)
```

The initial centerline tangent is selected from the two normals of the semantic tail baseline and oriented toward the paired objective. This makes the first offset cross-section reproduce the exact authored tail endpoints.

A cubic Bézier centerline is then sampled:

```text
start    = tailCenter
control1 = start + initialDirection * localForwardScale
control2 = late forward point + geometric outward bulge
tip      = exact paired objective
```

The outward side is resolved geometrically from the global forward/lateral frame, not from a hard-coded A/left label.

## 6. Head and shaft

The sampled centerline is measured. Head length is constrained by:

```text
arm length * headLengthRatio
tailSpan * maximumHeadLengthTailRatio
arm length * hard safety fraction
```

The shared pure `buildArrowHead` primitive constructs neck, shoulders and exact tip. The centerline is trimmed to the neck plane before offsetting so no body vertex survives beyond the head neck.

A width profile evolves from:

```text
tailSpan / 2
→ body bulge
→ neck half-width
```

The shaft is offset with the configured miter limit. The offset side whose first point corresponds to the authored outer tail becomes the arm's outer boundary; the opposite side becomes the inner boundary ending at J.

## 7. Independent boundary tension

Preliminary offset boundaries are converted into cubic boundary curves.

- `outerTension` blends the outer boundary controls toward a straight chord;
- `innerTension` independently blends the inner boundary controls;
- both curves preserve exact endpoints;
- `junctionShoulderRatio` affects only the inner curve near J and never moves J.

This gives independently testable outer/inner response while retaining offset-derived width and head joins.

## 8. Arm path

Each arm yields one open semantic boundary path:

```text
outer tail
→ outer body curve
→ outer neck
→ outer head shoulder
→ exact objective tip
→ inner head shoulder
→ inner neck
→ inner body curve
→ exact junction
```

The exact outer tail, objective and junction are restored from authored longitude/latitude values during unprojection.

## 9. Compound ring assembly

The final local ring is assembled without unioning component Polygons:

```text
arm A path: outer tail A → ... → J
reverse arm B path without duplicate J: J → ... → outer tail B
implicit closing edge: outer tail B → outer tail A
```

Then:

1. close the ring;
2. normalize to counterclockwise winding;
3. reject non-finite vertices;
4. reject self-intersection;
5. unproject with exact semantic restoration.

The result is one Polygon with no holes.

## 10. Pairing and invariance

The generator preserves authored A/B pairing.

Required:

```text
[P0,P1,P2,P3,J]
[P1,P0,P3,P2,J]
```

produce the same normalized geometry.

Not required:

```text
[P0,P1,P3,P2,J]
```

because it changes which objective belongs to each tail.

## 11. Failure policy

Reject before Store mutation when any of the following occurs:

- control count is not five;
- non-finite or coincident semantic controls;
- invalid tail span;
- degenerate global direction;
- junction outside the admissible zone;
- paired objective behind its local frame;
- insufficient centerline/head length;
- arm centerlines cross away from the junction;
- head overlap or opposite-arm crossing;
- base-edge crossing;
- non-finite, degenerate or self-intersecting ring.

Interactive rejection keeps drawing active and visible through the shared last-valid/semantic-guide reliability contract.

## 12. Initial calibration parameters

The first implementation uses PlotLibre-owned defaults and ranges, subject to golden-fixture calibration:

```text
headLengthRatio
maximumHeadLengthTailRatio
headHalfWidthTailRatio
neckHalfWidthTailRatio
armBulgeRatio
outerTension
innerTension
junctionShoulderRatio
segmentsPerSpan
miterLimit
minimumTailSpanMeters
maximumTailSpanMeters
```

No numerical value is copied from a reference implementation.

## 13. Required proof tests

Before the public Definition is added, pure geometry must prove:

- deterministic output;
- exact five authored semantic locations;
- whole-arm swap invariance;
- independent objective swap changes or invalidates the paired geometry;
- exact junction movement affects both inner arms;
- independent outer/inner tension response;
- head parameter isolation;
- finite, closed, counterclockwise simple ring;
- rejection of invalid counts, coincident points, invalid junctions, backward objectives and crossed pairing;
- antimeridian-compatible exact semantic restoration.

Only after these pass may the implementation add Registry, PlotJSON, interaction and Playground slices.