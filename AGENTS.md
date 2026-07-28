# PlotLibre Development Contract

This file defines mandatory rules for any developer, coding agent, or future conversation working on PlotLibre.

## 1. Product definition

PlotLibre is not a generic GeoJSON draw toolbar and not a thin wrapper around another drawing library. It is a MapLibre-native framework for semantic, parametric situation plots and tactical graphics.

The semantic source of truth is always:

```text
plot definition + control points + parameters + style + metadata
```

Rendered GeoJSON is derived output. Never replace semantic control points with generated polygon vertices as the canonical model.

## 2. Architectural boundaries

The dependency direction is mandatory:

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
```

Future packages may depend on these public layers, but:

- `core` must never depend on MapLibre or DOM APIs;
- `geometry` must never depend on MapLibre, UI frameworks, or browser events;
- `symbols` must define behavior through `PlotDefinition` registration;
- `interaction` must remain engine-independent and must not import MapLibre or DOM APIs;
- `maplibre` must translate semantic render bundles and interaction snapshots into MapLibre sources, layers and events;
- UI packages must call public controller APIs and must not mutate stores directly.

Avoid circular package dependencies.

## 3. Geometry rules

- Do not perform Euclidean geometry directly on longitude/latitude values except for explicitly documented approximations.
- Use a local projection for short-range symbols and geodesic algorithms for large-range symbols.
- Every geometry generator must define behavior for degenerate, coincident, collinear, antimeridian, and high-latitude inputs.
- Every symbol must have numerical tests and, when the visual test system exists, golden image tests.
- Generated polygon rings must be closed and finite.
- Algorithm parameters must be explicit, validated, versioned, and serializable.

## 4. Clean-room and licensing rules

Reference libraries may be studied for public behavior, terminology, architecture, and documented formulas. Before code is reused or translated:

1. identify the exact source file and repository revision;
2. verify its license;
3. record provenance in `docs/ALGORITHM_POLICY.md`;
4. preserve required notices;
5. avoid code from incompatible or unclear licenses;
6. prefer independent implementation from published mathematical descriptions and behavior tests.

Never copy proprietary Mapbox code released after its open-source license change.

## 5. API rules

- Public identifiers use stable dotted names such as `arrow.straight`.
- Public data structures must be serializable unless explicitly documented otherwise.
- Public APIs require TypeScript declarations and focused tests.
- Breaking changes require a migration note and a PlotJSON migration strategy.
- MapLibre remains a peer dependency.
- Framework wrappers must remain optional packages.

## 6. Testing requirements

Before publishing a development milestone, run:

```bash
npm run typecheck
npm test
npm run handover:check
```

A milestone is incomplete if any check fails. When browser interaction begins, Playwright tests and a MapLibre version matrix become mandatory.

## 7. Documentation requirements

Architecture, data format, public API, and roadmap documents must match the code. Do not leave major architectural decisions only in source comments or chat messages.

## 8. Mandatory handover after every completed task

Every completed development task must update:

```text
docs/handover/LATEST.md
```

and add a dated immutable milestone file:

```text
docs/handover/YYYY-MM-DD-milestone-NNN.md
```

Each handover must contain:

- current repository and branch state;
- exact completed files and capabilities;
- validation commands and results;
- architectural decisions made;
- known limitations and risks;
- next tasks in priority order;
- instructions sufficient for another developer to continue without chat history.

Never delete prior milestone handovers. `LATEST.md` is replaced each time; dated milestone files are append-only.

## 9. Scope control

Do not implement many symbol types before the shared geometry primitives, registry, validation, editing model, and tests are stable. A vertical slice with one high-quality symbol is preferred over many untested copied algorithms.

## 10. Current priority

Read `docs/handover/LATEST.md` before starting. The current next milestone is the authoritative task list. After Milestone 002, prioritize the real MapLibre browser playground and GitHub Pages deployment before expanding the symbol catalog.
