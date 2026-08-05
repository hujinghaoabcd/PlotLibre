# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering and exchanging semantic parametric situation plots and tactical graphics.

> PlotLibre 保存“符号类型 + authored controls + 参数 + 样式 + 元数据”。地图中的 LineString、Polygon、采样点、选择轮廓、变换预览和交互框均为可重新生成的派生结果。

## Live Playground

**https://hujinghaoabcd.github.io/PlotLibre/**

The Playground includes nineteen public Definitions:

```text
arrow.straight             arrow.fine
arrow.fine.tailed          arrow.assault-direction
arrow.curved               arrow.attack
arrow.attack.tailed        arrow.double
arrow.pincer               arrow.squad-combat
arrow.route                arrow.corridor
arrow.route.bidirectional  arrow.route.double-head
line.circular-arc
area.closed-curve          area.gathering-place
area.circular-segment      area.sector
```

It supports fixed/variable-point drawing, live preview, semantic handles, ordered multi-selection, box/lasso selection, atomic batch delete, whole-selection translation, clockwise rotation, positive uniform scale, undo/redo, style editing, nineteen Nanjing samples and PlotJSON import/export.

## Current baseline

```text
main SHA:           9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
workspace version:  0.0.22
MapLibre GL JS:     6.0.0
Node.js:            20.19+
merged tests:       375 Node / 34 Chromium
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
MapLibre resources: 4 Sources / 10 Layers
benchmark jobs:     region selection + selection transform
007C:               merged PR #47–#50
008 design:         merged PR #51/#52
008A runtime:       merged PR #53/#54
008B runtime:       merged PR #55/#56
008C runtime:       merged PR #57
next runtime:       008D Registry-aware atomic import
```

The root version is a development baseline, not yet a coordinated npm release across all public packages.

## Canonical model

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Generated geometry, samples, local frames, pivots, selection overlays, region paths, handles, guides and previews are derived. They are not persisted as authored state.

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

- `@plotlibre/core`: domain types, safe PlotJSON reader/migrations, Registry, transactional Store, commands and History;
- `@plotlibre/geometry`: pure planar, circular, closed-area and geodesic geometry;
- `@plotlibre/symbols`: nineteen built-in parametric Definitions;
- `@plotlibre/interaction`: drawing, ordered selection, region algorithms, batch commands and local transforms;
- `@plotlibre/maplibre`: rendering, projected hit resolution, handles and DOM/SVG interaction overlays;
- `@plotlibre/playground`: browser demo, E2E and GitHub Pages site.

## Professional editing

### Ordered selection and Primary

Selection is transient, ordered and excluded from PlotJSON. The final selected id is Primary.

```text
plain click       replace / make Primary
Shift + click     add
Ctrl/Cmd + click  toggle
Alt + click       subtract
empty plain click clear
```

```ts
plot.select(id | undefined)
plot.selectedId
plot.selectedIds
plot.selection
```

Every selected plot receives a derived overlay. Only Primary exposes authored handles, Definition guides and style editing.

### Box and lasso selection

```ts
plot.regionSelection
plot.regionSelectionSnapshot
plot.regionSelectionRejection
plot.startBoxSelection({ intent })
plot.startLassoSelection({ intent })
plot.cancelRegionSelection()
```

Intent is `replace | add | toggle | subtract`; pointer modifier priority is `Alt > Ctrl/Cmd > Shift > configured intent`.

MapLibre rendered queries are broad phase only. Candidates are normalized to Store order, regenerated through the Registry, projected and tested against exact semantic point/line/polygon geometry. Labels, hit areas, handles and overlays are not selectable semantic geometry.

### Atomic editing commands

`PlotStore.applyTransaction()` stages complete mutations before one commit. `BatchEditCommand` captures exact before/after features, document order and selection.

Batch delete, translation, rotation and scale use one atomic command. Preview, rejection, cancellation and no-op never enter Store or History. Listener failures are isolated after commit.

### Whole-selection transforms

```text
ordered authored controls
→ one order-independent local projection
→ translation delta or fixed AABB-centre pivot
→ translate, rotate clockwise or scale uniformly
→ canonicalize/generate every candidate
→ one atomic command
```

Uniform scale accepts `[0.01,100]`; reflection and non-uniform scale are excluded. Store is unchanged during preview, and one invalid member rejects the complete batch.

## PlotJSON

Current persisted envelope:

```text
PlotLibreDocument / schemaVersion 1.0.0
```

Document `schemaVersion` owns document structure. Feature `definitionVersion` owns one symbol's authored semantics. They are independent migration domains.

### 008A: version and JSON-safety foundation

```ts
PLOTJSON_DOCUMENT_TYPE
CURRENT_PLOTJSON_SCHEMA_VERSION
parsePlotJsonVersion(...)
comparePlotJsonVersions(...)
isCanonicalPlotJsonVersion(...)
PlotJsonError
DEFAULT_PLOTJSON_LIMITS
resolvePlotJsonLimits(...)
assertPlotJsonInputSize(...)
clonePlotJsonValue(...)
scanPlotJsonValue(...)
```

Persisted versions are canonical numeric `MAJOR.MINOR.PATCH` triples. Direct-object safety accepts JSON primitives, dense arrays and plain/null-prototype objects only, while rejecting accessors, hidden/symbol properties, custom prototypes, sparse arrays, non-finite values and cycles without invoking getters.

Default untrusted-input ceilings:

```text
UTF-8 input:             16 MiB
maximum depth:           128
value nodes:             1,000,000
object keys:             250,000
string or key length:    1,000,000 UTF-16 code units
features:                100,000
controls per feature:    10,000
total authored controls: 1,000,000
```

### 008B: deterministic migration planning

```ts
PlotJsonMigrationRegistry
PlotJsonMigrationRegistryError
PlotJsonDocumentMigration
PlotJsonDefinitionReference
PlotJsonDefinitionMigration
PlotJsonMigrationReport
createPlotJsonMigrationReport(...)
```

Document graph nodes are schema versions. Definition graph nodes are exact `(plotType, definitionVersion)` pairs, allowing explicit type-renaming chains. A source node has at most one strictly increasing outgoing edge; duplicate, branch, downgrade, self and cycle configurations reject. Planning never executes migration functions.

### 008C: safe reader and migration execution

```ts
interface ReadPlotDocumentOptions {
  readonly migrations?: PlotJsonMigrationRegistry;
  readonly definitionTargets?: Readonly<
    Record<string, PlotJsonDefinitionReference>
  >;
  readonly limits?: Partial<PlotJsonLimits>;
}

interface ReadPlotDocumentResult {
  readonly document: PlotDocument;
  readonly report: PlotJsonMigrationReport;
}

readPlotDocument(input, options?)
parsePlotDocument(input, options?)
```

The pure reader now performs:

```text
UTF-8 guard or descriptor-safe direct-object clone
→ document envelope and exact migration execution
→ frozen migration input + new synchronous output
→ JSON/resource scan after every step
→ current 1.0 compatibility decode and report facts
→ duplicate feature-id rejection
→ explicit Definition migration and plotType rename
→ per-step controlPointsPerFeature enforcement
→ final whole-document totalControlPoints scan
→ deeply frozen document and report
```

Historical defaults remain compatible but are no longer silent: missing Definition version, parameters, style, feature metadata, revision and dropped unknown fields are represented in the migration report.

`definitionTargets` remains explicit application configuration. Live `PlotRegistry` target derivation, Definition generation and atomic application-state replacement are 008D work.

## Current import limitation

The current high-level import path still performs Registry preflight followed by:

```text
store.clear()
→ repeated store.add(feature)
```

008D will replace this with one prepared exact-order Store document transaction. Any expected failure must preserve Store, order, selection, History and active interaction state.

## Rendering resources

```text
Sources
  plotlibre-committed
  plotlibre-selection
  plotlibre-draft
  plotlibre-handles

Layers
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

Region and transform DOM/SVG overlays are outside these resources. Style reload rebuilds derived map state from canonical Store and selection state.

## Validation

```bash
npm run check
npm run playground:e2e
npm run benchmark:region-selection
npm run benchmark:selection-transform
npm run handover:check
```

Current performance benchmarks are observational and define no browser latency SLA.

## Documentation authority

```text
README.md
AGENTS.md
docs/ARCHITECTURE.md
docs/PLOTJSON_SPEC.md
docs/DEVELOPMENT_PLAN.md

docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md
docs/design/plotjson-migration-registry-runtime.md
docs/design/plotjson-reader-runtime.md
docs/algorithms/plotjson-migration-pipeline.md

docs/handover/LATEST.md
docs/handover/2026-08-05-milestone-008c-reader-runtime.md
docs/handover/2026-08-05-milestone-008c-post-merge-finalization.md
```

The next runtime branch is `agent/008d-plotjson-atomic-import-runtime`, created only after this Markdown-only finalization reaches synchronized `main`.
