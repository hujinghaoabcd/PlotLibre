# Route Multi-Head Group Design

Date: 2026-07-30

## Public identifiers

```text
arrow.route.bidirectional
arrow.route.double-head
```

## Shared authored model

Both Definitions persist only an authored centre path:

```text
0      exact start
1..n-2 optional path controls
n-1    exact end / objective
```

All sampled centreline points, widths, neck planes, offset boundaries and secondary-head vertices are derived render geometry.

## `arrow.route.bidirectional`

Semantic meaning: one route with equal directional emphasis in both directions.

Structural contract:

- authored start and end are both exact arrow tips;
- one derived neck plane is placed behind each endpoint;
- the shaft occupies the path interval between the two neck planes;
- the result is one closed, counterclockwise, simple Polygon;
- reversing the complete authored path produces the same normalized geometry up to winding/rotation.

## `arrow.route.double-head`

Semantic meaning: one directed route with a primary exact objective and a secondary forward-emphasis head behind it.

Structural contract:

- the authored final point remains the exact primary tip;
- the primary body/head geometry follows `arrow.route` semantics;
- a second derived head is placed behind the primary neck along the same sampled route;
- the secondary head is a separate coherent Polygon render component and is never a semantic control;
- reversing the path changes direction semantics and therefore changes the geometry.

## Shared geometry

A pure `RouteMultiHeadFrame` owns:

- PathRibbonFrame construction;
- path measurement and distance slicing;
- standard head-length and ribbon-width checks;
- exact endpoint samples and tangents;
- secondary-head placement;
- finite/closed/winding/simple validation.

The two public generators share this frame but retain independent output topology.

## Interaction

Both Definitions use the existing schema-driven variable `2..64` MultiPointDrawSession:

```text
minPoints = 2
maxPoints = 64
completeOnDoubleClick = true
```

Two authored controls produce a straight form; optional intermediate controls curve the route. Double-click or Enter completes.

## Non-goals

- no branching trunk in this slice;
- no parameter-only aliases;
- no hidden persistence of derived heads;
- no weakening of simple-ring validation;
- no pincer hardening work.
