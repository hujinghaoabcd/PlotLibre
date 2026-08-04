# Selection Local Rotation and Uniform-Scale Algorithm Record

Milestone: 007C  
Status: design freeze candidate; no runtime on `agent/007c-rotation-scale-design`  
Canonical mutation: authored control coordinates only

## 1. Inputs

```ts
type Position = readonly [number, number];

interface SelectionTransformFrame {
  readonly origin: Position;
  readonly pivotMeters: { readonly x: number; readonly y: number };
  readonly pivot: Position;
  readonly boundsMeters: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}
```

All selected features must exist and contain finite WGS84 authored controls. Empty selection, ambiguous antimeridian intervals and unsupported local extents reject before preview.

## 2. Deterministic frame

Let `C` be the multiset of every authored control in the selected features. The result must be invariant to feature order, selection acquisition order and control-array traversal order across features.

1. Determine one unambiguous longitude interval without crossing the antimeridian.
2. Let geographic seed longitude be the interval midpoint.
3. Let geographic seed latitude be `(minLat + maxLat) / 2`.
4. Create one local projection `P` at the seed.
5. Project every `c ∈ C` to `q = P(c)` in metres.
6. Compute local bounds over all `q`.
7. Pivot is the local bounds center.
8. `P⁻¹(pivotMeters)` is the presentation pivot.

```text
px = (minX + maxX) / 2
py = (minY + maxY) / 2
```

If both local width and height are below numeric epsilon, the transform frame is degenerate.

## 3. Clockwise rotation

For local point `(x,y)`, pivot `(px,py)` and user-positive clockwise angle `θ`:

```text
dx = x - px
dy = y - py
c  = cos(θ)
s  = sin(θ)

x' = px + c*dx + s*dy
y' = py - s*dx + c*dy
```

Required identities within tolerance:

```text
rotate(0) = identity
rotate(a, rotate(b,p)) = rotate(a+b,p)
||p' - pivot|| = ||p - pivot||
rotate(2π) ≈ identity
```

Positive 90° examples:

```text
north → east
east  → south
south → west
west  → north
```

## 4. Signed pointer angle

Given previous local vector `a=(ax,ay)` and current vector `b=(bx,by)`, standard Cartesian counterclockwise signed delta is:

```text
δccw = atan2(ax*by - ay*bx, ax*bx + ay*by)
```

User-clockwise delta is:

```text
δcw = -δccw
```

The session accumulates successive `δcw` values:

```text
cumulative += δcw
previous = current
```

This avoids discontinuity at ±π. A normalized display angle is derived separately:

```text
normalize to (-π, π]
```

Neither normalized display value nor pointer vectors are persisted.

## 5. Positive uniform scale

For positive factor `k`:

```text
x' = px + k*(x-px)
y' = py + k*(y-py)
```

Pointer factor:

```text
r0 = hypot(startX-px, startY-py)
r1 = hypot(currentX-px, currentY-py)
k  = r1 / r0
```

Validation:

```text
finite r0 and r1
r0 > local epsilon
0.01 <= k <= 100
```

`k` is never negative, so crossing the pivot changes direction of the pointer vector but cannot reflect authored controls.

## 6. Feature transformation

For every selected feature:

```text
for each authored control:
  local = P(control)
  transformedLocal = rotate(...) or scale(...)
  transformedControl = P⁻¹(transformedLocal)

candidate = createPlotFeature({
  ...original,
  controlPoints: transformedControls,
  revision: original.revision + 1,
})
```

Preserve exactly:

```text
id
plotType
parameters
style
metadata
```

Parameters are not scaled. Absolute ground caps may prevent strict derived-geometry similarity; Registry generation remains authoritative.

## 7. Candidate canonicalization

For each candidate:

```text
canonical = Registry.canonicalize(candidate)
Registry.generate(canonical)
```

Canonicalization may only reorder authored controls according to the existing Definition contract. It must not invent, delete or move a coordinate independently of the transform.

All candidates must complete canonicalization and generation before any preview replacement or Store mutation becomes observable.

## 8. Atomic preview rule

State held by one active gesture:

```ts
interface SelectionTransformPreview {
  readonly originals: readonly PlotFeature[];
  readonly lastValid: readonly PlotFeature[];
  readonly angleRadians?: number;
  readonly scaleFactor?: number;
  readonly rejection?: SelectionTransformRejection;
}
```

On movement:

```text
derive complete candidate set
→ preflight every member
→ success: replace lastValid with complete candidate set
→ failure: keep previous lastValid and set rejection
```

Never combine newly valid members with old members from an earlier preview.

## 9. Effective-change test

Before commit, compare each candidate’s authored controls with its original using exact generated coordinate values produced by the pure transform, with a final numeric epsilon guard.

No command when every member is unchanged. In particular:

```text
abs(angle) <= 1e-9 rad → no-op
abs(scale - 1) <= 1e-9 → no-op
```

Features whose every control lies exactly at the pivot remain unchanged and need not appear in the replacement transaction, provided the complete selection still passed preflight.

## 10. Batch transaction

Let `B` be original changed features and `A` be transformed changed features.

```text
execute.replace = A
undo.replace = B
execute.orderedIds = current Store order
undo.orderedIds = current Store order
beforeSelection = current snapshot
afterSelection = current snapshot
```

`BatchEditCommand` owns cloned exact values. Redo reuses `A`; it does not recompute angle, scale, local projection or Registry output.

## 11. Screen overlay derivation

Canonical local bounds corners:

```text
(minX,minY)
(maxX,minY)
(maxX,maxY)
(minX,maxY)
```

Each is inverse-projected to WGS84 and then `map.project()`-ed to CSS pixels. This forms the transform-frame quadrilateral.

The pivot is projected independently. The scale handle uses projected `(maxX,maxY)`. The rotation handle is derived visually from the projected top edge with a 28 CSS-pixel outward offset.

Screen minimum-size expansion affects only visual paths and hit targets. It cannot feed back into local pivot or transformed controls.

## 12. Failure atomicity

Any of these fails the complete candidate:

```text
missing selected feature
unsupported coordinate frame
non-finite pointer conversion
pointer radius too small
scale outside range
inverse projection outside valid WGS84
Registry canonicalization/generation failure
invalid Store transaction
```

No partial preview, partial command or partial revision increment is allowed.

## 13. Precision policy

- local coordinates: JavaScript finite double precision;
- angle: radians internally;
- UI degrees derived only for display;
- no rounding before inverse projection;
- no coordinate quantization in canonical state;
- no equality based on formatted UI text;
- tests use explicit geometric tolerances and exact revision/property checks.

## 14. Runtime test vectors

Required pure fixtures:

```text
single east/north cross around origin
multi-feature rectangle with shuffled feature order
angle crossing +179° → -179°
scale 0.01 / 1 / 100
pointer crossing pivot
one feature whose controls coincide with pivot
mixed feature set with one Registry failure
antimeridian-adjacent unsupported set
high-latitude unsupported set
```

Required command fixture:

```text
rotate/scale complete selection
→ one history entry
→ exact after revisions
→ undo exact originals/order/selection
→ redo exact captured after state
```
