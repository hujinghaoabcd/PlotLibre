# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering and exchanging semantic parametric situation plots and tactical graphics.

> PlotLibre 保存“符号类型 + authored controls + 参数 + 样式 + 元数据”。地图中的 LineString、Polygon、采样点、选择轮廓、平移/旋转/缩放预览和交互框均为可重新生成的派生结果。

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
main SHA:           d8b2d889dee81064069f96e555dd75b1c851ccf3
workspace version:  0.0.22
MapLibre GL JS:     6.0.0
Node.js:            20.19+
tests:              324 Node / 34 Chromium
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
MapLibre resources: 4 Sources / 10 Layers
benchmark jobs:     region selection + selection transform
007C:               merged PR #47–#50
008 design:         merged PR #51/#52
008A runtime:       merged PR #53
next runtime:       008B migration registry / planner / report records
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

- `@plotlibre/core`: domain types, PlotJSON foundations, Registry, transactional Store, commands and History;
- `@plotlibre/geometry`: pure planar, circular, closed-area and geodesic geometry;
- `@plotlibre/symbols`: nineteen built-in parametric Definitions;
- `@plotlibre/interaction`: drawing, ordered selection, region algorithms, batch commands and local transforms;
- `@plotlibre/maplibre`: rendering, exact projected hit resolution, handles and DOM/SVG interaction overlays;
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

Region coordinates use CSS pixels. MapLibre's rendered query is broad phase only; candidates are normalized to Store order, regenerated through the Registry, projected and tested against exact semantic point/line/polygon geometry. Labels, hit areas, handles and overlays are not selectable semantic geometry.

Invalid region completion preserves selection and explicit mode can retry. Region selection creates no History entry and adds no MapLibre Source or Layer.

### Atomic Store and commands

`PlotStore.applyTransaction()` stages complete mutations before one commit. `BatchEditCommand` captures exact before/after features, document order and selection.

Batch delete, translation, rotation and scale use one atomic command. Preview, rejection, cancellation and no-op never enter Store or History. Listener failures are isolated after commit.

### Whole-selection translation

```text
ordered authored controls
→ one order-independent local projection
→ one metre delta
→ translate every selected control
→ canonicalize/generate every candidate
→ one atomic command
```

Store is unchanged during preview. One invalid member rejects the complete batch.

### Whole-selection rotation and positive uniform scale

```ts
plot.selectionTransform
plot.selectionTransformSnapshot
plot.selectionTransformRejection
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
```

```text
all selected authored controls
→ one shared local-metre frame
→ fixed authored-control AABB-centre pivot
→ clockwise rotation or positive uniform scale
→ canonicalize/generate every member
→ complete preview or rejection
→ one stale-safe BatchEditCommand
```

Uniform scale accepts `[0.01, 100]`; reflection and non-uniform scale are excluded. Parameters, style, metadata, document order, selection order and Primary are preserved.

The derived DOM/SVG overlay uses a 4 CSS-pixel minimum start radius and a 24 CSS-pixel minimum visual frame for tiny selections. It adds no MapLibre resource.

## PlotJSON

Current production envelope:

```text
PlotLibreDocument / schemaVersion 1.0.0
```

Document `schemaVersion` owns document structure. Feature `definitionVersion` owns one symbol's authored semantics. They are independent migration domains.

### Merged 008A foundations

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

Persisted versions use canonical numeric `MAJOR.MINOR.PATCH` triples. Components are non-negative safe integers. Prefixes, missing components, leading zeros, prerelease/build suffixes and unsafe numbers reject. Comparison is numeric rather than lexical.

Direct-object JSON safety accepts only null, strings, booleans, finite numbers, dense arrays and plain/null-prototype objects. It rejects non-JSON values, custom prototypes, accessors, hidden/symbol properties, sparse/custom arrays and cycles without invoking getters.

Traversal is iterative and deterministic. Repeated non-cyclic references are cloned independently. Own `__proto__` and `constructor` keys remain safe data properties and cannot pollute prototypes.

### Default safety ceilings

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

These are finite untrusted-input ceilings, not recommended document sizes, memory guarantees or latency SLAs. Overrides must be finite positive safe integers.

008A does **not** connect these primitives to the existing parser or import path. Historical PlotJSON `1.0.0` normalization remains unchanged. Migration registry, report-bearing reading, Definition-version enforcement and atomic document replacement are delivered in 008B–008D.

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

docs/design/region-selection.md
docs/design/rotation-uniform-scale.md
docs/design/rotation-uniform-scale-runtime.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md

docs/algorithms/selection-local-transform.md
docs/algorithms/plotjson-migration-pipeline.md

docs/performance/region-selection-benchmark.md
docs/performance/selection-transform-benchmark.md

docs/handover/LATEST.md
docs/handover/2026-08-05-milestone-008a-post-merge-finalization.md
```

The next runtime slice is `agent/008b-plotjson-migration-registry-runtime`: migration step/reference types, graph validation, deterministic linear planning and immutable report record types only. Parser, Registry, Store and MapLibre integration remain later milestones.
