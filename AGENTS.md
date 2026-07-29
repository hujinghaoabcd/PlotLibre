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
- Derived centerline samples, offset vertices, notch vertices and polygon vertices must not be serialized as semantic controls.

Current public Arrow identifiers:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
```

## 6. Interaction rules

- Exact two-point definitions use `TwoPointDrawSession`.
- Definitions requiring three or more points use `MultiPointDrawSession`.
- Session choice is derived from `PlotDefinition.controlSchema`, not hard-coded symbol IDs.
- Draft output is allowed only after minimum semantic validity is reached.
- Enter and double-click completion must preserve all semantic controls.
- Backspace/Delete removes one uncommitted multi-point control at a time.
- Drawing-state point removal is not Store history.
- MapLibre double-click zoom must stay disabled through the native `dblclick` event and be restored afterward.
- Cancel and destroy must restore the previous zoom-handler state immediately.
- One completed handle drag produces one `ReplacePlotCommand`.
- Invalid handle previews do not enter Store or History.
- Any geometry that can fail during render must be rejected before command execution.
- Derived notch/head/body vertices are never semantic handles.

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
- exact semantic tail/tip controls;
- interior-control influence;
- duplicate-control cleanup;
- self-intersection policy;
- full-path PlotJSON round trip;
- double-click completion;
- camera stability and zoom restoration;
- semantic handle edit, history depth and undo;
- invalid geometry rejection before Store mutation.

Variant tests must additionally show that changing the variant-specific parameter does not silently change shared body/head geometry.

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

Milestone 005G completed `arrow.attack.tailed` with:

- the same exact two-edge tail and spine semantics as `arrow.attack`;
- shared `AttackArrowFrame` body/head construction;
- independent inward swallowtail closing strategy;
- explicit notch depth and opening-width parameters;
- relational golden proof that flat attack body/head coordinates are unchanged;
- complete renderability validation before Store mutation;
- PlotJSON, seven-symbol Playground and real Chromium coverage;
- one valid tail drag = one undoable replace command.

The next priority is Milestone 005H: `arrow.double`.

Required design work before implementation:

1. define a canonical semantic model for two heads and the shared branching body;
2. prove it is not two independent arrows stored as one object;
3. identify the minimum useful control count and completion rule;
4. isolate reusable branch/head primitives before writing the public generator;
5. define symmetry, handedness and crossing/topology policies;
6. keep derived branch intersections and polygon vertices out of PlotJSON;
7. add only `arrow.double` in this slice;
8. complete Definition, PlotJSON, Playground, Chromium and handover together.

Do not implement pincer, route, corridor, squad-combat or other complex arrows in parallel.
