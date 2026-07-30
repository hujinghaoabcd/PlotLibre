# Route Multi-Head Algorithms

Public Definitions:

```text
arrow.route.bidirectional@1.0.0
arrow.route.double-head@1.0.0
```

## Canonical controls

Both Definitions store only an authored centre path:

```text
controlPoints[0]      = exact start / route origin
controlPoints[1..n-2] = optional path controls
controlPoints[n-1]    = exact end / primary objective
```

Two controls produce a straight form. Intermediate controls shape the Catmull–Rom route. Sampled points, widths, offsets, neck planes and head vertices are derived and are never serialized.

## Shared frame

The implementation starts from `PathRibbonFrame`:

1. establish one local-metre projection at the first authored control;
2. reject non-finite or coincident paths;
3. sample the authored path with Catmull–Rom interpolation;
4. measure the sampled centreline;
5. derive one constant ribbon width from total path length;
6. expose the measured centreline, width and local projection to the multi-head generators.

`RouteMultiHeadParameters` extends the path-ribbon contract with primary and secondary head ratios. Every parameter is finite and range-validated before geometry construction.

## Bidirectional route

`buildBidirectionalRouteRing()` produces one Polygon with equal direction emphasis at both endpoints.

Algorithm:

1. derive `headLength = totalLength × headLengthPathRatio`;
2. require the head length to exceed the ribbon width;
3. sample the exact path start and end with their local tangents;
4. build the start head using the reversed start tangent, so the authored start remains the exact outward tip;
5. build the end head using the forward end tangent, so the authored end remains the exact outward tip;
6. slice the measured centreline between the two derived neck distances;
7. offset that shaft slice by the common half-width;
8. join the two heads and shaft boundaries into one open outline;
9. close and orient the ring counterclockwise;
10. reject self-intersection before returning WGS84 coordinates.

Path reversal changes the local sampling origin but preserves the declared topology: two exact authored endpoint tips, one shaft and one simple Polygon.

## Double-head route

`buildDoubleHeadRouteRings()` returns two coherent Polygon components under one semantic Definition.

### Primary component

The primary component delegates to the existing strict `buildRouteArrowRing()` implementation. Therefore:

- the final authored control is the exact primary objective/tip;
- the body is trimmed at a derived primary neck plane;
- the primary head and shaft form one simple Polygon.

### Secondary component

The secondary emphasis head is positioned by distance along the same measured path:

```text
secondaryTipDistance
  = totalLength
  - primaryHeadLength
  - secondaryHeadGap
```

Then:

1. sample the centreline at `secondaryTipDistance`;
2. use the sampled tangent as the secondary head direction;
3. derive secondary head length and half-width from independent ratios;
4. build one closed counterclockwise head Polygon;
5. validate it as a simple ring;
6. return it as the second render component.

Changing secondary-head parameters must not modify the primary route Polygon. The derived secondary head never enters Store, handles, History or PlotJSON.

## Render bundles

```text
arrow.route.bidirectional
fills:    1
lines:    1
hitAreas: 1

arrow.route.double-head
fills:    2
lines:    2
hitAreas: 2
```

Every component carries the parent feature's `plotType`, style and metadata-derived render properties.

## Failure policy

Generation fails closed when:

- fewer than two distinct authored controls remain;
- a parameter is non-finite or outside its documented range;
- derived width exceeds its configured bounds;
- two endpoint heads leave no positive shaft;
- secondary-head placement leaves insufficient path space;
- any output ring is degenerate or self-intersecting.

No topology validation is removed to make difficult paths render.
