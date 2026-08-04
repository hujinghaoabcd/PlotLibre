# Screen-Region Selection Algorithm Record

Milestone: 007B  
Status: implemented and merged through PR #42/#43  
Canonical document mutation: none  
Merged `main`: `f98483d3504ce464c93e5a03a49f7f856d1cc1a0`

## 1. Purpose

This record defines the implemented algorithms for:

```text
screen box capture
screen lasso capture
lasso topology validation
broad-phase candidate lookup
exact projected geometry intersection
deterministic multi-id SelectionController application
```

Region selection changes transient selection only. It never edits authored controls, Store order, feature revisions, History or PlotJSON.

## 2. Coordinate domain

All capture and exact-intersection predicates use finite CSS-pixel screen coordinates relative to the MapLibre canvas.

```ts
interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}
```

Validation:

```text
Number.isFinite(x)
Number.isFinite(y)
```

Projection occurs in the adapter only:

```text
WGS84 generated coordinate
→ map.project([lng, lat])
→ finite ScreenPoint
```

Core and PlotJSON do not depend on ScreenPoint.

## 3. Numeric conventions

```text
pointer activation threshold: 4 CSS px
lasso sample spacing:          2 CSS px
lasso RDP tolerance:           1.5 CSS px
minimum lasso area:            16 CSS px²
predicate epsilon:             1e-9
```

Distance thresholds use squared Euclidean distance:

```text
d²(a,b) = (a.x-b.x)² + (a.y-b.y)²
```

## 4. Box construction

For start `s` and end `e`:

```text
minX = min(s.x, e.x)
minY = min(s.y, e.y)
maxX = max(s.x, e.x)
maxY = max(s.y, e.y)
```

Activation:

```text
d²(s,e) >= 4²
```

A valid box also requires:

```text
maxX > minX
maxY > minY
```

Closed ring:

```text
(minX,minY)
(maxX,minY)
(maxX,maxY)
(minX,maxY)
(minX,minY)
```

Every drag direction normalizes to the same bounds. Sub-threshold and zero-area boxes are no-op.

## 5. Lasso sampling

The first point is always retained. A later sample is appended only when its distance from the previous retained sample is at least 2 CSS px.

Consecutive duplicates are removed with epsilon comparison. A final point equal to the first is removed before validation because closure is implicit.

## 6. Signed area

For open ring vertices `p_i=(x_i,y_i)`:

```text
A = 1/2 Σ (x_i y_(i+1) - x_(i+1) y_i)
```

The final edge connects the last point to the first. Valid lasso area requires:

```text
abs(A) >= 16
```

Area is not used before topology when doing so could let a self-intersecting path cancel to zero and hide the more specific rejection.

## 7. Ramer–Douglas–Peucker simplification

RDP operates on the cleaned open sample path with tolerance 1.5 CSS px.

- endpoints are preserved;
- maximum perpendicular distance determines recursion;
- a segment is collapsed only when the maximum distance is within tolerance;
- simplification does not authorize an invalid raw path.

Both raw and simplified paths are validated independently.

## 8. Simple-ring validation

A lasso ring is simple only when:

- it has at least three distinct vertices;
- no two non-consecutive vertices are epsilon-equal;
- no edge is zero length;
- non-adjacent edges do not cross;
- non-adjacent edges do not touch;
- non-adjacent collinear edges do not overlap.

Adjacent edges may share their common endpoint. The first and last edges are adjacent through implicit closure.

Validation order:

```text
clean raw path
→ point-count validation
→ raw simple-ring validation
→ raw area validation
→ RDP simplify
→ simplified point-count validation
→ simplified simple-ring validation
→ simplified area validation
→ implicit closure
```

Invalid result returns one stable rejection and no region is resolved.

## 9. Segment primitives

Orientation:

```text
orient(a,b,c) = (b.x-a.x)(c.y-a.y) - (b.y-a.y)(c.x-a.x)
```

The sign is reduced with epsilon to `-1 | 0 | 1`.

Boundary-inclusive segment intersection returns true for:

- proper crossing;
- endpoint touch;
- collinear endpoint contact;
- collinear overlap.

Simple-ring validation excludes adjacent edge pairs before using this inclusive predicate.

## 10. Point in ring

Point-in-ring uses boundary testing first, then even–odd ray crossing.

```text
boundary → boundary
odd crossings → inside
even crossings → outside
```

Region selection treats boundary as a hit.

## 11. Polygon fill with holes

For Polygon rings:

1. point must be inside or on the exterior;
2. point inside a hole is excluded;
3. point on exterior or hole boundary is a boundary hit.

A region intersects a polygon when any of these is true:

- a region edge intersects any polygon ring boundary;
- a region vertex lies in polygon fill;
- an exterior polygon vertex lies inside/on the region.

A region entirely inside a Polygon hole is not a hit. Crossing a hole boundary is a hit because it intersects polygon boundary geometry.

## 12. Geometry predicates

Supported projected semantic geometry:

```text
Point
LineString
Polygon
MultiLineString
MultiPolygon
```

Semantics:

- Point: projected center inside/on region;
- LineString: any vertex inside/on or any segment crossing/touching region;
- Polygon: boundary intersection or either containment direction, respecting holes;
- Multi: any component hit;
- compound PlotFeature: any selectable generated geometry hit, feature id returned once.

CSS stroke width, point radius, labels, hit areas, guides, drafts, handles and selection overlays are ignored.

## 13. Broad phase

Input is the region's normalized screen bounds.

```text
queryRenderedFeatures(bounds, committed fill/line/point layers)
→ read properties.plotId
→ discard absent/unknown ids
→ deduplicate tile and layer duplicates
→ order by PlotStore ids
```

MapLibre result order is not semantic. The query is only candidate pruning.

## 14. Candidate generation and projection

For each unique candidate in Store order:

```text
feature = Store.get(id)
bundle = Registry.generate(feature)
select semantic Point/LineString/Polygon/Multi output
project every coordinate exactly once for that generated geometry
perform exact intersection
```

The resolver reports metrics including rendered feature count, unique rendered ids, candidate count, generated candidate count and projected geometry count.

Failures are fail-closed:

```text
query failure      → SELECTION_REGION_QUERY_FAILED
generation failure → SELECTION_REGION_CANDIDATE_GENERATION_FAILED
projection failure → SELECTION_REGION_PROJECTION_FAILED
```

No partial result is returned.

## 15. Deterministic selection mutation

```ts
selection.applyMany(ids, intent, reason)
```

Input ids are validated and deduplicated before any mutation.

Algorithms:

```text
replace:
  result = candidates

add:
  result = current + candidates not already selected

subtract:
  result = current excluding candidate set

toggle:
  result = current excluding candidates already selected
         + candidates not previously selected
```

Candidate order is Store order. Existing survivor order is preserved. The final result id is Primary.

One effective result emits one immutable SelectionChange. Equal before/after state emits nothing. Region selection does not enter History.

## 16. Session transitions

### Box

```text
armed
→ pointerdown stores start
→ movement below threshold remains armed
→ movement at/above threshold becomes active
→ pointerup returns completed ring or no-op
→ session resets for one-shot use
```

### Lasso

```text
armed
→ pointerdown starts active path
→ pointermove samples
→ pointerup validates
→ valid returns completed ring and resets
→ invalid becomes rejected and retains points/rejection
→ next pointerdown clears rejection and starts direct retry
```

## 17. Adapter lifecycle

The MapLibre controller owns:

- feature-hit preflight for Shift-empty arbitration;
- pointer capture;
- dragPan while active;
- MapLibre boxZoom reservation;
- DOM/SVG overlay;
- synthetic click suppression;
- cancellation on Escape, camera/style/resize, Store/selection and document lifecycle.

Intentional release clears the owned pointer id before `releasePointerCapture()`. Chromium's resulting `lostpointercapture` is ignored. An unexpected pointercancel/lost-capture while an id remains owned cancels.

## 18. Complexity

Let:

```text
R = retained lasso samples
C = unique broad-phase candidates
V = total generated projected vertices for C
```

Approximate costs:

```text
box construction:          O(1)
lasso sampling:            O(R)
RDP worst case:            O(R²)
simple-ring validation:    O(R²)
broad-phase normalization: O(query results + Store size ordering)
exact projection/testing:  O(V × region-edge checks)
selection application:     O(current selection + C)
```

The current design relies on MapLibre's rendered index to keep `C` smaller than Store size. No persistent custom index is implemented.

## 19. Performance evidence boundary

Functional correctness is validated. A scale latency report is still pending.

Required future fixtures:

```text
100
1,000
10,000 features
```

Record environment, camera/viewport, feature mix, generated vertices, Store size, unique candidate count, query time, generation/projection time, exact-intersection time, total latency, warmup/repetitions, median and p95.

No hard latency claim or indexing requirement is inferred before measurement.

## 20. Validation evidence

```text
PR #42 exact head: 812183a47413bdac554fbd6ca75e1443026ac474
CI #437:          264 Node / 30 Chromium
squash:           e18183df5be4b98c38ba177e8440b28e859c2c90

PR #43 exact head: f7d9e107221d4ee3fc4278f697a7c0ba84d95a59
CI #445:          264 Node / 32 Chromium
squash:           f98483d3504ce464c93e5a03a49f7f856d1cc1a0
```

Final Chromium acceptance includes explicit box replace, DOM overlay cleanup, invalid lasso rejection persistence and direct retry.
