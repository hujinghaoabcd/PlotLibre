# PlotLibre Milestone 008 PlotJSON Migration Design Handover

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
基线 `main`：`fa1648fcd7b263244dabdba31bcdb5b69f74f9a2`  
分支：`agent/008-plotjson-migrations-design`  
范围：PlotJSON versioning、migration、validation、atomic import 设计冻结  
运行时代码：本分支禁止

## Current state

```text
workspace:          0.0.22
current schema:     PlotJSON 1.0.0
production migrations: none
public symbols:     19
Node baseline:      299
Chromium baseline:  34
MapLibre Sources:   4
MapLibre Layers:    10
007C runtime/docs:  merged through PR #49/#50
current branch:     agent/008-plotjson-migrations-design
```

## Completed in this milestone

Milestone 008 design freezes:

- separate document `schemaVersion` and feature `definitionVersion` domains;
- canonical numeric `MAJOR.MINOR.PATCH` persisted-version syntax;
- deterministic linear document and Definition migration chains;
- a separate engine-independent migration registry;
- explicit plotType rename migrations instead of silent aliases;
- pure synchronous migration functions;
- JSON-safety and resource-limit scanning before and after migration;
- minimal envelope decode before old-schema migration;
- document migration before feature-definition migration;
- final Definition-version equality enforcement;
- complete Registry canonicalize/generate preflight;
- immutable migration reports and historical normalization records;
- dedicated PlotJSON error codes and JSON paths;
- current `1.0.0` parser behavior as a documented compatibility baseline;
- complete fixture and compatibility matrices;
- one atomic Store document replacement;
- exact no-mutation failure behavior;
- the future persistence boundary that must exist before 007D groups/locks/visibility/z-order.

Authority documents:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
```

## Repository findings

### Current parser

`packages/core/src/plotjson.ts`:

- accepts only `PlotLibreDocument` / `1.0.0`;
- combines syntax parsing, structural validation and default normalization;
- drops unknown schema fields;
- defaults missing `definitionVersion` to `1.0.0`;
- defaults invalid/missing parameters, style and feature metadata to `{}`;
- defaults invalid/missing revision to `0`;
- has no migration report, migration registry or resource-limit surface;
- does not check document-wide duplicate feature ids;
- does not enforce registered Definition-version equality.

### Current Registry

`PlotRegistry` resolves by `plotType`, canonicalizes, validates and generates, but does not compare `feature.definitionVersion` with `definition.version`.

### Current import path

`PlotLibre.importDocument()`:

```text
parse
→ canonicalize all
→ generate all
→ cancel/clear interaction state
→ store.clear()
→ store.add() for each feature
→ history.clear()
```

Registry failure occurs before Store mutation, which is useful. However duplicate ids can fail during repeated `add()` after the old Store has already been cleared and after part of the new document has been committed.

Milestone 008 runtime must replace this path with complete preparation plus one atomic document transaction.

### Existing transaction foundation

`PlotStore.applyTransaction()` already stages and validates one batch and emits one event, but its current add/remove disjointness makes complete replacement with reused ids awkward. Runtime must either add a dedicated `replaceDocument()` primitive or a transaction mode that stages a complete ordered Map.

## Binding version decisions

### Document version

`schemaVersion` owns document structure, ordering, references and future core persisted editing state.

### Definition version

`definitionVersion` owns authored control/parameter semantics for one `plotType`.

### Required order

```text
raw JSON
→ document schema migration
→ current document decode
→ Definition migration per feature
→ final Definition-version equality
→ Registry preflight
→ atomic Store replacement
```

No reader may render a feature under a registered Definition version different from the final feature `definitionVersion`.

## Current `1.0.0` compatibility boundary

The runtime foundation keeps current target schema `1.0.0`.

Same-version inputs historically accepted by the parser remain accepted and are normalized with report records:

```text
missing definitionVersion → 1.0.0
missing/non-record parameters → {}
missing/non-record style → {}
missing/non-record feature metadata → {}
missing/non-integer revision → 0
unknown structural fields → dropped
```

This policy is not extended automatically to future schemas. Strict new fields require a new schema version and migration.

## Migration registry contract

```text
document scope
Definition scope keyed by plotType
one outgoing step per source version
strictly increasing versions
no cycles
no branch ambiguity
synchronous pure functions
new JSON output object per step
resource rescan after every step
```

Registration order cannot alter the migration plan.

## Error surface

Frozen categories:

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

Errors may expose path, feature id, plotType, source/target versions and cause without copying complete documents or sensitive metadata.

## Atomic import contract

Expected input failures must leave all application state unchanged:

```text
Store and order
selection and Primary
History
active draw/region/translation/transform modes
```

Successful import:

```text
one complete staged Store replacement
→ one batch event
→ exact document order
→ interaction modes idle
→ selection empty
→ History empty
```

Repeated `clear()` and `add()` calls are prohibited.

## Runtime plan

### 008A — primitives

- canonical version parser/comparator;
- JSON-safe deep clone and scan;
- finite resource limits;
- PlotJsonError family;
- current-version constants.

### 008B — migration registry

- document/Definition step registration;
- chain planning and graph validation;
- immutable migration report;
- deterministic test-only migrators.

### 008C — reader compatibility

- `readPlotDocument()` report-bearing API;
- `parsePlotDocument()` compatibility wrapper;
- current `1.0.0` normalization records;
- duplicate-id and Definition-version enforcement;
- fixture tree and compatibility tests.

### 008D — atomic import

- Registry-aware preparation;
- dedicated Store document replacement;
- PlotLibre integration;
- failure rollback/no-mutation tests;
- browser import regression.

### 008E — runtime closure

- public docs and examples;
- exact-head CI;
- immutable handover;
- post-merge synchronization.

Runtime slices should remain separate reviewable PRs rather than one large implementation.

## 007D unblock boundary

008 runtime keeps production schema `1.0.0` while establishing infrastructure. 007D later introduces a real schema version and production migration.

Before groups/locks/visibility/z-order runtime:

- feature array order must be frozen as bottom-to-top z-order;
- core lock/visibility state cannot live in metadata;
- group ids and feature references must be stable and validated;
- one feature belongs to at most one first-generation group;
- group/feature effective lock and visibility rules must be deterministic;
- a production old-to-new document migration and golden fixtures must exist.

The exact future JSON shape belongs to 007D design, not 008 runtime foundation.

## Validation plan

Required runtime fixture families:

```text
current exact
current normalization
legacy
future
invalid
limits
migration graph
Definition migration
atomic import
```

Every migrator must prove:

- deterministic output;
- input immutability;
- JSON-safe output;
- exact target version;
- repeat-read idempotence;
- no partial state mutation.

Compatibility rows are frozen in:

```text
docs/design/plotjson-compatibility-matrix.md
```

## Next tasks

1. verify this design branch changes Markdown only;
2. run full historical CI and both observational benchmarks;
3. resolve every review thread;
4. write exact-head evidence into the design PR;
5. mark Ready and squash merge with expected head;
6. verify `main` and perform a documentation-only post-merge authority synchronization if required;
7. create `agent/008a-plotjson-version-json-safety-runtime` from synchronized main;
8. implement only version/JSON-safety/error/resource primitives in 008A;
9. keep migration registry, reader and import changes out of 008A;
10. retain current production schema `1.0.0` until a later explicit schema design.

## Risks and decisions

- current `1.0.0` parser is more permissive than its TypeScript types imply;
- tightening same-version normalization without migration would break compatibility;
- unknown fields are currently dropped and cannot provide forward preservation;
- direct object input needs deeper security validation than JSON string input;
- Registry currently renders mismatched Definition versions;
- current import is not atomic under duplicate ids;
- resource-limit default numbers require runtime measurement and are not invented here;
- migration reports must not leak document metadata;
- arbitrary migration DAGs and future-version best effort are deliberately excluded;
- 007D remains blocked until 008 runtime is complete.
