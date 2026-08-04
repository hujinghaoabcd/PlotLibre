# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering and exchanging semantic parametric situation plots and tactical graphics.

> PlotLibre 是面向 MapLibre GL JS 的参数化态势标绘框架。它保存“符号类型 + authored controls + 参数 + 样式 + 元数据”，而地图中的 LineString、Polygon、采样点、选择轮廓、平移预览和语义引导线均为可重新生成的派生结果。

## Live Playground

**https://hujinghaoabcd.github.io/PlotLibre/**

The Playground includes nineteen public Definitions:

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

It supports exact fixed-point and variable-point drawing, live preview, structured rejection feedback, Definition-driven guides, semantic handle editing, ordered multi-selection, atomic batch delete, whole-selection local-metre translation, undo/redo, style editing, nineteen Nanjing samples and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.21
MapLibre GL JS:    6.0.0
Node.js:           20.19+
Node tests:        219
Chromium tests:    30
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
MapLibre sources:  4
MapLibre layers:   10
```

Public package versions remain independent development placeholders; the root workspace version is not yet a coordinated npm release.

## Professional editing

Milestone 007A adds an engine-independent selection and atomic batch-editing foundation.

### Ordered selection and Primary

`SelectionController` stores transient interaction state:

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

Selection order is acquisition order and the final id is Primary. Only Primary exposes authored semantic handles and Definition guides; every selected object receives a lightweight derived overlay.

MapLibre input semantics:

```text
plain click       replace selection or make the hit object Primary
Shift + click     add
Ctrl/Cmd + click  toggle
Alt + click       subtract
empty plain click clear
```

The compatibility APIs `plot.select(id | undefined)` and `plot.selectedId` remain available. `plot.selectedIds` exposes the complete ordered selection.

Selection is not document state: it does not increment feature revisions and is excluded from PlotJSON.

### Atomic Store transactions

`PlotStore.applyTransaction()` stages additions, replacements, removals and optional exact document ordering before one commit. Every precondition and candidate is validated against the staged state. A failure leaves the Store unchanged and no listener observes partial state.

Post-commit listener exceptions are isolated and reported through the configured listener-error hook. A listener failure cannot create changed Store state without a corresponding History entry.

### Batch commands and delete

`BatchEditCommand` captures exact before/after feature values, document order and selection snapshots. Execute, undo and redo each use one Store transaction and one selection restoration.

Delete/Backspace and the Playground batch-delete button remove the complete selection with one history entry. Undo restores the original feature order, values, selected ids and Primary; redo replays the exact after-state without incrementing revisions again.

### Whole-selection translation

Dragging the body of any selected plot translates every selected plot by one common local-metre vector:

```text
selection authored controls
→ one order-independent local projection origin
→ pointer start/end in that frame
→ one metre delta
→ same delta applied to every authored control
→ canonicalize and generate every candidate
→ one atomic BatchEditCommand on pointer release
```

The Store remains unchanged during preview. Escape cancels the complete gesture. If any member is invalid, high-latitude, antimeridian-crossing, excessively large or otherwise non-renderable, the full batch is rejected and History is unchanged. Parameters, style and metadata are preserved.

Control-handle drag retains priority over body translation. PlotLibre reserves Shift for additive selection while installed, temporarily disables MapLibre box zoom and restores its previous state on destroy.

## MapLibre rendering resources

The adapter owns four derived GeoJSON sources:

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

and ten layers:

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

The selection source is independent from semantic handles. Polygon selections are rendered as boundaries, LineStrings as line highlights and Points as point highlights. Primary is carried as derived overlay metadata. Style reload reconstructs committed geometry, selection overlays, drafts, handles and guides from canonical state.

## Architecture foundations

- engine-independent `PlotDefinition`, Registry, transactional Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- schema-driven `TwoPointDrawSession` and `MultiPointDrawSession`;
- ordered `SelectionController` with Primary semantics and immutable events;
- atomic `BatchEditCommand` with exact document-order restoration;
- variable-count and fixed-count completion without symbol-ID-specific state machines;
- Definition-level canonicalization limited to deterministic authored-coordinate permutations;
- full Registry generation preflight before interactive completion, create, replace, import or batch mutation changes Store;
- structured completion rejection and last-valid-draft retention;
- transient Definition-driven draft controls and semantic guide paths;
- MapLibre committed, selection, draft, semantic-handle and handle-guide resources;
- semantic handle editing and whole-selection translation with one command per completed gesture;
- local-metre, geodesic, topology and coordinate-mode foundations;
- deterministic geometry fixtures and actual-rendered-feature Chromium tests;
- browser coverage for every public symbol family plus real multi-selection, translation and batch-delete flows.

## Circular arc family

Milestone 006J introduced a three-control circular foundation shared by one open line and two area Definitions.

### Circular arc

`line.circular-arc@1.0.0` stores exact start, through and end controls. The three controls define a stable local-metre circumcircle. The through-point selects the exact minor or major directed sweep. Sampling is split into `start → through` and `through → end`, so every authored control remains exact. The output is one open LineString.

### Circular segment

`area.circular-segment@1.0.0` uses the same exact arc and closes it with the straight chord between the authored endpoints. Minor and major segments are supported when the derived ring is finite, counterclockwise and simple.

The identifier is deliberately not `area.lune`: the legacy plotting type often named `Lune/弓形` is one circular arc plus one chord, while a mathematical lune is bounded by two arcs and requires a separate semantic model.

### Sector

`area.sector@1.0.0` stores center, exact radius/start point and end-bearing handle. The bearing handle defines direction only; its distance from the center does not define a second radius. The rendered end-boundary point is derived at the first radius.

```text
sweepDirection: "clockwise" | "counterclockwise"
```

supports crossing 0° and sweeps above 180°. A transient center-to-bearing radial guide is visible during complete drafts, selection and handle dragging but never enters committed geometry, Store, History or PlotJSON.

### Circular failure policy

Version 1.0 is local-metre only and rejects invalid WGS84 positions, duplicate or collinear controls, unstable or excessive circles, antimeridian/high-latitude/large-extent input, ambiguous sweeps, zero/full sector sweeps, invalid parameters and invalid Polygon topology. There is no silent fallback or authored-control movement.

## Closed action areas

`area.closed-curve@1.0.0` stores 3–64 ordered boundary waypoints. A periodic Hermite/Catmull–Rom curve interpolates every authored control and closes the derived Polygon ring.

`area.gathering-place@1.0.0` stores exactly flank A, front crown and flank B. The flank pair may be canonicalized only by deterministic permutation; the rounded rear closure anchor remains derived.

## Arrow families

PlotLibre includes exact two-point arrows, curved and attack-path arrows, flat and tailed attack closures, four-control double arrow, five-control pincer, center-path squad combat arrow, route and corridor ribbons, bidirectional exact-two-tip route and a route with a derived secondary emphasis head.

Every Definition preserves authored semantic roles while widths, heads, necks, notches, bridges, mirrored points and samples remain derived.

## Workspace packages

| Package | Responsibility |
|---|---|
| `@plotlibre/core` | Domain types, Registry, transactional Store, commands, history and PlotJSON |
| `@plotlibre/geometry` | Pure planar, circular, closed-area and geodesic geometry |
| `@plotlibre/symbols` | Built-in parametric Definitions |
| `@plotlibre/interaction` | Draw sessions, selection, batch commands and local translation |
| `@plotlibre/maplibre` | MapLibre rendering, overlays, semantic handles/guides and gesture adapters |
| `@plotlibre/playground` | Browser demo, E2E and GitHub Pages site |

## Development and validation

```bash
npm install
npm run check
npm run playground:e2e
npm run handover:check
```

Pull requests must remain Draft while implementation is incomplete. Merge only after current-head Node 20.19/22 validation, all Node tests, Playground build, handover contract and Chromium E2E are green, review threads are resolved and the PR is marked Ready. Use Squash and merge; never merge the feature branch locally.
