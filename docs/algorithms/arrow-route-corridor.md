# Route and Corridor Algorithms

## Semantic model

Both symbols persist only authored center-path controls. Geometry is derived in a local metre frame.

### Route

```text
0      origin
1..n-2 optional path controls
n-1    exact objective/tip
```

### Corridor

```text
0      endpoint A
1..n-2 optional path controls
n-1    endpoint B
```

## Shared path-ribbon construction

1. Project authored controls to a local metre plane around the first control.
2. Remove consecutive duplicate controls.
3. Sample a Catmull-Rom centerline.
4. Measure total path length `L`.
5. Derive full ribbon width `W = L * widthPathRatio`.
6. Offset the centerline by `W / 2` with bounded miter joins.
7. Reject non-finite, degenerate or self-intersecting output.

## Route-specific closure

The route reserves `L * headLengthPathRatio` for the terminal head. The shaft centerline is trimmed at the derived neck plane. A reusable exact-tip arrow head is joined to the two shaft sides. The output is one counterclockwise simple Polygon.

## Corridor-specific closure

The corridor joins the left offset path to the reversed right offset path. The start and end joins are straight flat caps. It has no direction head and therefore remains structurally distinct from the route arrow.

## Serialization

Only `plotType`, authored center-path controls, parameters, style and metadata survive PlotJSON. Sampled centerlines, offsets, necks, heads and polygon vertices never become controls.
