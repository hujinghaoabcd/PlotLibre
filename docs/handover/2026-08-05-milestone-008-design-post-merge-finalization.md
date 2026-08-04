# PlotLibre Milestone 008 Design Post-Merge Finalization

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
Design PR：`#51 Freeze PlotJSON migration and atomic import design`  
Validated design head：`908ab22401d71dfefe0a9d28add67e28723c13c0`  
Design CI：run `30947578825` / `#510`  
Squash/main SHA：`6012868d4c74e64374bfbeb3c032ee47a4a9fb2c`  
Finalization branch：`agent/008-plotjson-design-post-merge-finalization`

## Purpose

PR #51 merged the engine-independent PlotJSON versioning, migration, compatibility, validation and atomic-import design. This document records actual merge evidence and advances repository authority from “008 design active” to “008 design merged / 008A runtime next.”

This finalization is documentation-only. No parser, Registry, Store, MapLibre, package, test, fixture, workflow or schema behavior changes are allowed.

## Merged baseline

```text
main SHA:             6012868d4c74e64374bfbeb3c032ee47a4a9fb2c
workspace:            0.0.22
current PlotJSON:     1.0.0
production migrations: none
public symbols:       19
Node tests:           299
Chromium tests:       34
MapLibre Sources:     4
MapLibre Layers:      10
```

## Exact merge evidence

```text
validated head:       908ab22401d71dfefe0a9d28add67e28723c13c0
CI:                   30947578825 / #510
Node 20.19:           success
Node 22:              success
Node tests:           299 passed
Playground typecheck: success
Playground build:     success
handover check:       success
Chromium:             34 passed in 2.8 minutes
review threads:       0 unresolved
changed files:        8 Markdown files only
merge method:         squash
squash/main SHA:      6012868d4c74e64374bfbeb3c032ee47a4a9fb2c
```

Exact-head benchmark artifacts:

```text
region-selection-benchmark-30947578825
artifact id: 8907720007
sha256: dbe7a0539083035d7b55e583e33b436b6b5872dc226822bfd4fbb6007172d2b8

selection-transform-benchmark-30947578825
artifact id: 8907717329
sha256: 92daaf71dbab8045d693be0df3fa0dd8923b8d36eb225d5e9171858cce9a090b
```

The browser job’s long wall-clock time came from an unusually slow Ubuntu font-package mirror during Playwright dependency installation. The actual historical Chromium suite completed successfully.

## Merged design authority

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
```

Binding design decisions:

- document `schemaVersion` and feature `definitionVersion` are independent;
- persisted versions are canonical numeric triples;
- document migration precedes Definition migration;
- migration code belongs to a separate core registry;
- one deterministic outgoing step per source version and scope;
- cycles, branches, silent aliases and future-version guessing reject;
- migrations are pure, synchronous, deterministic and input-immutable;
- JSON-safety and resource limits apply before and after every step;
- historical PlotJSON `1.0.0` normalization remains compatible and reportable;
- final feature Definition version must match the registered Definition;
- every feature must canonicalize and generate before commit;
- expected import failures preserve all application state;
- successful import replaces the Store atomically and emits one batch event;
- production schema remains `1.0.0` during migration-foundation runtime;
- 007D groups/locks/visibility/z-order remains blocked through 008D/E.

## Runtime continuation

The next branch must start from the synchronized main produced after this finalization:

```text
agent/008a-plotjson-version-json-safety-runtime
```

008A scope is intentionally narrow:

1. current PlotJSON version constants;
2. canonical version parser and numeric comparator;
3. PlotJSON error base and stable error-code union;
4. JSON-safe iterative scan and deep clone;
5. path-aware resource-limit validation;
6. finite measured/default limit values;
7. pure Node tests and public core exports;
8. immutable 008A handover.

008A exclusions:

```text
migration registration or execution
migration report implementation
parsePlotDocument replacement
Definition-version migration
Registry behavior changes
Store document replacement
MapLibre import changes
schema version bump
007D persisted fields
```

## Runtime sequence

```text
008A version / JSON safety / limits / errors
008B migration registry / planner / report
008C current reader compatibility / invariants
008D Registry-aware preparation / atomic import
008E runtime documentation / handover / synchronization
```

## Known risks retained for runtime

- current parser silently normalizes several malformed optional fields;
- unknown `1.0.0` structural fields are dropped;
- direct object input can contain cycles, prototypes, accessors and non-JSON values;
- Registry currently ignores Definition-version mismatch;
- current import can partially replace Store after `clear()` when duplicate ids fail;
- current Store transaction API does not directly replace a document with reused ids;
- resource-limit defaults need transparent rationale and boundary tests;
- migration reports must not copy sensitive metadata;
- arbitrary DAGs, downgrade, future-version best effort and unresolved-feature preservation remain excluded.

## Finalization merge gate

```text
Markdown-only scope
Node 20.19 / 22
299 Node tests
Playground typecheck/build
handover contract
region benchmark
selection-transform benchmark
34 Chromium tests
0 unresolved review threads
```
