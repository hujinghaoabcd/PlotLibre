# PlotLibre Architecture

## 1. Product boundary

PlotLibre is a MapLibre-native but engine-independent framework for semantic parametric situation plots and tactical graphics.

Canonical authored state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Generated GeoJSON, samples, local frames, pivots, handles, guides, selection overlays, region paths and transform previews are derived. They cannot replace authored controls or enter PlotJSON as canonical state.

Current candidate baseline:

```text
base main:            b1c394f93a0a685d291fba54207dad9f9d020cb2
workspace:            0.0.22
PlotJSON:             PlotLibreDocument / 1.0.0
production migrations: none
public Definitions:   19
merged tests:         375 Node / 34 Chromium
008D candidate:       400 Node / 34 Chromium
renderer:             4 Sources / 10 Layers
next milestone:       008E compatibility closure
```

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

Rules:

- `core` cannot depend on geometry, MapLibre, DOM or UI;
- `geometry` cannot depend on MapLibre, DOM or UI;
- `symbols` owns pure parametric Definitions and geometry generation;
- `interaction` owns engine-independent sessions, selection and commands;
- `maplibre` owns projection, browser events, derived rendering and high-level state coordination;
- Playground consumes public APIs and cannot duplicate canonical algorithms.

## 3. Core package

Current key modules:

```text
commands.ts
errors.ts
history.ts
plotjson.ts
plotjson-error.ts
plotjson-safety.ts
plotjson-version.ts
plotjson-migration-types.ts
plotjson-migration-registry.ts
plotjson-migration-report.ts
plotjson-current-decoder.ts
plotjson-reader.ts
plotjson-import.ts
registry.ts
store.ts
types.ts
```

Core responsibilities include domain types, PlotJSON safety/versioning/migrations/reading/import preparation, `PlotRegistry`, atomic `PlotStore`, commands and History.

## 4. Other packages

### `@plotlibre/geometry`

Pure local/geodesic projection, vectors, bearings, curves, offsets, circular geometry, ring topology, arrow heads, ribbons and antimeridian utilities.

### `@plotlibre/symbols`

Nineteen public Definitions. Each owns stable type/version, authored-control semantics, defaults, optional canonicalization, validation, geometry generation and optional semantic guides.

### `@plotlibre/interaction`

Draw sessions, ordered selection, region geometry, batch commands, local translation, shared-pivot rotation and positive uniform scale.

### `@plotlibre/maplibre`

Derived renderer, Source/Layer lifecycle, projected region resolution, browser input, handles, selection transforms and the high-level `PlotLibre` facade.

### `@plotlibre/playground`

Browser demonstration, Nanjing samples, PlotJSON UI, Chromium E2E and GitHub Pages deployment.

## 5. Canonical feature model

```text
PlotFeature
├── id
├── plotType
├── definitionVersion
├── controlPoints
├── parameters
├── style
├── metadata
└── revision
```

Feature ids are document-unique. Generated geometry is discarded and regenerated. Metadata cannot hide core state. Interactive edits increment revision exactly once; imported document replacement preserves imported revisions.

## 6. Registry pipeline

```text
PlotFeature
→ Definition lookup by plotType
→ canonicalize authored controls where permitted
→ validate Definition semantics
→ generate RenderBundle
```

Every interactive mutation and every imported feature must pass complete Registry generation before Store mutation.

## 7. Store and History

`PlotStore.applyTransaction()` stages complete add/replace/remove/order changes before one commit and one batch event. Listener failures are isolated after commit.

`PlotStore.replaceDocument()` builds one full transaction:

```text
new-only ids       → add
reused ids         → replace
old-only ids       → remove
import order       → orderedIds
```

The full candidate is cloned and duplicate ids reject before commit.

History records successful interactive commands only. Import is a document replacement boundary and clears History after success; it is not inserted as an undoable command.

## 8. Selection and transforms

Selection is transient, ordered and Primary-last. It is excluded from PlotJSON.

Region selection uses rendered broad phase followed by exact projected semantic geometry. Selection transforms operate on authored controls in one shared local frame and commit one atomic command after complete Registry preflight.

## 9. Renderer resources

Sources:

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

Layers:

```text
plotlibre-fill
plotlibre-line
plotlibre-point
plotlibre-selection-line
plotlibre-selection-point
plotlibre-draft-fill
plotlibre-draft-line
plotlibre-draft-point
plotlibre-handle-guide
plotlibre-handle
```

Atomic import adds no resource. The existing Store subscription rebuilds committed rendering from the one successful Store batch event.

## 10. PlotJSON domains

Document `schemaVersion` owns document structure, ordering, references and future persisted editor state.

Feature `definitionVersion` owns one Definition's authored-control and parameter semantics.

Complete import order:

```text
JSON boundary
→ document migration/current decode
→ live Definition target derivation
→ Definition migration
→ final Definition equality
→ Registry canonicalize/generate
→ final detached semantic scan
→ one Store replacement
→ post-success transient cleanup
```

## 11. 008A–008C foundation

008A provides canonical version handling, descriptor-safe cloning and finite resource limits.

008B provides separate deterministic document and Definition migration graphs and immutable report records.

008C provides `readPlotDocument()`, trusted synchronous migration execution, observable current-1.0 compatibility normalization, duplicate-id rejection, Definition output validation and final semantic-limit scanning.

## 12. 008D pure import preparation

```ts
preparePlotDocumentImport(input, registry, options?)
deriveRegistryDefinitionTargets(features, registry, migrations)
```

Preparation uses three reader passes:

```text
Pass 1 document history/current decode
Pass 2 Definition history
Pass 3 final canonical detach/scan
```

Document migrations execute once. Definition migrations execute once per required edge. Pass 3 performs no migration.

## 13. Live target resolution

Each live Definition contributes exact `(type, canonical version)`.

```text
source exactly live → no migration
otherwise           → follow unique outgoing edges
stop                → first exact live target
```

There is no alias, nearest-version or best-effort resolution.

Multiple historical versions of one source type may converge to one live target. Different final targets for the same source type reject because the reader target map is keyed by source plotType.

## 14. Atomic application boundary

High-level import:

```text
preparePlotDocumentImport
→ store.replaceDocument
→ post-success cleanup
```

Before Store commit, failures preserve Store/order, selection/Primary, History, active drawing/draft, armed region selection, armed rotation/scale, translation and committed rendering.

After commit, transient state is cancelled/cleared. Cleanup operations are isolated so an external listener exception cannot report a committed import as failed or prevent remaining cleanup.

## 15. Configuration ownership

`PlotLibreOptions.migrations` installs one trusted migration registry by identity.

`PlotLibreOptions.plotJsonLimits` is copied and frozen at construction, preventing caller mutation from changing the active input policy.

## 16. Runtime roadmap

```text
008A version / errors / JSON safety / limits — merged
008B migration registry / planner / report records — merged
008C safe reader / migration execution / invariants — merged
008D Registry-aware atomic import — active PR #59
008E compatibility fixtures / examples / closure — next
```

007D groups, locks, visibility and z-order remain blocked until 008E closes the PlotJSON foundation.

## 17. Validation

Every exact runtime head runs:

```text
Node 20.19 and 22
all Node tests
Playground typecheck/build
handover contract
region benchmark
selection-transform benchmark
34 Chromium tests
zero unresolved review threads
```

## 18. Deferred work

```text
production schema and Definition migrations
PlotJSON 1.1.0 shape
groups / locks / visibility / z-order
unresolved Definition preservation
downgrade and future-version best effort
snapping and constraints
touch transforms
copy/paste and duplication
coordinated npm release
```
