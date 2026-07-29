# Route and Corridor Symbol Group

This group adds two public symbols that share one pure path-ribbon geometry foundation while preserving independent semantics.

## `arrow.route`

Authored controls are a directed center path:

```text
0      route origin
1..n-2 optional path controls
n-1    exact objective/tip
```

The shaft is a constant-width derived ribbon. The final segment is trimmed at a derived neck plane and completed by one exact-tip arrow head.

## `arrow.corridor`

Authored controls are an undirected center path:

```text
0      corridor endpoint A
1..n-2 optional path controls
n-1    corridor endpoint B
```

The output is a constant-width ribbon with flat end caps and no arrow head.

## Shared boundary

- Shared: local-metre projection, Catmull-Rom sampling, length-derived width, offset/miter construction and strict simple-ring validation.
- Independent: route head construction and directionality versus corridor flat-cap undirected closure.
- Persisted state contains only authored center-path controls. Sampled centerlines, offsets, necks, heads and polygon vertices are derived.
