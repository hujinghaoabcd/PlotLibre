# PlotLibre Handover — Milestone 008B Post-Merge Finalization

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
Runtime PR：#55  
Runtime branch：`agent/008b-plotjson-migration-registry-runtime`  
Runtime validated head：`c86bcc02d2b85bb1495d8a3e659d2e3d5ff18335`  
Squash / synchronized main：`409786f6a55aeab6e810651410954d78123e32d3`

## 1. Final merged state

```text
workspace:             0.0.22
PlotJSON schema:       1.0.0
production migrations: none
public symbols:        19 (14 Arrow + 1 Line + 4 Area)
Node tests:            348
Chromium tests:        34
MapLibre Sources:      4
MapLibre Layers:       10
008A:                  merged PR #53/#54
008B:                  merged PR #55
next runtime:          008C safe reader and migration execution
next branch:           agent/008c-plotjson-reader-runtime
```

008B was squash-merged only after exact-head validation and zero unresolved review threads. The returned squash SHA equals the current repository `main`.

## 2. Exact-head validation

```text
head:                  c86bcc02d2b85bb1495d8a3e659d2e3d5ff18335
CI run:                30957964547 / #541
Node 20.19:            passed
Node 22:               passed
Node tests:            348 passed
Playground typecheck:  passed
Playground build:      passed
handover check:        passed
region benchmark:      passed
transform benchmark:   passed
Chromium:              34 passed (2.5m)
review threads:        0
changed files:         15 expected files
merge method:          squash with expected head
squash/main SHA:       409786f6a55aeab6e810651410954d78123e32d3
```

Artifacts:

```text
region-selection-benchmark: 8911803937
region digest: sha256:7dad53a37778ee0ab595ef2b6f469a07475750d2fde3d034232f6cfbc5003f96

selection-transform-benchmark: 8911810112
transform digest: sha256:de27a30f26af73c66a7e37fe3f59cc23b8a133602c381e7c45c15560e8f612cf
```

## 3. Merged runtime authority

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

Documentation:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migration-registry-runtime.md
docs/handover/2026-08-05-milestone-008b-migration-planning.md
```

## 4. Delivered contracts

### 4.1 Migration descriptors

008B introduced engine-independent trusted descriptors for document and Definition history.

Document source node:

```text
schemaVersion
```

Definition source node:

```text
(plotType, definitionVersion)
```

An explicit Definition rename is represented as a real edge, for example:

```text
arrow.legacy@1.0.0
→ arrow.bridge@1.1.0
→ arrow.current@2.0.0
```

A rename is not a `PlotRegistry` alias and cannot be inferred by the planner.

### 4.2 Registry invariants

- canonical numeric persisted versions only;
- target version strictly greater than source version;
- non-empty Definition plot types;
- one outgoing edge per source node;
- exact duplicate and branch ambiguity reject;
- self/decreasing edge rejects;
- normalized descriptors and nested references are copied and frozen;
- invalid insertion is rolled back;
- registration order cannot alter a valid plan;
- migration functions are stored but never invoked by registration or planning.

Developer configuration failures use `PlotJsonMigrationRegistryError`:

```text
PLOTJSON_MIGRATION_REGISTRATION_INVALID
PLOTJSON_MIGRATION_SOURCE_DUPLICATE
PLOTJSON_MIGRATION_GRAPH_CYCLE
```

### 4.3 Deterministic planner

`planDocument()` and `planDefinition()`:

- validate source and target before graph lookup;
- return a shared frozen empty plan for exact equality;
- reject downgrade or newer source;
- follow the unique outgoing edge only;
- reject missing edge and target overshoot;
- require exact target version and exact target plot type;
- return a frozen ordered chain;
- never execute migration functions;
- never choose nearest, shortest or best-effort paths.

A 256-edge test proves iterative exact-order planning.

### 4.4 Immutable report records

008B introduced applied document steps, applied Definition steps, per-feature migration records, normalization facts, warnings and `PlotJsonMigrationReport`.

`createPlotJsonMigrationReport()`:

- copies all arrays and records;
- copies nested Definition references;
- deeply freezes the structural envelope;
- omits absent optional scalar fields;
- stores no complete document, metadata object or executable migration function.

## 5. Explicit non-effects

008B did not change:

```text
packages/core/src/plotjson.ts
packages/core/src/registry.ts
packages/core/src/store.ts
packages/maplibre/**
apps/playground runtime
.github/workflows/**
PlotJSON schema or serializer output
```

It does not execute migrations. It does not expose `readPlotDocument()`. It does not register a production document or Definition migration. It does not enforce Definition-version equality in Registry generation. It does not mutate Store or MapLibre.

The production document remains `PlotLibreDocument / 1.0.0`.

## 6. Current known gaps

- `parsePlotDocument()` still performs historical exact-1.0.0 parsing and silent normalization;
- no report-bearing reader is connected;
- migration functions are not executed or output-scanned;
- document-wide duplicate feature ids are not yet rejected by the parser;
- registered Definition-version equality is not yet enforced during reading;
- current import still uses `store.clear()` followed by repeated `store.add()` and can partially replace state after a duplicate-id failure;
- no production migration is registered;
- groups, locks, visibility and z-order remain blocked.

## 7. 008C frozen boundary

Create `agent/008c-plotjson-reader-runtime` only after this Markdown-only finalization is squash-merged and `main` is re-verified.

008C owns:

1. UTF-8 size guard for string input;
2. JSON syntax parsing with structured error;
3. direct-object descriptor-safe cloning and resource scan;
4. minimal document type/schema envelope;
5. document migration planning and execution over cloned JSON;
6. JSON safety/resource scan after every migration step;
7. current `1.0.0` decoding while preserving historical compatibility;
8. normalization and warning report facts;
9. document-wide invariants and duplicate feature-id rejection;
10. Definition migration planning/execution and final version equality;
11. immutable `ReadPlotDocumentResult` and migration report;
12. `readPlotDocument()` plus compatibility `parsePlotDocument()`;
13. current, historical, invalid and future fixtures;
14. deterministic repeat-read/idempotence tests.

008C must not mutate Store, selection, History, interaction state or MapLibre. Atomic import remains 008D.

## 8. Required 008C failure behavior

Any expected input or migration failure must expose no partial result and must not mutate caller input.

Each migration step must:

```text
receive cloned JSON object
→ run trusted synchronous function
→ return a new JSON object
→ pass JSON-safety/resource scan
→ pass expected output-envelope checks
→ append report fact only after success
```

Migration code cannot read clock, random, network, DOM, MapLibre, Store or History. Documents cannot name executable modules.

## 9. Merge discipline for this finalization

This branch may change Markdown files only. Required closure:

1. synchronize README, AGENTS, architecture, PlotJSON spec, roadmap and LATEST;
2. compare against `409786f6a55aeab6e810651410954d78123e32d3` and verify Markdown-only scope;
3. open Draft PR;
4. run exact-head Node 20.19/22, 348 Node tests, Playground build, handover, both benchmarks and 34 Chromium tests;
5. verify zero review threads;
6. mark Ready without changing head;
7. squash merge with expected head;
8. verify the new `main`;
9. delete merged branches when supported;
10. create 008C only from synchronized main.
