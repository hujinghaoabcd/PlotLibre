# PlotLibre Development Handover — Milestone 008 Design Merged

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
完整交接：`docs/handover/2026-08-05-milestone-008-design-post-merge-finalization.md`

## Current state

```text
main:               6012868d4c74e64374bfbeb3c032ee47a4a9fb2c
workspace:          0.0.22
PlotJSON schema:    1.0.0
production migrations: none
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         299
Chromium tests:     34
MapLibre Sources:   4
MapLibre Layers:    10
007C:               merged PR #47–#50
008 design:         merged PR #51
current branch:     agent/008-plotjson-design-post-merge-finalization
next branch:        agent/008a-plotjson-version-json-safety-runtime
```

## Validation

```text
PR:                    #51
validated head:        908ab22401d71dfefe0a9d28add67e28723c13c0
CI:                    30947578825 / #510
Node 20.19 / 22:       success
Node tests:            299 passed
Playground typecheck:  success
Playground build:      success
handover check:        success
Chromium tests:        34 passed
review threads:        0 unresolved
changed files:         8 Markdown files only
merge method:          squash
squash/main SHA:       6012868d4c74e64374bfbeb3c032ee47a4a9fb2c
```

Exact-head artifacts:

```text
region benchmark:     8907720007
transform benchmark:  8907717329
```

## Completed in this milestone

- separated document schema and Definition version domains;
- froze canonical numeric persisted-version syntax;
- defined a separate deterministic core migration registry;
- prohibited cycles, branch ambiguity, silent aliases and future-version guessing;
- froze pure, synchronous and input-immutable migration behavior;
- defined JSON-safety and resource-limit scanning;
- recorded historical PlotJSON `1.0.0` normalization as compatibility behavior;
- froze migration report and structured error surfaces;
- defined document migration before Definition migration and Registry preflight;
- identified duplicate-id, Definition-version and partial-import defects;
- required one all-or-nothing Store document replacement;
- added compatibility, failure-state and fixture matrices;
- split runtime into reviewable 008A–008E phases;
- retained production schema `1.0.0` during migration-foundation runtime;
- kept 007D groups/locks/visibility/z-order blocked until 008D/E.

Authority:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
docs/handover/2026-08-05-milestone-008-design-post-merge-finalization.md
```

## Next tasks

1. complete exact-head CI for this documentation-only finalization;
2. verify zero unresolved review threads;
3. mark Ready and squash merge with the expected head;
4. verify synchronized `main`;
5. create `agent/008a-plotjson-version-json-safety-runtime`;
6. add version constants, parser and comparator;
7. add PlotJSON errors and error context;
8. add JSON-safe iterative scan/deep clone;
9. add finite resource-limit defaults and boundary tests;
10. export primitives from `@plotlibre/core`;
11. keep parser replacement, migration registry, Store and MapLibre changes out of 008A.

## Risks and decisions

- current `1.0.0` normalization cannot be silently tightened;
- unknown current structural fields are dropped;
- direct object input needs prototype/cycle/accessor protection;
- Registry currently ignores Definition-version mismatch;
- current `clear()` plus repeated `add()` import is not fully atomic;
- resource defaults require explicit rationale and tests;
- arbitrary migration DAGs, downgrade and future-version best effort remain excluded;
- exact future group/lock/visibility schema belongs to 007D after 008D/E.
