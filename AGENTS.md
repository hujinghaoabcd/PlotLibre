# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent, or future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical state:

```text
plot definition + control points + parameters + style + metadata
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

- Do not run undocumented Euclidean geometry directly on lon/lat.
- Use local metre projection for short symbols and explicit geodesic policies for large symbols.
- Validate coincident, collinear, antimeridian, high-latitude and non-finite inputs.
- Rings must be finite, closed and topologically validated where parameters may cause self-intersection.
- Parameters must be explicit, versioned, validated and serializable.
- Shared primitives must remain pure and worker-ready.
- Related variants must share components, frames or strategies; copying complete generators is prohibited.
- A new public symbol needs a real semantic or structural distinction, not only new default values.
- Multi-point arrow geometry must preserve semantic controls separately from curve samples and polygon vertices.
- Self-intersection checks must not be removed merely to make a difficult path render.
- For topology-sensitive symbols, `PlotDefinition.validate()` must cover complete renderability before Store mutation.
- A variant golden test should prove unchanged shared geometry rather than only snapshot the final polygon.
- A compound symbol must be one coherent semantic geometry, not an array of independently persisted simpler symbols.
- Shaft/head joins must not retain derived offset points beyond the head neck plane.

## 4. Clean-room and licensing

Reference libraries may be studied for public behavior, terminology and documented mathematics.

Before code reuse:

1. identify source and revision;
2. verify license;
3. record provenance;
4. preserve notices;
5. avoid unclear or incompatible code;
6. prefer independent implementation from mathematical descriptions and behavioral tests.

Never copy proprietary Mapbox code. Current project packages remain `UNLICENSED` until the owner chooses a license.

## 5. API and PlotJSON

- Public types use stable dotted identifiers.
- Public state must be serializable unless documented otherwise.
- Breaking changes require migration notes and a PlotJSON migration plan.
- MapLibre remains a peer dependency.
- Framework wrappers remain optional.
- Definition defaults are part of the visual/data contract.
- Every semantic path control must survive PlotJSON round trip.
- Derived centerline samples, offset vertices, notch vertices, branch points and polygon vertices must not be serialized as semantic controls.

Current public Arrow identifiers:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
```

`arrow.double` version 1.0 stores exactly four controls. A three-point mirrored objective or fifth connection/branch control is not canonical PlotJSON and requires a future explicit adapter or migration.

## 6. Interaction rules

- Exact two-point definitions use `TwoPointDrawSession`.
- Definitions requiring three or more points use `MultiPointDrawSession`.
- Session choice is derived from `PlotDefinition.controlSchema`, not hard-coded symbol IDs.
- Fixed-count multi-point symbols use `completeAtMaximum`; variable-count symbols use explicit completion.
- Draft output is allowed only after minimum semantic validity is reached.
- Enter and double-click completion must preserve all semantic controls when enabled by the Definition.
- Backspace/Delete removes one uncommitted multi-point control at a time.
- Drawing-state point removal is not Store history.
- MapLibre double-click zoom must stay disabled through the native `dblclick` event and be restored afterward.
- Cancel and destroy must restore the previous zoom-handler state immediately.
- One completed handle drag produces one `ReplacePlotCommand`.
- Invalid handle previews do not enter Store or History.
- Any geometry that can fail during render must be rejected before command execution.
- Derived notch/head/body/branch/bridge vertices are never semantic handles.
- `arrow.double` must auto-complete on the fourth click through the generic maximum-point session path.

## 7. Testing requirements

Required before a milestone is merged:

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

For MapLibre symbols, Store size is not sufficient. Tests must verify:

- committed Source data;
- correct `plotType`;
- relevant fill/line Layers;
- at least one actual `queryRenderedFeatures()` result.

New geometry requires numerical, degenerate, parameter-isolation and golden-fixture tests. Multi-point geometry must additionally test:

- exact control-count contract;
- exact semantic tail/tip controls;
- interior-control influence where applicable;
- pair/input-order invariance where declared;
- duplicate-control cleanup or rejection policy;
- self-intersection policy;
- full-path PlotJSON round trip;
- declared completion mode: fixed maximum, double-click or Enter;
- camera stability and zoom restoration when double-click is used;
- semantic handle edit, history depth and undo;
- invalid geometry rejection before Store mutation.

Variant tests must additionally show that changing the variant-specific parameter does not silently change shared body/head geometry.

Compound-symbol tests must additionally cover shared-body topology, pair-role invariance, distinct objectives and the prohibition on independently persisted component arrows.

MapLibre `querySourceFeatures()` may return duplicate tile copies. Semantic handle counts must be validated by unique `plotId + handleIndex`, not raw Feature count.

Current minimum regression baseline after 005H:

```text
101 Node tests
13 Chromium tests
```

## 8. Playground and Pages

- GitHub Pages base is `/PlotLibre/`.
- Production cannot require private API keys.
- Online basemap failure cannot block plotting.
- E2E cannot depend on remote tiles.
- MapLibre 6 Worker and Shared modules remain aligned with the installed package.
- Every public symbol gets a selector/catalog entry and browser test in the same slice.
- Multi-point symbols require visible instructions for their actual completion mode and point removal.
- Fixed-count symbols must clearly state automatic maximum-point completion.
- Pages deploys only from `main`.

## 9. Documentation and handover

Every completed task must update:

```text
docs/handover/LATEST.md
```

and add an immutable file:

```text
docs/handover/YYYY-MM-DD-milestone-NNN.md
```

Each handover includes:

- branch, PR and deployment state;
- completed files and capabilities;
- validation commands and exact results;
- architecture decisions;
- limitations and risks;
- prioritized next tasks;
- continuation instructions.

The handover contract requires these exact headings:

```text
## Completed in this milestone
## Next tasks
## Risks and decisions
```

Never delete or rewrite earlier immutable handovers. A later finalization state must be recorded in a new handover file.

## 10. Scope control

One complete high-quality vertical slice is preferred to many incomplete symbols. Do not develop multiple new Arrow types in parallel.

## 11. Current priority

Milestone 005H implements `arrow.double` as one connected compound geometry with:

1. exactly four explicit semantic controls;
2. unordered exact tail pair at indices 0/1;
3. unordered exact objective pair at indices 2/3;
4. `minPoints = 4`, `maxPoints = 4`;
5. fourth-click `completeAtMaximum` completion;
6. no persisted three-point mirror;
7. no fifth branch control in PlotJSON 1.0;
8. branch center derived from `branchPositionRatio`;
9. pair-swap geometry invariance;
10. all four controls as handles;
11. one shared body, two wings, two heads and one inner bridge;
12. one finite, closed, counterclockwise simple Polygon;
13. strict full-generation Definition validation;
14. eighth Playground selector/sample and actual browser render coverage.

Authoritative records:

```text
docs/design/arrow-double-semantic-design.md
docs/algorithms/arrow-double.md
docs/handover/2026-07-29-milestone-005h-double-arrow-implementation.md
```

Current branch/PR:

```text
agent/double-arrow-vertical-slice
PR #15
workspace 0.0.12
101 Node tests
13 Chromium tests
```

Immediate order:

1. keep PR #15 latest CI green;
2. mark Ready and merge;
3. validate main and Pages eight-symbol deployment;
4. write a new immutable 005H Finalization handover;
5. only then begin an independent `arrow.pincer` canonical semantic design.

Do not implement pincer, route, corridor, squad-combat or other complex arrows in parallel or as aliases of `arrow.double`.
