# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical state:

```text
plot definition + authored control points + parameters + style + metadata
```

Rendered LineString/Polygon coordinates, samples, inferred frames and semantic guides are derived output and must never replace canonical state.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

- `core` cannot depend on MapLibre or DOM;
- `geometry` cannot depend on Store, UI, events or map engines;
- `symbols` register behavior through `PlotDefinition`;
- `interaction` remains engine-independent;
- `maplibre` translates semantic state to Sources/Layers/events;
- Playground consumes public APIs only;
- circular dependencies are prohibited.

## 3. Geometry rules

- Never run undocumented Euclidean geometry directly on longitude/latitude.
- Use local-metre projection for short symbols and explicit geodesic policies for large symbols.
- Validate non-finite, duplicate, collinear, antimeridian, high-latitude and excessive-extent inputs.
- Rings must be finite, closed, oriented and topologically validated.
- Shared primitives and frames remain pure and worker-ready.
- A public symbol needs a real semantic or structural distinction, not only new defaults.
- Authored controls remain separate from centers, radii, bearings, samples, offsets, heads, notches, closure anchors and final vertices.
- Topology checks must not be removed merely to make difficult input render.
- Complete Registry generation occurs before Store mutation.

### Circular geometry

- `line.circular-arc`, `area.circular-segment` and `area.sector` are local-metre-only in version 1.0.
- Three-point circular frames reject duplicate, collinear, near-collinear, unstable and excessive-radius input.
- Circular sampling preserves exact authored start/through/end controls where those roles exist.
- Minor/major sweep and crossing 0° must be deterministic.
- No two-point committed fallback, hidden control movement, singular degradation or silent geodesic switch.
- The legacy `Lune/弓形` arc-plus-chord geometry is named `area.circular-segment`; true `area.lune` remains deferred.

## 4. Public semantic groups

Current Definitions:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
arrow.pincer
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
line.circular-arc
area.closed-curve
area.gathering-place
area.circular-segment
area.sector
```

Catalog contract:

```text
14 Arrow + 1 Line + 4 Area = 19 public symbols
```

Existing compatibility arrays must remain meaningful:

```text
arrowSymbols = 14
lineSymbols  = 1
areaSymbols  = 4
builtInSymbols = 19
```

## 5. Circular canonical controls

### Circular arc

```text
0 exact start
1 exact through-point
2 exact end
```

Output is one open LineString. The through-point selects the directed minor or major arc. No control canonicalization is allowed.

### Circular segment

```text
0 arc/chord start
1 exact through-point on the selected arc
2 arc/chord end
```

Output is one simple Polygon formed by the selected arc and exact straight chord. Winding normalization cannot rewrite controls.

### Sector

```text
0 center
1 exact radius and start-boundary point
2 end-bearing handle
```

Control `2` defines bearing only. Its distance from the center does not define a second radius. The rendered end-boundary point is derived at the radius established by control `1`.

```text
sweepDirection: "clockwise" | "counterclockwise"
```

The center-to-bearing guide is transient and Definition-driven.

## 6. API, PlotJSON and semantic guides

- Public identifiers are stable dotted names aligned with output category.
- Every authored semantic control survives PlotJSON round trip.
- Derived centers, radii, normalized angles, sweeps, endpoints, samples, closure coordinates and guides are not serialized.
- `canonicalizeControlPoints` may only return a deterministic permutation of exact authored coordinates.
- `deriveDraftControlPoints` and `deriveSemanticGuidePaths` are transient-only hooks.
- Semantic guides never enter committed RenderBundles, Store, History or PlotJSON.
- MapLibre renders Definition-driven guide paths in draft and selected/drag states.
- Create, replace and import persist only canonicalized controls after full generation preflight.

## 7. Interaction and rejection

- Exact two-point schemas use `TwoPointDrawSession`; all others use `MultiPointDrawSession`.
- Session selection comes from `controlSchema`, never hard-coded identifiers.
- Fixed-count symbols complete on the maximum valid authored click.
- Variable-count symbols complete explicitly by double-click or Enter.
- A rejected maximum candidate keeps the session active and replaceable.
- Rejection, last-valid drafts and guides are transient.
- One successful handle drag creates one `ReplacePlotCommand`; invalid previews never mutate Store or History.
- All three circular Definitions are fixed-three: the third pointer can show a complete draft and the third valid click automatically completes.
- Sector draft/selection exposes the center-to-bearing radial guide because the authored bearing handle usually differs from the rendered endpoint.

## 8. Testing requirements

Required before merge:

```bash
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
```

Browser-facing changes also require:

```bash
npm run playground:e2e
```

Current merged baseline:

```text
184 Node tests
28 Chromium tests
19 public symbols
```

Circular tests prove exact controls, directed minor/major sweeps, crossing 0°, reversal, density isolation, failure policy, Registry, PlotJSON, semantic guides and style reload.

## 9. Playground and Pages

- Pages base is `/PlotLibre/` and deploys only from `main`.
- Basemap failure cannot block plotting or change the semantic catalog.
- E2E cannot depend on remote tiles.
- Production exposes nineteen selectors and nineteen samples.
- Base compatibility E2E `?e2e=1` intentionally retains the original nine-selector surface.
- Full current E2E uses:

```text
?e2e=1&squad=1&paths=1&areas=1&circular=1
```

- Every new public Definition receives a selector, sample, instruction and actual-rendered browser test in the same milestone.
- Generic status listeners bind before specialized group listeners.

## 10. Clean-room and licensing

006J references:

```text
sakitam-fdd/ol-plot@c919e60b4edeaeca53c08f9552f793b2ae9537f0
sakitam-fdd/maptalks.plot@37dab8d0dd31650540146e1e0f03f54982f01799
```

Both were reviewed as MIT-licensed. Code reuse is `none`; only observable behavior, terminology and independent test expectations were studied.

Current PlotLibre packages remain `UNLICENSED` until the owner selects a project license.

## 11. Documentation and handover

Every completed milestone updates `docs/handover/LATEST.md` and adds an immutable record:

```text
docs/handover/YYYY-MM-DD-milestone-NNN-description.md
```

`LATEST.md` must contain:

```text
## Current state
## Completed in this milestone
## Validation
## Next tasks
## Risks and decisions
```

Never rewrite earlier immutable handovers to falsify historical state.

## 12. Current priority

Merged implementation baseline:

```text
main SHA:           297d0a644eaa3427f8fd59b82b7bc3582221d49e
workspace:          0.0.20
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      184
Chromium baseline:  28
Milestone 006J:     merged through PR #34
```

Current administrative slice:

```text
branch: agent/006j-post-merge-finalization
scope:  documentation-only merged-state synchronization
```

Next development milestone:

```text
Milestone 007 professional editing semantic design
planned branch: agent/007-professional-editing-design
runtime implementation: prohibited until design freeze
```

Binding continuation order:

1. finish and merge the 006J post-merge finalization without runtime changes;
2. create Milestone 007 design from the final `main`;
3. freeze multi-selection canonical state and selection ownership;
4. freeze box/lasso hit testing and additive/subtractive selection gestures;
5. define whole-object translation as authored-control transformation;
6. define rotation/scale pivot and coordinate-mode policy;
7. define group, lock and z-order semantics without duplicating feature state;
8. define multi-object commands, atomic validation and rollback;
9. define keyboard, touch, undo/redo, performance and browser fixtures;
10. merge a documentation-only design PR before writing runtime;
11. do not add true lune, geodesic circular fallback, pincer hardening or route-head variants during Milestone 007 design.
