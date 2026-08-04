# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

Canonical feature state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Rendered geometry, samples, local frames, pivots, selection/region/transform overlays and previews are derived. They must not replace authored state or enter PlotJSON.

Core persisted editing state must use schema-owned fields. Groups, locks, visibility and z-order cannot be hidden in metadata.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

Core and geometry cannot depend on MapLibre or DOM. Interaction math and commands remain engine-independent. MapLibre owns browser normalization, map projection and derived UI.

PlotJSON versioning, JSON safety, migration, validation and import preparation belong in `@plotlibre/core`. MapLibre may delegate to core and atomically apply a prepared document, but it cannot own migration logic.

## 3. Current authority

```text
main SHA:           add70f52eb252b1167f7abfb4ecf4b93370bfbdf
workspace:          0.0.22
current schema:     PlotJSON 1.0.0
production migrations: none
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      299
008A expected Node: 324
Chromium baseline:  34
MapLibre Sources:   4
MapLibre Layers:    10
benchmark jobs:     region selection + selection transform
007A:               merged PR #38/#39
007B:               merged PR #40–#44
007B-P:             merged PR #45/#46
007C design/runtime: merged PR #47–#50
008 design:         merged PR #51/#52
008A runtime:       PR #53
current branch:     agent/008a-plotjson-version-json-safety-runtime
next runtime branch: agent/008b-plotjson-migration-registry-runtime
```

PR #51 design squash: `6012868d4c74e64374bfbeb3c032ee47a4a9fb2c`.  
PR #52 design-finalization squash/main: `add70f52eb252b1167f7abfb4ecf4b93370bfbdf`.

Never use old-head evidence for a newer head. Design, runtime and post-merge finalization remain separate scopes.

## 4. Selection and atomic editing

Selection is transient, ordered and Primary-last. It is excluded from PlotJSON and feature revision.

`PlotStore.applyTransaction()` commits one staged batch. `BatchEditCommand` owns exact before/after features, document order and selection. Batch delete, local translation and completed whole-selection rotation/scale each use one atomic command.

Preview, rejection, cancel and no-op must not enter Store or History.

## 5. Merged 007C transform boundary

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

Each effectively changed feature receives exact `revision + 1`. Frame, pivot, angle, factor, handles and preview are transient.

Shared frame:

```text
all selected authored controls
→ validate one local coordinate domain
→ order-independent geographic seed
→ one local projection
→ local authored-control AABB
→ fixed AABB-center pivot
```

Clockwise rotation:

```text
x' = px + cosθ(x-px) + sinθ(y-py)
y' = py - sinθ(x-px) + cosθ(y-py)
```

Positive uniform scale:

```text
k = current local radius / start local radius
x' = px + k(x-px)
y' = py + k(y-py)
0.01 <= k <= 100
```

Reflection, negative/non-uniform scale, skew and snapping remain excluded. Registry generation remains authoritative when absolute parameter caps prevent strict rendered similarity.

## 6. Milestone 008 authority

Binding design documents:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
docs/handover/2026-08-05-milestone-008-design-post-merge-finalization.md
```

008A runtime authority:

```text
packages/core/src/plotjson-version.ts
packages/core/src/plotjson-error.ts
packages/core/src/plotjson-safety.ts
docs/design/plotjson-version-json-safety-runtime.md
docs/handover/2026-08-05-milestone-008a-plotjson-foundations.md
```

008A may add only version, error, JSON-safety, resource-limit and statistics primitives plus tests/exports/docs. It must not replace the parser, register migrations, change Store/Registry/MapLibre behavior or bump the schema.

## 7. Version domains

### Document schema version

`PlotDocument.schemaVersion` owns:

- document structure;
- required/optional schema fields;
- document order and references;
- future groups/locks/visibility/z-order persistence;
- extension containers and document invariants.

### Definition version

`PlotFeature.definitionVersion` owns:

- authored control semantics for one `plotType`;
- parameter names, types, defaults and units;
- incompatible Definition algorithm semantics.

They are independent and migrate in this order:

```text
raw document
→ current document schema
→ current Definition version for every feature
→ Registry preflight
→ atomic Store replacement
```

## 8. Persisted version runtime

Public constants:

```text
PLOTJSON_DOCUMENT_TYPE = PlotLibreDocument
CURRENT_PLOTJSON_SCHEMA_VERSION = 1.0.0
```

Persisted syntax is canonical numeric:

```text
MAJOR.MINOR.PATCH
```

No leading zeros, `v` prefix, prerelease or build metadata. Components are non-negative safe integers. Comparison is numeric tuple comparison.

Parsed versions are frozen. Forged parsed records reject. Malformed-version messages do not echo untrusted payloads.

## 9. JSON-safety runtime

Accepted direct data:

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
Date / Map / Set / RegExp / typed array / class instance
custom prototype
accessor / non-enumerable property / symbol key
sparse array / custom array property
cycle
```

Traversal is iterative and descriptor-based. It cannot invoke getters. Object keys are visited lexicographically. Repeated non-cyclic references are cloned independently.

Own `__proto__`, `constructor` and `prototype` keys must remain data without changing target prototypes. Use descriptor definition, not ordinary assignment, when cloning untrusted keys.

## 10. Resource limits

Current finite defaults:

```text
inputBytes:               16 MiB
maximum depth:            128
total value nodes:        1,000,000
total object keys:        250,000
maximum string/key length: 1,000,000 UTF-16 code units
features:                 100,000
controls per feature:     10,000
total authored controls:  1,000,000
```

These are untrusted-input security ceilings, not product-size recommendations, memory guarantees or latency SLAs.

All overrides must be finite positive safe integers. Zero, negative, fractional, infinite, NaN and unsafe values reject. `stringLength` applies to values and keys. Input bytes use UTF-8.

## 11. Structured errors

`PlotJsonError` extends `PlotLibreError` and may expose scalar context only:

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

Frozen codes:

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

008A directly emits only the applicable version, JSON-value, resource-limit and root-path errors. Later slices reuse the same union.

## 12. Current `1.0.0` compatibility

Actual historical parser behavior remains a compatibility baseline:

```text
missing definitionVersion → "1.0.0"
missing/non-record parameters → {}
missing/non-record style → {}
missing/non-record feature metadata → {}
missing/non-integer revision → 0
unknown root/feature schema fields → dropped
```

008A primitives are deliberately not integrated into `parsePlotDocument()`. Therefore 008A does not silently tighten same-version interpretation.

008C will preserve and report historical normalizations while adding the new safety boundary.

## 13. Future read pipeline

Binding order remains:

```text
input-size guard
→ JSON.parse when string
→ JSON-safety/resource scan
→ minimal type/schemaVersion envelope
→ document migration plan and execution
→ current-schema decode / 1.0 normalization
→ document invariants and duplicate-id check
→ Definition migration for all features
→ final Definition-version equality
→ Registry.canonicalize and Registry.generate every feature
→ immutable report
→ one atomic Store document replacement
```

No old-schema value may be interpreted as the current schema before document migration.

## 14. Migration registry contract for 008B

Migration code remains separate from `PlotDefinition.generate()` and Registry aliases.

```text
PlotJsonMigrationRegistry
├── document steps
└── Definition steps keyed by plotType
```

Binding graph rules:

- one outgoing step per source version and scope;
- strictly increasing versions;
- no self or duplicate edge;
- no cycles or branch ambiguity;
- registration order cannot change a plan;
- no arbitrary shortest-path selection.

A plotType rename is an explicit Definition migration and must appear in the report. Unknown plot types fail closed.

## 15. Migration purity

Every future step must:

- be synchronous in the initial runtime;
- return a new JSON object;
- never mutate input;
- never read clock, random, network, DOM, MapLibre, Store or History;
- produce deterministic output and report;
- preserve information not explicitly transformed;
- pass JSON-safety and resource-limit scans after execution;
- expose no partial result on failure.

Migration code is application-installed trusted code. Documents cannot name executable modules.

## 16. Definition-version enforcement

After future migration:

```text
feature.definitionVersion === registry.get(feature.plotType).version
```

is mandatory.

Older with complete chain migrates. Older without chain, newer version, malformed version and unknown Definition reject before Store mutation. Registry cannot silently render mismatched versions.

## 17. Atomic import

Current `PlotLibre.importDocument()` preflights Registry generation, then calls `store.clear()` and repeated `store.add()`. Duplicate ids can fail after partial mutation.

008D must prepare everything in memory and commit one complete ordered document transaction.

Expected input failure preserves:

```text
Store and order
selection and Primary
History
active draw/region/translation/transform state
```

Success emits one Store batch event, installs exact document order, cancels interactions, clears selection and clears History.

## 18. 008A validation

Required tests:

- canonical and malformed versions;
- numeric-order traps;
- frozen/forged parsed versions;
- bounded error messages;
- all accepted/prohibited JSON value families;
- getter non-invocation;
- prototype-pollution keys;
- cycles and repeated references;
- deterministic key/error order;
- 2,000-level iterative traversal;
- immutable limits/statistics;
- every limit category and exact path;
- UTF-8 input-byte accounting;
- all historical regressions.

Expected exact-head gate:

```text
Node 20.19
Node 22
324 Node tests
Playground typecheck/build
handover contract
region benchmark
selection-transform benchmark
34 Chromium E2E
zero unresolved review threads
```

## 19. Runtime sequence

```text
008A version + JSON safety + limits + errors
008B migration registry + plan + report
008C current reader compatibility + invariants
008D Registry-aware preparation + atomic import
008E docs, CI, immutable handover and post-merge sync
```

008B is next only after 008A merge and post-merge synchronization.

008B excludes parser replacement, production Definition migrations, Registry enforcement, Store replacement, MapLibre import and schema bumps.

## 20. 007D unblock condition

Groups/locks/visibility/z-order cannot enter runtime until 008 foundation is complete.

Future schema requirements:

- feature array order is bottom-to-top z-order;
- lock/visibility are schema-owned core state, not metadata;
- stable group ids and feature references;
- first group model assigns one feature to at most one group;
- deterministic feature/group effective lock and visibility;
- production old-to-new document migration;
- golden compatibility fixtures.

The exact future schema shape belongs to 007D design, not 008 foundation runtime.

## 21. Merge discipline

Design, runtime and finalization use separate branches. Runtime remains Draft until exact-head green; every thread is resolved; immutable handover is written; Ready state does not change head; squash merge uses expected SHA; main is verified; post-merge authority synchronization starts only from latest main.

Current exclusions include reflection, non-uniform scale, groups/locks/visibility/z-order runtime, snapping, touch transforms, new symbols, unresolved-feature mode, future-version best effort, downgrade migrations and PlotJSON shortcuts.
