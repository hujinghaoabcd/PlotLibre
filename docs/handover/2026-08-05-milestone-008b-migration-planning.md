# PlotLibre Handover — Milestone 008B Migration Planning

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
分支：`agent/008b-plotjson-migration-registry-runtime`  
PR：#55  
基线 main：`c77c5c50ea5976f7afd40f0e48bc712515a99cd5`

## 1. Milestone goal

008B adds deterministic, engine-independent PlotJSON migration graph registration and planning without changing document parsing, migration execution, Definition enforcement, Store mutation or MapLibre import.

The milestone converts the frozen 008 design into public core primitives that later readers can reuse.

## 2. Runtime files

```text
packages/core/src/plotjson-migration-types.ts
packages/core/src/plotjson-migration-registry.ts
packages/core/src/plotjson-migration-report.ts
packages/core/src/index.ts
```

Tests:

```text
tests/plotjson-migration-registry.test.mjs
tests/plotjson-migration-registry-hardening.test.mjs
tests/plotjson-migration-report.test.mjs
```

Runtime documentation:

```text
docs/design/plotjson-migration-registry-runtime.md
```

## 3. Delivered public contracts

### Migration descriptors

```ts
PlotJsonObject
PlotJsonMigrationScope
PlotJsonMigrationContext
PlotJsonMigrationFunction
PlotJsonDocumentMigration
PlotJsonDefinitionReference
PlotJsonDefinitionMigration
PlotJsonPlannedDocumentStep
PlotJsonPlannedDefinitionStep
PlotJsonPlannedStep
```

### Registry

```ts
PlotJsonMigrationRegistry
PlotJsonMigrationRegistryError
PlotJsonMigrationRegistryErrorCode
PlotJsonMigrationRegistryErrorContext
```

### Report records

```ts
PlotJsonAppliedDocumentStep
PlotJsonAppliedDefinitionStep
PlotJsonAppliedStep
PlotJsonFeatureMigrationRecord
PlotJsonNormalizationCode
PlotJsonNormalizationRecord
PlotJsonWarningCode
PlotJsonWarning
PlotJsonMigrationReport
createPlotJsonMigrationReport(...)
```

## 4. Graph model

Document source node:

```text
schemaVersion
```

Definition source node:

```text
(plotType, definitionVersion)
```

A Definition rename is represented explicitly by different source and target pairs.

Examples:

```text
Document:
1.0.0 → 1.1.0 → 2.0.0

Definition:
arrow.legacy@1.0.0
→ arrow.bridge@1.1.0
→ arrow.current@2.0.0
```

## 5. Registration guarantees

- canonical numeric versions only;
- every edge strictly increases version;
- non-empty Definition plot types;
- one outgoing edge per source node;
- exact duplicate and branch both reject;
- normalized descriptor copied and frozen;
- Definition references copied and frozen;
- registration failure rolls back the attempted insertion;
- migration function reference retained but never invoked by 008B;
- graph validation is independent of insertion order.

Developer configuration errors use:

```text
PLOTJSON_MIGRATION_REGISTRATION_INVALID
PLOTJSON_MIGRATION_SOURCE_DUPLICATE
PLOTJSON_MIGRATION_GRAPH_CYCLE
```

## 6. Planner guarantees

`planDocument()` and `planDefinition()`:

- parse and validate both endpoints;
- return one shared frozen empty plan for an exact source/target;
- reject downgrade/newer source;
- follow only the unique outgoing edge;
- reject missing paths;
- reject target overshoot;
- require exact target version and exact target `plotType`;
- return a frozen ordered chain;
- never execute migration code;
- do not depend on registration order.

Input/path failures reuse the stable PlotJSON error codes:

```text
PLOTJSON_SCHEMA_VERSION_INVALID
PLOTJSON_SCHEMA_VERSION_UNSUPPORTED
PLOTJSON_MIGRATION_PATH_MISSING
PLOTJSON_DEFINITION_NOT_FOUND
PLOTJSON_DEFINITION_VERSION_INVALID
PLOTJSON_DEFINITION_VERSION_UNSUPPORTED
PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING
```

## 7. Report guarantees

`createPlotJsonMigrationReport()` creates a detached deeply frozen structural record:

- source and target document versions;
- ordered applied document steps;
- ordered per-feature Definition records;
- explicit Definition rename facts;
- normalization facts;
- warnings.

It stores no complete document, metadata object or executable migration function.

## 8. Validation status

Initial code head:

```text
291d08cf517569b1598f40e71487c1fc3c220657
```

Initial CI:

```text
run:                  30957226567 / #531
Node 20.19:           success
Node 22:              success
Node tests:           343 passed
Playground typecheck: success
Playground build:     success
handover check:       success
region benchmark:     success
transform benchmark:  success
browser:              running when hardening/docs continued
```

The initial head is not final merge evidence because hardening tests and documentation were added afterward.

Final exact-head evidence must be written into PR #55 after all files stop changing.

## 9. Test coverage

New tests include:

- deterministic document planning;
- reverse registration order equivalence;
- frozen empty plans;
- missing, overshooting and downgrade errors;
- duplicate source and branch rejection;
- self/decreasing/malformed registration rejection;
- same-type Definition chains;
- explicit multi-step plotType rename;
- wrong-target-type failure;
- sorted snapshots;
- registration input mutation isolation;
- migration function non-invocation;
- 256-edge iterative planning;
- fresh frozen snapshot arrays with stable steps;
- invalid target validation before graph consultation;
- report deep copy/freeze;
- optional report field omission;
- empty report-array detachment.

After the first implementation, Node total increased from 324 to 343. The hardening file adds five further tests, so the expected final total is 348 before any later test additions.

## 10. Scope verification

008B must not modify:

```text
packages/core/src/plotjson.ts
packages/core/src/registry.ts
packages/core/src/store.ts
packages/maplibre/**
apps/playground runtime
.github/workflows/**
PlotJSON schema or serializer output
```

No production migration is registered. Schema remains `1.0.0`.

## 11. Known decisions

- Migration histories are linear per source node, not arbitrary DAGs.
- Branch ambiguity is rejected rather than resolved heuristically.
- Definition rename edges must advance version; same-version rename is not supported.
- Registry configuration errors are developer-facing `PlotLibreError` subclasses, while untrusted document/path failures remain `PlotJsonError`.
- Graph validation is explicit even though strict version increase already prevents normal cycles.
- Snapshot getters sort on demand and return fresh arrays containing stable frozen step records.
- Registration validation is O(E) per insertion; expected migration histories are small.
- Planning is iterative O(L), proven with a 256-step chain.
- No timing or memory SLA is claimed.

## 12. Risks

- A large application-installed migration registry has quadratic total registration validation cost; this is acceptable for the expected small historical graph and is not an untrusted-document path.
- Migration functions are trusted references and cannot be deeply frozen as executable behavior; identity is intentionally preserved.
- 008B does not validate migration output because it never executes migrations.
- Report record construction is a trusted structural API; 008C owns fact generation from actual execution.
- A same-version plotType rename cannot be represented because every edge must strictly increase version. This is intentional and avoids zero-progress chains.

## 13. Remaining closure steps

1. synchronize README, AGENTS, architecture, roadmap and LATEST;
2. stop changing the branch;
3. run exact-head Node 20.19/22;
4. confirm final Node test count;
5. confirm Playground typecheck/build and handover;
6. confirm both benchmark artifacts;
7. confirm 34 Chromium tests;
8. verify zero unresolved review threads;
9. update PR #55 with exact head and evidence;
10. mark Ready without changing head;
11. squash merge with expected head;
12. verify new main;
13. create documentation-only post-merge authority synchronization;
14. create `agent/008c-plotjson-reader-runtime` only from synchronized main.

## 14. Next milestone — 008C

008C owns the first actual read/execution pipeline:

```text
input size guard
→ JSON parse for string
→ JSON safety/resource scan
→ minimal envelope
→ document plan + execution
→ output scan after every step
→ current 1.0 decode and historical normalization records
→ document invariants / duplicate ids
→ Definition plan + execution
→ final Definition-version equality
→ immutable report
```

Expected API:

```ts
readPlotDocument(...): ReadPlotDocumentResult
parsePlotDocument(...): PlotDocument
```

The compatibility wrapper must preserve existing same-version `1.0.0` behavior while making normalization visible through the report-bearing API.

008C still must not mutate Store or MapLibre. Atomic import remains 008D.
