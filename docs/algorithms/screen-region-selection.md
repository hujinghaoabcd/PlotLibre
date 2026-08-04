# Screen-Region Selection Algorithm Record

Milestone: 007B  
Status: design freeze candidate; no runtime on `agent/007b-box-lasso-design`  
Canonical document mutation: none

## 1. Purpose

This record freezes the independent algorithms for:

```text
screen box capture
screen lasso capture
lasso topology validation
broad-phase candidate lookup
exact projected geometry intersection
deterministic multi-id SelectionController application
```

Region selection changes transient selection only. It never edits PlotFeature authored controls, Store order, revisions, History or PlotJSON.

## 2. Coordinate domain

All region capture and exact intersection predicates use CSS-pixel screen coordinates relative to the MapLibre canvas container.

```ts
interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}
```

Required validity:

```text
Number.isFinite(x)
Number.isFinite(y)
```

Map projection occurs only through the adapter:

```text
WGS84 generated coordinate
→ map.project
→ finite ScreenPoint
```

Core and PlotJSON never depend on ScreenPoint.

## 3. Numeric conventions

```text
pointer activation threshold: 4 CSS px
lasso sample spacing:          2 CSS px
lasso RDP tolerance:           1.5 CSS px
minimum lasso area:            16 CSS px²
predicate epsilon:             1e-9 in screen-coordinate arithmetic
```

Threshold comparisons use squared Euclidean distance where possible.

```text
distance²(a,b) = (a.x-b.x)² + (a.y-b.y)²
```

## 4. Box construction

Given start `s` and current/end `e`:

```text
minX = min(s.x, e.x)
minY = min(s.y, e.y)
maxX = max(s.x, e.x)
maxY = max(s.y, e.y)
```

The closed rectangle ring is derived clockwise or counterclockwise consistently:

```text
(minX,minY)
(maxX,minY)
(maxX,maxY)
(minX,maxY)
(minX,minY)
```

A box becomes active when:

```text
distance²(s,e) >= 16
```

Completion is valid only when:

```text
maxX > minX
maxY > minY
```

A degenerate or sub-threshold box is a no-op, not a rejection event.

## 5. Lasso sampling

Raw lasso path `P = [p0, p1, ...]`:

1. accept `p0` exactly;
2. for each pointer move candidate `q`, append only when:

```text
distance²(lastAccepted,q) >= 4
```

3. on pointer up, append the final point when it differs from the latest accepted point beyond epsilon;
4. remove consecutive duplicate points;
5. keep the stored path open; closing point is derived during validation/rendering.

Sampling is deterministic for the same event stream.

## 6. Lasso minimum validity

Before simplification:

```text
unique distinct points >= 3
abs(signedArea(rawClosedRing)) >= 16
```

Signed area:

```text
A = 1/2 Σ(x_i y_{i+1} - x_{i+1} y_i)
```

Orientation does not change selection semantics. The implementation may normalize the derived ring to counterclockwise for predicates, but must not reorder the raw capture path exposed by snapshots.

## 7. Segment primitives

For points `a`, `b`, `c`:

```text
orient(a,b,c)
= (b.x-a.x)(c.y-a.y) - (b.y-a.y)(c.x-a.x)
```

`signε(v)` returns zero when `|v| <= ε`.

A point lies on segment `[a,b]` when:

```text
orient(a,b,p) == 0 within ε
and
p.x within [min(a.x,b.x)-ε, max(a.x,b.x)+ε]
p.y within [min(a.y,b.y)-ε, max(a.y,b.y)+ε]
```

Two closed segments intersect when:

- their orientation signs straddle; or
- one endpoint lies on the other segment.

Collinear overlap is intersection.

## 8. Simple lasso validation

The raw closed ring is rejected when:

- a non-consecutive vertex repeats within epsilon;
- any pair of non-adjacent segments intersects or overlaps;
- any zero-length segment remains after consecutive duplicate removal.

Adjacency exemptions:

```text
segment i and i+1 share one endpoint
first and final segment share the first point
```

No other touch is permitted. A bow-tie, spike returning to an older vertex, tangent touch or collinear overlap is invalid.

Validation runs twice:

```text
raw sampled ring
→ validate simple
→ simplify open path
→ close simplified path
→ validate simple again
```

Therefore simplification cannot erase an invalid raw loop.

## 9. Ramer–Douglas–Peucker simplification

Version 1 uses RDP tolerance `1.5 CSS px` on the open lasso path.

For subpath from first `a` to last `b`:

1. compute perpendicular distance of every interior point to segment `[a,b]`;
2. choose the maximum-distance point `m`;
3. when `distance(m,[a,b]) > 1.5`, recursively simplify `[a..m]` and `[m..b]`;
4. otherwise retain only `a` and `b`.

The first and final captured points are always retained. After simplification, consecutive duplicates are removed and the ring is revalidated.

## 10. Point-in-ring

Boundary is inclusive.

Algorithm:

1. if point lies on any ring segment, return `boundary`;
2. otherwise use an even-odd horizontal ray crossing test;
3. process each edge with a half-open y-interval to avoid double-counting vertices.

Result:

```text
outside
inside
boundary
```

`inside` and `boundary` both count as region intersection.

## 11. Point-in-polygon with holes

For Polygon rings:

```text
ring 0 = exterior
rings 1..n = holes
```

A point lies in the polygon fill when:

1. it is inside/on the exterior; and
2. it is not strictly inside a hole.

Hole boundary is still polygon boundary and therefore counts as geometric intersection when a selection-region segment touches/crosses it.

For point containment only, a point on a hole boundary returns boundary, not fill interior.

## 12. Region versus Point

Projected Point `p` intersects region ring `R` when:

```text
pointInRing(p,R) != outside
```

Point style radius is intentionally ignored.

## 13. Region versus LineString

Line `L = [l0...ln]` intersects region `R` when any condition is true:

1. any line vertex is inside/on `R`;
2. any line segment intersects any region boundary segment.

For MultiLineString, any member line may intersect.

Line style width and dash pattern are ignored.

## 14. Region versus Polygon

For polygon `G` and region ring `R`, intersection is true when any condition is true:

1. any segment of any polygon ring intersects any segment of `R`;
2. any region vertex lies in polygon fill, respecting holes;
3. any exterior polygon vertex lies inside/on `R`.

This covers:

```text
boundary crossing
polygon fully inside region
region fully inside polygon fill
```

A region fully inside a polygon hole returns false because:

- no boundary crosses;
- region vertices are not in polygon fill;
- exterior polygon vertices are outside the region.

For MultiPolygon, any polygon member may intersect.

## 15. RenderBundle selectable geometry

For each canonical PlotFeature:

```text
bundle = Registry.generate(feature)
selectable components = fills + lines + points
```

Ignore:

```text
labels
semantic guides
selection overlays
draft geometry
DOM region overlay
```

Each component is projected and tested according to its geometry type. A PlotFeature contributes its id at most once when any component intersects.

Generated sampling is authoritative for curved screen paths. The algorithm does not infer additional geodesic curvature between generated vertices.

## 16. Broad-phase candidate algorithm

Input: region screen bounding box.

```text
rendered = map.queryRenderedFeatures(
  [[minX,minY],[maxX,maxY]],
  { layers: committed fill/line/point layers }
)
```

Then:

```text
candidateSet = unique valid string properties.plotId
orderedCandidates = store.list()
  .filter(feature => candidateSet.has(feature.id))
```

Properties:

- renderer/tile duplicates collapse by `plotId`;
- MapLibre return order is ignored;
- missing Store ids are filtered;
- only currently rendered visible committed layers participate;
- selected-overlay thickness cannot add candidates;
- broad phase may return false positives; narrow phase removes them.

## 17. Exact resolution transaction

Pseudo-code:

```text
function resolveRegion(region): ids
  broadIds = broadPhase(region.bounds)
  resolved = []

  for id in broadIds ordered by Store
    feature = Store.get(id)
    bundle = Registry.generate(feature)
    projected = project selectable bundle geometry

    if projection has non-finite point
      reject whole completion

    if any projected component intersects region
      resolved.push(id)

  return resolved
```

Generation/query/projection failure rejects the whole completion. Partial result application is prohibited.

Registry generation occurs once per unique candidate PlotFeature, not once per rendered component.

## 18. Deterministic batch selection

Let current ordered selection be `S` and candidate ids in Store order be `C`.

### Replace

```text
next = C
```

### Add

```text
A = [id in C where id not in S]
next = S + A
```

If `A` is empty, no-op. Otherwise final `A` id is Primary.

### Subtract

```text
next = [id in S where id not in C]
```

### Toggle

```text
survivors = [id in S where id not in C]
added = [id in C where id not in S]
next = survivors + added
```

Every input id is validated before mutation. One completion produces at most one SelectionChange.

## 19. Gesture state machine

### Box convenience

```text
idle
→ Shift pointerdown on empty: armed
→ move <4px: armed
→ move >=4px: active
→ pointerup valid: resolve/apply/idle
→ pointerup degenerate: idle no-op
→ Escape/cancel/lifecycle change: idle no-op
```

### Explicit box/lasso

```text
mode armed
→ pointerdown: active gesture
→ pointermove: update overlay
→ pointerup valid: resolve/apply/exit mode
→ lasso invalid: rejected, mode remains armed for retry
→ Escape: exit mode
```

Selection state is captured/observed but not mutated until successful completion.

## 20. Camera and Store consistency

An active region is valid only for one stable frame.

Cancel on:

```text
style.load
resize
movestart/zoomstart/rotatestart/pitchstart
Store change
external SelectionController revision change
pointercancel/lost capture
```

Camera movement after completion is irrelevant because selection ids, not screen regions, are retained.

## 21. DOM/SVG overlay algorithm

One overlay root is positioned over `map.getContainer()`.

Box:

```text
left = minX
top = minY
width = maxX-minX
height = maxY-minY
```

Lasso:

```text
SVG polyline points = raw accepted path
optional derived closing segment during active/rejected display
```

The overlay is presentation only:

```text
pointer-events:none
aria-hidden:true
no Store/History/PlotJSON identity
```

It is removed idempotently on every terminal/cancel/destroy path.

## 22. Complexity

Let:

```text
N = Store feature count
R = rendered broad-phase results including duplicates
C = unique candidate PlotFeatures
V = total generated vertices for candidates
L = lasso sampled points
```

Expected costs:

```text
broad query: engine index dependent
id dedup: O(R)
Store-order filtering: O(N) in first implementation
lasso validation: O(L²) segment-pair check
narrow phase: O(C × regionSegments × candidateSegments)
```

RDP average behavior is implementation dependent; worst case can be quadratic.

The first runtime must avoid `Registry.generate` over all `N` when `C << N`. Future optimization may maintain a Store order index and use sweep-line/topology acceleration, but these are not required before measured evidence.

## 23. Deterministic fixture set

Required fixtures include:

```text
box every drag quadrant
box thin positive extent
lasso triangle
lasso concave U shape
lasso bow-tie
lasso repeated non-consecutive vertex
lasso collinear overlapping edge
RDP-valid simple path
RDP path requiring second validation
point on boundary
line crossing without contained vertex
line tangent at one point
polygon contains region
region contains polygon
region inside polygon hole
region crossing hole boundary
MultiLineString one-component hit
MultiPolygon one-component hit
compound RenderBundle duplicate geometry
broad-phase duplicate plotIds
query order opposite Store order
one candidate generation failure
one candidate projection failure
```

## 24. Provenance and clean-room declaration

Observed reference behavior:

```text
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52
- boxSelect enabled option
- Shift-mousedown box arm
- dragPan disable/restore
- transient DOM rectangle
- bounding-box feature query
- feature-id de-duplication

JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b
- explicit selection-mode lifecycle
- adapter/mode separation

geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c
- explicit toolbar/edit-mode separation
```

Code reuse: `none`.

PlotLibre's screen topology, exact semantic-geometry narrow phase, Store-order selection, one-event batch intent and authored-state boundaries are independently specified here.
