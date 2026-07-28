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
- `geometry` cannot depend on MapLibre, Store, UI, or events;
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
- Derived centerline samples, offset vertices and polygon vertices must not be serialized as semantic controls.

Current public Arrow identifiers:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
```

## 6. Interaction rules

- Exact two-point definitions use `TwoPointDrawSession`.
- Definitions requiring three or more points use `MultiPointDrawSession`.
- Session choice is derived from `PlotDefinition.controlSchema`, not hard-coded symbol IDs.
- Draft output is allowed only after minimum semantic validity is reached.
- Enter and double-click completion must preserve all semantic controls.
- Backspace/Delete removes one uncommitted multi-point control at a time.
- Drawing-state point removal is not Store history.
- MapLibre double-click zoom must be restored after complete, cancel or destroy.
- One completed handle drag produces one `ReplacePlotCommand`.
- Invalid handle previews do not enter Store.

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

- minimum point count;
- exact semantic tip;
- interior-control influence;
- duplicate-control cleanup;
- self-intersection policy;
- full-path PlotJSON round trip;
- double-click completion;
- zoom restoration;
- interior semantic handle edit and undo.

MapLibre `querySourceFeatures()` may return duplicate tile copies. Semantic handle counts must be validated by unique `plotId + handleIndex`, not raw Feature count.

## 8. Playground and Pages

- GitHub Pages base is `/PlotLibre/`.
- Production cannot require private API keys.
- Online basemap failure cannot block plotting.
- E2E cannot depend on remote tiles.
- MapLibre 6 Worker and Shared modules remain aligned with the installed package.
- Every public symbol gets a selector/catalog entry and browser test in the same slice.
- Multi-point symbols require visible instructions for completion and point removal.
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

Never delete earlier handovers.

## 10. Scope control

One complete high-quality vertical slice is preferred to many incomplete symbols. Do not develop multiple new Arrow types in parallel.

## 11. Current priority

Milestone 005E completes `arrow.curved`, the first multi-point symbol, with:

- reusable `MultiPointDrawSession` integration;
- Catmull–Rom/Hermite semantic centerline;
- arc-length variable-width shaft;
- tangent-aligned head;
- explicit self-intersection rejection;
- double-click/Enter completion;
- interior semantic handle editing;
- real Chromium rendered-feature validation.

The next priority is Milestone 005F: `arrow.attack`.

Before implementation:

1. research public attack-arrow semantics and record clean-room provenance;
2. establish a structural distinction from `arrow.curved`;
3. design a reusable multi-point body/frame if it benefits both flat-tail and tailed attack variants;
4. preserve the existing curved-arrow golden contract;
5. add only `arrow.attack` in this slice.

Do not implement `arrow.attack.tailed`, double, pincer, route or corridor arrows in parallel.
