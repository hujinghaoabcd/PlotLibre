# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent, or future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical state:

```text
plot definition + authored control points + parameters + style + metadata
```

Rendered GeoJSON is derived output and must never replace semantic source data.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

Rules:

- `core` cannot depend on MapLibre or DOM;
- `geometry` cannot depend on MapLibre, Store, UI or events;
- `symbols` register behavior through `PlotDefinition`;
- `interaction` remains engine-independent;
- `maplibre` translates semantic state to Sources/Layers/events;
- Playground consumes only public APIs;
- avoid circular package dependencies.

## 3. Geometry rules

- Do not run undocumented Euclidean geometry directly on longitude/latitude.
- Use local-metre projection for short symbols and explicit geodesic policies for large symbols.
- Validate coincident, collinear, antimeridian, high-latitude and non-finite inputs.
- Rings must be finite, closed and topologically validated where parameters may cause self-intersection.
- Parameters must be explicit, versioned, validated and serializable.
- Shared primitives and frames must remain pure and worker-ready.
- Related symbols must share components, frames or strategies; copying complete generators is prohibited.
- A public symbol needs a real semantic or structural distinction, not only new defaults.
- Semantic controls must remain separate from samples and polygon vertices.
- Self-intersection checks must not be removed merely to make difficult input render.
- Topology-sensitive Definitions must validate complete renderability before Store mutation.
- Compound symbols must declare coupling topology and emit coherent components under one semantic Definition.
- Closed-area symbols must not persist sampled curves, derived closure anchors or final rings as controls.
- Circular symbols must define centre, radius, bearing direction, sweep and output topology before implementation.
- Three-point circular frames must reject coincident, collinear, near-collinear and excessive-radius input.
- Circular sampling must preserve exact authored start, through and end controls where those roles exist.
- Local and geodesic circular behavior must not be mixed invisibly.

## 4. Related-symbol groups

A development slice may contain two or three related symbols only when:

1. they share a meaningful mathematical foundation;
2. the shared foundation is extracted as pure geometry;
3. every public identifier has independent semantic controls or closure structure;
4. every Definition has independent validation and tests;
5. Registry, PlotJSON, Playground, browser coverage and handover complete in one milestone.

Do not group unrelated symbols to increase symbol count. Do not create public variants only by changing defaults.

Milestone 006I added `area.closed-curve` and `area.gathering-place`. `area.route-loop` remains deferred.

Milestone 006J design candidates are:

```text
line.circular-arc@1.0.0
area.sector@1.0.0
area.circular-segment@1.0.0
```

Deferred:

```text
area.lune
```

The legacy name `Lune/弓形` in studied plotting libraries describes a circular segment bounded by one arc and one chord. PlotLibre uses the mathematically accurate identifier `area.circular-segment`. A true two-arc lune requires a separate future semantic design.

## 5. Clean-room and licensing

Reference libraries may be studied for observable behavior, terminology and documented mathematics.

Before code reuse:

1. identify source and revision;
2. verify license;
3. record provenance;
4. preserve required notices;
5. avoid unclear or incompatible code;
6. prefer independent implementation from mathematics and behavioral tests.

006J reference revisions:

```text
sakitam-fdd/ol-plot@c919e60b4edeaeca53c08f9552f793b2ae9537f0
sakitam-fdd/maptalks.plot@37dab8d0dd31650540146e1e0f03f54982f01799
```

Both were reviewed as MIT-licensed. Code reuse is `none`.

Never copy proprietary Mapbox code. Current PlotLibre packages remain `UNLICENSED` until the owner selects a license.

## 6. API, canonical controls and PlotJSON

- Public types use stable dotted identifiers aligned with output category.
- Public state must be serializable unless documented otherwise.
- Breaking changes require migration notes and a PlotJSON migration plan.
- Definition defaults are part of the visual/data contract.
- Every authored semantic control must survive PlotJSON round trip.
- Derived centres, radii, bearings, normalized angles, sweeps, samples, offsets, closure anchors and output vertices must not be serialized as controls.
- Definition-derived draft controls and semantic guides are transient.
- `canonicalizeControlPoints` may only deterministically permute exact authored coordinates.
- Canonicalization must not add, remove, move, mirror, clamp or synthesize a control.
- Registry validation and generation operate on canonicalized controls.
- Create, replace and import persist canonicalized controls.
- Invalid canonicalization fails closed with `INVALID_CONTROL_POINT_CANONICALIZATION`.

Current implemented public identifiers remain:

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
area.closed-curve
area.gathering-place
```

006J candidates are not yet public and must not enter Registry or PlotJSON on the design branch.

### Proposed circular arc

```text
line.circular-arc controls:
0 exact start
1 exact through-point
2 exact end
```

The output is one open LineString. The through-point selects minor or major directed sweep. No canonical reordering is allowed.

### Proposed circular segment

```text
area.circular-segment controls:
0 arc/chord start
1 exact through-point on the selected arc
2 arc/chord end
```

The derived Polygon follows the selected arc and closes by a straight chord. The sampled arc and closing coordinate are derived.

### Proposed sector

```text
area.sector controls:
0 centre
1 exact radius/start-boundary point
2 end-bearing handle
```

Control `2` defines bearing only. Its distance from the centre does not define a second radius. The rendered end-boundary point is derived at the radius established by control `1`.

Public parameter candidate:

```text
sweepDirection: "clockwise" | "counterclockwise"
```

No proposed 006J Definition canonicalizes controls.

## 7. Interaction and rejection rules

- Exact two-point Definitions use `TwoPointDrawSession`.
- Other fixed or variable schemas use `MultiPointDrawSession`.
- Session choice comes from `controlSchema`, never hard-coded symbol IDs.
- Fixed-count symbols use maximum-point completion; variable-count symbols use explicit completion.
- Pointer drafts may use committed controls plus the live pointer candidate.
- Derived draft controls are rendering-only and cannot complete or persist a plot.
- A session becomes terminal only after Registry validation and full generation preflight.
- Rejection is non-terminal and never enters Store, History or PlotJSON.
- Rejected fixed-count candidates must remain replaceable.
- Invalid transient pointer geometry preserves the last valid draft or shows a semantic guide.
- One completed handle drag produces one `ReplacePlotCommand`.
- Invalid handle previews never enter Store or History.

Proposed 006J interaction contract:

```text
minPoints = 3
maxPoints = 3
third pointer candidate = first full renderable draft
third valid click = automatic completion
```

Two-point state is a semantic guide only. It is not a legal committed fallback. Sector must expose a radial guide from centre through the authored end-bearing handle because that handle may not lie on the rendered arc endpoint.

## 8. Testing requirements

Required before any merge:

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

Current merged regression baseline:

```text
163 Node tests
23 Chromium tests
16 public symbols: 14 Arrow + 2 Area
```

The 006J design PR changes documentation only but still runs the complete baseline.

Before 006J geometry implementation, freeze tests for:

- exact start/through/end interpolation;
- minor and major arcs in both directions;
- crossing 0° and sweeps above 180°;
- reversed-control footprint behavior;
- deterministic density-only sampling parameters;
- duplicate, collinear and near-collinear rejection;
- excessive circumradius rejection;
- unsupported antimeridian, high-latitude and large-extent rejection;
- LineString-only circular arc output;
- simple closed circular-segment Polygon;
- sector end-bearing distance isolation;
- clockwise/counterclockwise sector parameter isolation;
- PlotJSON authored-control round trips;
- fixed-three interaction and actual rendered features.

## 9. Playground and Pages

- GitHub Pages base is `/PlotLibre/`.
- Production cannot require private API keys.
- Basemap failure cannot block plotting or change the semantic catalog.
- E2E cannot depend on remote tiles.
- Every public symbol receives selector, sample and browser coverage in the implementation milestone.
- Production currently exposes sixteen implemented symbols and sixteen samples.
- Base compatibility E2E uses `?e2e=1` with the original nine-selector surface.
- Extended current E2E uses `?e2e=1&squad=1&paths=1&areas=1`.
- Pages deploys only from `main`.
- The 006J design branch must not add selectors, samples or feature flags.

## 10. Documentation and handover

Every completed milestone updates `docs/handover/LATEST.md` and adds an immutable handover:

```text
docs/handover/YYYY-MM-DD-milestone-NNN-description.md
```

The handover contract requires these exact headings in `LATEST.md`:

```text
## Current state
## Completed in this milestone
## Validation
## Next tasks
## Risks and decisions
```

Never rewrite earlier immutable handovers. `LATEST.md` must describe the actual active or merged state.

## 11. Scope control

Prefer one complete related-symbol group to many incomplete symbols. A design milestone may contain research, semantic contracts, provenance and test planning without runtime code.

On `agent/006j-arc-sector-lune-design`, do not create:

```text
packages/geometry/src/circular-arc.ts
new PlotDefinitions
Registry entries
PlotJSON changes
Playground selectors or samples
new runtime tests
```

The implementation branch can be created only from `main` after the design PR merges.

## 12. Current priority

Merged baseline:

```text
main SHA:           b3a1a18c5aaf0b26a4c7c5e42a6e307eaa331873
workspace:          0.0.19
public symbols:     16 (14 Arrow + 2 Area)
Node baseline:      163
Chromium baseline:  23
Milestone 006I:     implementation and finalization merged
```

Active milestone:

```text
Milestone: 006J circular arc family semantic design
branch:    agent/006j-arc-sector-lune-design
scope:     documentation, provenance, mathematics and test fixtures only
```

Binding continuation order:

1. finish the design, algorithm, reference-matrix and immutable handover documents;
2. open a documentation-only Draft PR;
3. pass Node 20.19, Node 22, 163 Node, 23 Chromium, build and handover checks;
4. resolve all design review threads;
5. squash merge the design PR using the validated expected head;
6. create `agent/006j-circular-arc-family` from the new final `main`;
7. implement the pure circular frame and deterministic Node fixtures first;
8. only after geometry passes, add Definitions, Registry, PlotJSON, interaction, Playground and browser coverage;
9. do not add `area.lune` as an alias;
10. do not return to pincer hardening or add route-head variants.
