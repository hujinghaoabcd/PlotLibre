# PlotLibre Development Handover — Milestone 008A Runtime

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
完整交接：`docs/handover/2026-08-05-milestone-008a-plotjson-foundations.md`

## Current state

```text
main:               add70f52eb252b1167f7abfb4ecf4b93370bfbdf
workspace:          0.0.22
PlotJSON schema:    1.0.0
production migrations: none
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
historical Node:    299
008A expected Node: 324
Chromium tests:     34
MapLibre Sources:   4
MapLibre Layers:    10
008 design:         merged PR #51/#52
008A runtime:       PR #53
current branch:     agent/008a-plotjson-version-json-safety-runtime
next branch:        agent/008b-plotjson-migration-registry-runtime
```

## Validation

Final exact-head evidence is pending after documentation closure.

Required gate:

```text
Node 20.19 / 22
324 Node tests
Playground typecheck/build
handover check
region benchmark + artifact
selection-transform benchmark + artifact
34 Chromium tests
0 unresolved review threads
```

Earlier code-only exact heads have already passed Node 20.19/22, all 324 tests, Playground build, handover and both existing benchmarks. They are not final merge evidence after documentation commits.

## Completed in this milestone

- exported current PlotJSON document type and schema-version constants;
- added canonical numeric persisted-version parsing;
- added numeric version comparison and canonical predicate;
- rejected malformed, prefixed, prerelease, build and unsafe versions;
- froze parsed version records and rejected forged records;
- bounded malformed-version messages without echoing untrusted payloads;
- added the complete structured PlotJSON error-code union;
- added scalar/path-aware `PlotJsonError` context without retaining documents;
- added finite immutable resource-limit defaults and validated overrides;
- added UTF-8 input-byte measurement;
- added iterative descriptor-safe JSON validation and deep cloning;
- rejected non-finite/non-JSON values, custom prototypes, accessors, hidden/symbol properties, sparse/custom arrays and cycles;
- accepted plain and null-prototype objects;
- cloned repeated non-cyclic references independently;
- made own `__proto__` and `constructor` keys safe data properties;
- made object traversal and first-error paths deterministic;
- counted string values and object keys against the string limit;
- exposed immutable node/key/depth/string/feature/control statistics;
- proved 2,000-level traversal without recursive stack dependence;
- kept current parser, Registry, Store, MapLibre and schema behavior unchanged;
- added public runtime documentation and immutable handover.

Authority:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/design/plotjson-version-json-safety-runtime.md
docs/handover/2026-08-05-milestone-008a-plotjson-foundations.md
```

## Next tasks

1. run final exact-head CI after all documentation commits;
2. confirm 324 Node tests and 34 Chromium tests;
3. record exact head, CI and artifact ids in PR #53;
4. verify zero unresolved review threads;
5. mark PR #53 Ready without changing head;
6. squash merge with expected head SHA;
7. verify new `main` and synchronize 008A merge authority on a documentation-only branch;
8. create `agent/008b-plotjson-migration-registry-runtime`;
9. implement only migration step types, registry graph validation, deterministic linear planning and immutable report record types;
10. keep parser replacement, production migrations, Registry enforcement, Store and MapLibre changes out of 008B.

## Risks and decisions

- default limits are finite security ceilings, not recommended document sizes or performance SLAs;
- large own-key sets must still be enumerated by the JavaScript engine before library rejection;
- diagnostic paths can include application keys and must not be treated as secret containers;
- `scanPlotJsonValue()` currently allocates a clone to guarantee identical safety behavior;
- current `parsePlotDocument()` remains permissive and does not use 008A primitives until 008C;
- Registry still ignores Definition-version mismatch;
- current import can partially replace Store under duplicate ids after `clear()`;
- migration graph, report, reader and atomic import remain 008B–008D work;
- arbitrary migration DAGs, downgrade, future-version best effort and unresolved-feature mode remain excluded;
- 007D groups/locks/visibility/z-order remains blocked through 008D/E.
