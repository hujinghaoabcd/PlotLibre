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

PlotJSON parsing, migration, validation and import preparation belong in `@plotlibre/core`. MapLibre may delegate to core and atomically apply a prepared document, but it cannot own migration logic.

## 3. Current authority

```text
main SHA:           fa1648fcd7b263244dabdba31bcdb5b69f74f9a2
workspace:          0.0.22
current schema:     PlotJSON 1.0.0
production migrations: none
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      299
Chromium baseline:  34
MapLibre Sources:   4
MapLibre Layers:    10
benchmark jobs:     region selection + selection transform
007A:               merged PR #38/#39
007B:               merged PR #40–#44
007B-P:             merged PR #45/#46
007C design/runtime: merged PR #47–#50
current branch:     agent/008-plotjson-migrations-design
next runtime branch: agent/008a-plotjson-version-json-safety-runtime
```

PR #49 runtime squash: `2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0`.  
PR #50 post-merge synchronization squash/main: `fa1648fcd7b263244dabdba31bcdb5b69f74f9a2`.

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

## 6. 008 design authority

Binding documents:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
```

This branch is Markdown-only. No parser, type, error, Store, Registry, MapLibre, test, workflow, package or fixture changes belong in the design PR.

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

## 8. Persisted version syntax

Initial migration runtime accepts canonical numeric triples only:

```text
MAJOR.MINOR.PATCH
```

No leading zeros, `v` prefix, prerelease or build metadata. Components are non-negative safe integers. Comparison is numeric tuple comparison.

## 9. Migration registry

Migration code is separate from `PlotDefinition.generate()` and from Registry aliases.

```text
PlotJsonMigrationRegistry
├── document steps
└── Definition steps keyed by plotType
```

Binding graph rules:

- one outgoing step per source version and scope;
- strictly increasing versions;
- no self edge;
- no duplicate edge;
- no cycles;
- no branch ambiguity;
- registration order cannot change a plan;
- no arbitrary shortest-path selection.

A plotType rename is an explicit Definition migration and must appear in the migration report. Unknown plot types fail closed.

## 10. Migration purity

Every step must:

- be synchronous in the initial runtime;
- return a new JSON object;
- never mutate input;
- never read clock, random, network, DOM, MapLibre, Store or History;
- produce deterministic output and report;
- preserve information not explicitly transformed;
- pass JSON-safety and resource-limit scans after execution;
- expose no partial result on failure.

Migration code is application-installed trusted code. Documents cannot name or load executable migration modules.

## 11. Current `1.0.0` compatibility

Actual historical parser behavior is a compatibility baseline:

```text
missing definitionVersion → "1.0.0"
missing/non-record parameters → {}
missing/non-record style → {}
missing/non-record feature metadata → {}
missing/non-integer revision → 0
unknown root/feature schema fields → dropped
```

Milestone 008 runtime keeps current target schema `1.0.0` and reports these normalizations. It cannot silently tighten same-version interpretation.

Non-JSON values, cycles, non-finite numbers and resource-limit violations always reject.

## 12. Read pipeline

Binding order:

```text
input-size guard
→ JSON.parse when string
→ recursive JSON-safety/resource scan
→ minimal type/schemaVersion envelope
→ document migration plan and execution
→ current-schema decode / 1.0 normalization
→ document invariants and duplicate-id check
→ Definition migration plan and execution for all features
→ final Definition-version equality
→ strict current feature decode
→ Registry.canonicalize and Registry.generate every feature
→ immutable report
→ one atomic Store document replacement
```

No old-schema value may be interpreted as the current schema before document migration.

## 13. Definition-version enforcement

After migration:

```text
feature.definitionVersion === registry.get(feature.plotType).version
```

is mandatory.

Older with complete chain migrates. Older without chain, newer version, malformed version and unknown Definition reject before Store mutation. Registry cannot silently render mismatched versions.

## 14. JSON safety and resource limits

Accepted direct data:

```text
null
string
boolean
finite number
array
plain JSON object
```

Rejected:

```text
undefined
NaN / Infinity
BigInt / Symbol / function
Date / Map / Set / typed array / class instance
accessor / symbol key / cycle
```

Reader limits must cover:

```text
inputBytes
depth
totalNodes
objectKeys
stringLength
features
controlPointsPerFeature
totalControlPoints
```

Concrete finite defaults are measured and published in runtime, not invented in design.

## 15. Error surface

Add a dedicated `PlotJsonError` family with stable code and optional path/feature/version context.

Binding codes:

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

Errors must not dump complete documents or sensitive metadata.

## 16. Migration report

A report-bearing read API records:

```text
source/target schema versions
document steps
Definition steps
plotType renames
1.0 normalization records
stable warnings with JSON paths
```

`parsePlotDocument()` remains a compatibility wrapper returning only the current document.

## 17. Atomic import

Current `PlotLibre.importDocument()` preflights Registry generation, then calls `store.clear()` and repeated `store.add()`. Duplicate ids can fail after partial mutation.

Milestone 008 runtime must prepare everything in memory and commit one complete ordered document transaction.

Expected input failure preserves exactly:

```text
Store and order
selection and Primary
History
active draw/region/translation/transform state
```

Success emits one Store batch event, installs exact document order, cancels interactions, clears selection and clears History.

## 18. Compatibility fixtures

Required fixture families:

```text
current exact/current normalization
legacy/future/invalid
migration graph and output
Definition migration and rename
duplicate ids/unknown Definition
resource-limit boundaries
Registry failure
atomic import rollback
exact successful order
```

Every migrator proves deterministic output, input immutability, target-version correctness and repeat-read idempotence.

## 19. 008 runtime slices

```text
008A version + JSON safety + limits + errors
008B migration registry + plan + report
008C current reader compatibility + invariants
008D Registry-aware preparation + atomic import
008E docs, CI, immutable handover and post-merge sync
```

The next branch is strictly 008A. It must not implement migration graph execution, parser replacement or MapLibre import changes.

## 20. 007D unblock condition

Groups/locks/visibility/z-order cannot enter runtime until 008 foundation is merged.

Future schema requirements:

- feature array order is bottom-to-top z-order;
- lock/visibility are schema-owned core state, not metadata;
- stable group ids and feature references;
- first group model assigns one feature to at most one group;
- deterministic feature/group effective lock and visibility;
- production old-to-new document migration;
- golden compatibility fixtures.

The exact future schema shape belongs to 007D design, not 008 runtime foundation.

## 21. Validation gate

Every exact head:

```text
Node 20.19
Node 22
299 current Node tests plus milestone tests
Playground typecheck/build
handover contract
region benchmark
selection-transform benchmark
34 current Chromium tests plus milestone tests
zero unresolved review threads
```

Design PR must additionally prove Markdown-only scope.

## 22. Clean-room references

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
code reuse: none
```

## 23. Merge discipline

Design, runtime and finalization use separate branches. Runtime remains Draft until exact-head green; every thread is resolved; immutable handover is written; Ready state does not change head; squash merge uses expected SHA; main is verified; post-merge authority synchronization starts only from latest main.

Current exclusions include reflection, non-uniform scale, groups/locks/visibility/z-order runtime, snapping, touch transforms, new symbols, unresolved-feature mode, future-version best effort, downgrade migrations and PlotJSON shortcuts.
