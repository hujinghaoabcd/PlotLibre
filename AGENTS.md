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

Current public Arrow identifiers:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

## 6. Testing requirements

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

New geometry requires numerical, degenerate, parameter-isolation and golden-fixture tests. Multi-point geometry must add property tests where practical.

## 7. Playground and Pages

- GitHub Pages base is `/PlotLibre/`.
- Production cannot require private API keys.
- Online basemap failure cannot block plotting.
- E2E cannot depend on remote tiles.
- MapLibre 6 Worker and Shared modules remain aligned with the installed package.
- Every public symbol gets a selector/catalog entry and browser test in the same slice.
- Pages deploys only from `main`.

## 8. Documentation and handover

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

Never delete earlier handovers.

## 9. Scope control

One complete high-quality vertical slice is preferred to many incomplete symbols. Do not develop multiple new Arrow types in parallel.

## 10. Current priority

Milestone 005C completes `arrow.assault-direction` as a broad, angle-defined geometry that is structurally different from FineArrow.

The next priority is Milestone 005D: `arrow.curved`, the first multi-point symbol.

Before curved-arrow geometry, implement and test an engine-independent `MultiPointDrawSession` with:

- minimum-point validation;
- click-to-append;
- pointer preview;
- double-click or Enter completion;
- Backspace removal;
- Escape cancellation;
- generic snapshots usable by future attack/route/corridor symbols.

Then implement only `arrow.curved` using shared polyline cleaning, curve sampling, offsets, ring validation and real Chromium rendered-feature tests.

Do not implement attack, double, pincer, route or corridor arrows in parallel.
