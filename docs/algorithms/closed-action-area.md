# Closed Action Area Algorithm Record

Algorithm or symbol types:

```text
area.closed-curve@1.0.0
area.gathering-place@1.0.0
```

Implementation files planned:

```text
packages/geometry/src/closed-area.ts
packages/symbols/src/closed-curve.ts
packages/symbols/src/gathering-place.ts
```

Author: PlotLibre project  
Date: 2026-08-04  
Code reuse: none

## Mathematical description

### Cyclic interpolation

Given distinct local-metre controls `P_0 ... P_(n-1)`, indices are evaluated modulo `n`. Each span from `P_i` to `P_(i+1)` uses cubic Hermite interpolation:

```text
C_i(t) = h00(t) P_i
       + h10(t) M_i
       + h01(t) P_(i+1)
       + h11(t) M_(i+1)
```

with:

```text
M_i = (1 - tension) / 2 * (P_(i+1) - P_(i-1))
```

for `t` in `[0, 1)`. The final output is explicitly closed by repeating the first sampled coordinate once. This is an independent use of standard public-domain Hermite/Catmull-Rom mathematics.

### Closed curve

`area.closed-curve` projects all authored boundary controls into a local metre frame, samples every cyclic span, closes the ring, normalizes it counterclockwise and rejects zero-area or self-intersecting output.

### Gathering place

The canonical controls are flank A, front crown and flank B. Let:

```text
F = (A + B) / 2
R = F + rearDepthRatio * (F - C)
```

where `C` is the front crown and `R` is a derived rear closure anchor. The cyclic frame is:

```text
[A, C, B, R]
```

It is sampled through the same cyclic interpolation primitive. `R` is derived render state and is never persisted.

## Reference behavior

Behavior and naming were compared against these public repositories:

- `sakitam-fdd/ol-plot` revision `c919e60b4edeaeca53c08f9552f793b2ae9537f0`;
- `sakitam-fdd/maptalks.plot` revision `37dab8d0dd31650540146e1e0f03f54982f01799`.

Observed behavior used only to define independent tests:

- closed curve is a variable-control smooth closed Polygon;
- gathering place is a separate three-control symbol;
- gathering-place rendering may use derived closure geometry while preserving authored controls.

No third-party implementation expression, helper function or source structure is copied. PlotLibre retains its own projection, curve, topology, Definition, interaction and PlotJSON architecture.

## License review

The references are used only for public behavior, names and control-point comparison. Their license status does not change the clean-room boundary. No third-party notice is required for the planned implementation because code reuse is `none`.

## Degenerate input policy

Reject before mutation when any condition is true:

- fewer than three distinct controls;
- non-finite coordinate or parameter;
- duplicate non-consecutive control that collapses a cyclic span;
- zero or near-zero signed area;
- invalid segment count or tension;
- gathering-place crown collinear with indistinguishable flanks when no stable area can be formed;
- derived rear anchor collapses onto another frame control;
- sampled ring self-intersects.

The generator does not silently drop arbitrary controls, polygonize a self-intersection or fall back to a raw authored polygon.

## Coordinate-mode policy

Version `1.0.0` uses the existing local-metre projection contract for supported extents. Antimeridian, polar and large-extent behavior must remain explicit. A future geodesic closed-area implementation requires a Definition-version change or a backward-compatible parameterized extension with fixtures.

## Canonicalization policy

- `area.closed-curve`: no control reordering.
- `area.gathering-place`: only the two flank coordinates may be exchanged, keeping the crown at index `1`; the result must be a deterministic permutation of the input.
- No derived anchor or sampled point can be returned by canonicalization.

## Required tests

```text
closed cyclic interpolation fixtures
closed-curve deterministic fixture
gathering-place deterministic fixture
all authored controls lie on the sampled boundary
closed and counterclockwise output
simple-ring validation
reversed closed-curve footprint equivalence
swapped-flank gathering-place equivalence
rearDepthRatio isolation
tension and sampling validation
duplicate, zero-area and self-intersection rejection
Registry generation and preflight
PlotJSON authored-control round trip
fixed-three and variable-count drawing
handle drag and single-command undo
actual MapLibre rendering
full prior regression suite
```
