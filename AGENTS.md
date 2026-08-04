# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

Canonical authored state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Generated geometry, samples, local frames, pivots, selection/region/transform overlays, handles and previews are derived. They cannot replace authored state or enter PlotJSON.

Groups, locks, visibility and z-order are future schema-owned core state. They cannot be hidden in metadata.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

Core cannot depend on geometry, MapLibre, DOM or UI. Geometry and interaction remain engine-independent. MapLibre owns projection, rendered queries, browser events and derived UI. Playground consumes public APIs and cannot duplicate framework algorithms.

PlotJSON versioning, JSON safety, migration, validation and import preparation belong in `@plotlibre/core`.

## 3. Current authority

```text
main SHA:           d8b2d889dee81064069f96e555dd75b1c851ccf3
workspace:          0.0.22
current schema:     PlotJSON 1.0.0
production migrations: none
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      324
Chromium baseline:  34
MapLibre Sources:   4
MapLibre Layers:    10
benchmark jobs:     region selection + selection transform
007A:               merged PR #38/#39
007B:               merged PR #40–#44
007B-P:             merged PR #45/#46
007C:               merged PR #47–#50
008 design:         merged PR #51/#52
008A runtime:       merged PR #53
current branch:     agent/008a-plotjson-post-merge-finalization
next runtime branch: agent/008b-plotjson-migration-registry-runtime
```

PR #53 validated exact head `cb3db0fa6dc38c9b852524c15e4066b52b0c7b38` in CI run `30951490118`, with 324 Node tests, 34 Chromium tests, both benchmark jobs and zero review threads. It squash-merged as `d8b2d889dee81064069f96e555dd75b1c851ccf3`.

Never use old-head evidence for a newer head. Design, runtime and post-merge finalization remain separate branches.

## 4. Selection and atomic editing

Selection is transient, ordered and Primary-last. It is excluded from PlotJSON and feature revision.

`PlotStore.applyTransaction()` stages one complete batch. `BatchEditCommand` captures exact before/after features, document order and selection. Batch delete, translation, rotation and scale each use one atomic command.

Preview, rejection, cancellation and no-op never enter Store or History.

## 5. Merged 007C transform contract

Transform authored controls only. Preserve:

```text
id
plotType
definitionVersion
parameters
style
metadata
Store order
selection order
Primary
```

Each effectively changed feature receives exact `revision + 1`.

Rotation/scale frame:

```text
all selected authored controls
→ one order-independent local-metre frame
→ fixed authored-control AABB-centre pivot
→ positive clockwise angle or positive uniform factor
→ complete Registry preflight
→ one stale-safe atomic command
```

Uniform scale is `[0.01,100]`. Reflection, negative/non-uniform scale, skew and snapping remain excluded.

## 6. PlotJSON design authority

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
docs/handover/2026-08-05-milestone-008-design-post-merge-finalization.md
```

Document `schemaVersion` owns document structure, order, references and future persisted editor state. Feature `definitionVersion` owns one Definition's authored control and parameter semantics.

Required future order:

```text
raw document
→ document schema migration
→ current document decode
→ Definition migration for every feature
→ final Definition-version equality
→ Registry preflight
→ atomic Store replacement
```

## 7. Merged 008A authority

```text
packages/core/src/plotjson-version.ts
packages/core/src/plotjson-error.ts
packages/core/src/plotjson-safety.ts
docs/design/plotjson-version-json-safety-runtime.md
docs/handover/2026-08-05-milestone-008a-plotjson-foundations.md
docs/handover/2026-08-05-milestone-008a-post-merge-finalization.md
```

Public primitives:

```text
PLOTJSON_DOCUMENT_TYPE
CURRENT_PLOTJSON_SCHEMA_VERSION
parsePlotJsonVersion
comparePlotJsonVersions
isCanonicalPlotJsonVersion
PlotJsonError / PlotJsonErrorCode
DEFAULT_PLOTJSON_LIMITS
resolvePlotJsonLimits
assertPlotJsonInputSize
clonePlotJsonValue
scanPlotJsonValue
```

008A intentionally does not change `parsePlotDocument()`, Registry, Store, MapLibre, schema shape or persisted output.

## 8. Persisted version contract

Accepted form:

```text
MAJOR.MINOR.PATCH
```

Components are canonical non-negative safe integers. Leading zeros, prefixes, missing components, decimals, exponent forms, prerelease/build suffixes and unsafe integers reject.

Comparison is numeric tuple comparison. Parsed records are frozen. Forged records reject. Invalid messages cannot echo an untrusted payload.

## 9. JSON-safety contract

Accepted direct values:

```text
null
string
boolean
finite number
dense array
plain or null-prototype object
```

Rejected:

```text
undefined
NaN / Infinity
BigInt / Symbol / function
Date / Map / Set / RegExp / typed arrays / class instances
custom prototypes
accessor / non-enumerable property / symbol key
sparse array / custom array property
cycle
```

Traversal is iterative and descriptor-based. It cannot invoke getters. Object keys are visited lexicographically. Repeated non-cyclic references are cloned independently.

Own `__proto__`, `constructor` and `prototype` keys must remain data properties without changing object prototypes. Use descriptor definition rather than ordinary assignment for untrusted keys.

## 10. Resource-limit contract

```text
inputBytes:               16 MiB UTF-8
maximum depth:            128
total value nodes:        1,000,000
total object keys:        250,000
maximum string/key length: 1,000,000 UTF-16 code units
features:                 100,000
controls per feature:     10,000
total authored controls:  1,000,000
```

These are finite untrusted-input ceilings, not product-size recommendations, memory guarantees or latency SLAs.

Overrides must be finite positive safe integers. Zero, negative, fractional, infinite, NaN and unsafe values reject. String length applies to values and keys.

## 11. Structured PlotJSON errors

`PlotJsonError` extends `PlotLibreError`. Context is scalar only:

```text
path
featureId
plotType
sourceVersion
targetVersion
limitName
limit
actual
cause
```

Never retain or dump complete documents or metadata.

Frozen code union:

```text
PLOTJSON_SYNTAX_INVALID
PLOTJSON_VALUE_NOT_JSON
PLOTJSON_RESOURCE_LIMIT_EXCEEDED
PLOTJSON_ROOT_INVALID
PLOTJSON_DOCUMENT_TYPE_UNSUPPORTED
PLOTJSON_SCHEMA_VERSION_INVALID
PLOTJSON_SCHEMA_VERSION_UNSUPPORTED
PLOTJSON_MIGRATION_PATH_MISSING
PLOTJSON_MIGRATION_OUTPUT_INVALID
PLOTJSON_CURRENT_SCHEMA_INVALID
PLOTJSON_FEATURE_ID_DUPLICATE
PLOTJSON_DEFINITION_NOT_FOUND
PLOTJSON_DEFINITION_VERSION_INVALID
PLOTJSON_DEFINITION_VERSION_UNSUPPORTED
PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING
PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID
PLOTJSON_REFERENCE_INVALID
PLOTJSON_IMPORT_TRANSACTION_INVALID
```

## 12. Current `1.0.0` compatibility

Historical parser behavior remains binding until 008C:

```text
missing definitionVersion → "1.0.0"
missing/non-record parameters → {}
missing/non-record style → {}
missing/non-record feature metadata → {}
missing/non-integer revision → 0
unknown root/feature fields → dropped
```

008A primitives are not integrated into the parser, so 008A does not silently tighten same-version interpretation.

## 13. 008B runtime boundary

Next branch:

```text
agent/008b-plotjson-migration-registry-runtime
```

Allowed scope:

- immutable document migration step types;
- immutable Definition migration references and step types;
- separate document/Definition registration APIs;
- strict version-increase validation;
- one outgoing edge per source node and scope;
- duplicate, self, decreasing, cycle and branch rejection;
- deterministic linear chain planning independent of registration order;
- explicit plotType rename edges;
- immutable applied-step and report record types;
- public core exports, pure Node tests, runtime docs and immutable handover.

Excluded from 008B:

```text
production migration execution
parsePlotDocument replacement
historical 1.0 normalization integration
production symbol migrations
Registry Definition-version enforcement
Store document replacement
MapLibre import changes
schema bump
007D persisted fields
```

## 14. Migration graph rules

Migration code remains separate from `PlotDefinition.generate()` and Registry aliases.

```text
PlotJsonMigrationRegistry
├── document edges keyed by source version
└── Definition edges keyed by source (plotType, version)
```

Rules:

- exactly zero or one outgoing edge per source node;
- target version must be strictly greater than source version;
- self, duplicate, decreasing, cycle and branch registration reject;
- registration order cannot change a valid plan;
- no arbitrary shortest-path search;
- plotType rename is an explicit Definition edge;
- missing path becomes a structured PlotJSON error.

## 15. Future parser and import boundary

008C integrates the safety/migration foundations into a report-bearing reader while preserving historical `1.0.0` normalizations.

008D replaces current non-atomic import:

```text
store.clear()
→ repeated store.add()
```

with complete preparation and one ordered Store replacement transaction.

Expected input failure must preserve Store, order, selection, History and active interaction state.

## 16. Runtime sequence

```text
008A version / JSON safety / limits / errors — merged
008B migration registry / planner / report records — next
008C report-bearing reader / compatibility / invariants
008D Registry-aware preparation / atomic import
008E runtime closure / compatibility fixtures / synchronization
```

007D groups/locks/visibility/z-order remains blocked through 008D/E.

## 17. Validation gate

Every exact runtime head:

```text
Node 20.19
Node 22
324 current Node tests plus milestone tests
Playground typecheck/build
handover contract
region benchmark
selection-transform benchmark
34 Chromium tests plus milestone tests
zero unresolved review threads
```

Post-merge finalization additionally proves Markdown-only scope.

## 18. Merge discipline

Design, runtime and finalization use separate branches. Runtime remains Draft until exact-head green; every review thread is resolved; immutable handover is written; Ready state does not change head; squash merge uses expected SHA; `main` is verified; post-merge synchronization starts only from latest `main`.

Current exclusions include reflection, non-uniform scale, groups/locks/visibility/z-order runtime, snapping, touch transforms, new symbols, unresolved-feature mode, future-version best effort, downgrade migrations and PlotJSON shortcuts.
