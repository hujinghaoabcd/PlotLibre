# PlotLibre Milestone 007C Runtime Post-Merge Finalization

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
Runtime PR：`#49 Implement 007C selection rotation and scale`  
Validated runtime head：`c9c8cadf678a0758075af76d078b2e5a5bfbd379`  
Runtime CI：run `30943895213` / `#505`  
Squash merge SHA：`2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0`  
Finalization branch：`agent/007c-runtime-post-merge-finalization`

## Purpose

PR #49 merged the complete Milestone 007C runtime for authored-control whole-selection rotation and positive uniform scale. This finalization records the actual squash SHA, changes current-state documents from “runtime PR active” to “runtime merged,” and fixes the next design boundary.

No runtime, package, test, Playground, workflow or configuration changes are permitted in this finalization.

## Merged baseline

```text
main SHA:           2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         299
Chromium tests:     34
MapLibre Sources:   4
MapLibre Layers:    10
benchmark jobs:     region selection + selection transform
```

## Merge evidence

```text
validated head:       c9c8cadf678a0758075af76d078b2e5a5bfbd379
GitHub Actions run:   30943895213 (#505)
Node 20.19:           success
Node 22:              success
Node tests:           299 passed / 0 failed
Playground typecheck: success
Playground build:     success
handover contract:    success
Chromium tests:       34 passed / 0 failed
review threads:       0 unresolved
merge method:         squash
squash SHA:           2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0
```

Benchmark artifacts from the exact validated head:

```text
region-selection-benchmark-30943895213
artifact id: 8906262138
sha256: 068192754a77c785c799595d9b6bcf934f8816870c132868476027a486b8d4ca

selection-transform-benchmark-30943895213
artifact id: 8906253893
sha256: 9a0b7bde65c97577799255ebb73e2cfddcb507c1ed580e98775aa7e2792dc753
```

Artifacts expire on 2026-08-18. The checked-in performance documents preserve the interpretation and measurement boundary after artifact expiry.

## Merged 007C capability

```text
ordered complete selection
→ one order-independent local-metre frame
→ fixed authored-control AABB-centre pivot
→ positive clockwise rotation or positive uniform scale
→ all-member canonicalize + Registry.generate
→ complete preview or complete rejection
→ one stale-safe BatchEditCommand
→ exact captured undo/redo
```

The runtime preserves identifiers, Definition version, parameters, style, metadata, Store order, selection order and Primary. Effectively changed features receive exact `revision + 1`.

The explicit public surface is:

```ts
plot.selectionTransform
plot.selectionTransformSnapshot
plot.selectionTransformRejection
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
```

The derived DOM/SVG overlay adds no MapLibre Source or Layer. The four-Source/ten-Layer baseline is unchanged.

## Frozen safety and interaction rules

- transform only authored controls;
- preview, rejection, cancel and no-op never mutate Store or History;
- partial preview and partial commit are prohibited;
- positive clockwise angle;
- positive uniform scale `[0.01,100]`;
- out-of-range values reject rather than clamp;
- crossing the pivot cannot reflect;
- complete Registry preflight is mandatory;
- one effective gesture creates one atomic command;
- undo/redo use captured values and never recompute;
- transform, region, drawing and selected-body translation are mutually exclusive;
- minimum gesture-start radius is four CSS pixels;
- tiny selections use a 24 CSS-pixel minimum visual frame without changing canonical math;
- unsupported coordinate frames fail closed.

## Performance decision

The measured `1/100/1,000` selection-transform profile does not justify a persistent transform cache or spatial index. The benchmark is a Node/CI interaction-layer microbenchmark, not browser frame time or a latency SLA.

Future optimization must be triggered by reproducible browser traces or benchmark regressions and must preserve complete all-member Registry preflight and atomicity.

## Next design boundary

Milestone 007D remains blocked by document-model work. Groups, locks, visibility and z-order cannot be added safely as ad-hoc transient fields because they require stable PlotJSON semantics, migration behavior and compatibility rules.

The next branch after this finalization merges should therefore be documentation/design only:

```text
agent/008-plotjson-migrations-design
```

Its scope is to freeze:

1. current PlotJSON schema inventory and compatibility guarantees;
2. schema-version and Definition-version responsibilities;
3. parse, validation and migration ordering;
4. unknown field and unknown Definition behavior;
5. document-level ordering and future group references;
6. lock, visibility and z-order persistence boundaries;
7. migration registry API and fail-closed errors;
8. golden fixtures and backward/forward compatibility matrix;
9. clean separation between document migration and runtime editing;
10. implementation milestones before 007D runtime can begin.

No PlotJSON runtime changes belong in the design PR.

## Deferred scopes

```text
reflection
negative or non-uniform scale
skew and snapping
pivot dragging
numeric transform fields
touch-specific transforms
groups / locks / visibility / z-order runtime
new symbols
coordinated npm release
```

## Documentation synchronized

- `README.md` records the merged 007C baseline and actual main SHA;
- `AGENTS.md` changes 007C from active PR to merged authority and freezes the next design boundary;
- `docs/DEVELOPMENT_PLAN.md` marks 007C runtime and finalization complete and advances to PlotJSON migration design;
- `docs/handover/LATEST.md` points to this post-merge authority;
- this immutable record preserves exact merge and validation evidence.

## Finalization merge gate

```text
Node 20.19
Node 22
299 Node tests
34 Chromium tests
Playground typecheck/build
handover contract
region-selection benchmark
selection-transform benchmark
0 unresolved review threads
```

## Known risks

- strict rendered similarity under scaling is not guaranteed when Definitions use absolute ground caps;
- local transforms intentionally reject global/extreme coordinate domains;
- packages remain without a coordinated public release;
- the Playground production bundle still reports a large-chunk warning;
- benchmark artifacts expire and checked-in reports must remain authoritative;
- groups/locks/visibility/z-order remain blocked until PlotJSON migration semantics are frozen and implemented.
