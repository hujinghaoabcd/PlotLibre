# PlotLibre Milestone 008A Post-Merge Finalization

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
Runtime PR：`#53 Add PlotJSON version and JSON-safety foundations`  
Validated runtime head：`cb3db0fa6dc38c9b852524c15e4066b52b0c7b38`  
Runtime CI：run `30951490118`  
Squash/main SHA：`d8b2d889dee81064069f96e555dd75b1c851ccf3`  
Finalization branch：`agent/008a-plotjson-post-merge-finalization`

## Purpose

PR #53 merged the first PlotJSON migration-foundation runtime slice. This documentation-only finalization records the actual squash SHA, final exact-head validation and artifact evidence, changes 008A from active to merged authority, and freezes the next 008B runtime boundary.

No parser, Registry, Store, MapLibre, package, test, fixture, workflow or persisted-schema behavior changes belong in this finalization.

## Merged baseline

```text
main SHA:             d8b2d889dee81064069f96e555dd75b1c851ccf3
workspace:            0.0.22
PlotJSON schema:      1.0.0
production migrations: none
public symbols:       19 (14 Arrow + 1 Line + 4 Area)
Node tests:           324
Chromium tests:       34
MapLibre Sources:     4
MapLibre Layers:      10
```

## Exact merge evidence

```text
validated head:       cb3db0fa6dc38c9b852524c15e4066b52b0c7b38
CI run:               30951490118
Node 20.19:           success
Node 22:              success
Node tests:           324 passed
Playground typecheck: success
Playground build:     success
handover check:       success
Chromium tests:       34 passed
review threads:       0 unresolved
changed files:        14 expected files
merge method:         squash
squash/main SHA:      d8b2d889dee81064069f96e555dd75b1c851ccf3
```

Exact-head benchmark artifacts:

```text
region-selection-benchmark-30951490118
artifact id: 8909283653
sha256: 25cabaf1b2e412960543c6c1dea7772b405faa132e5b2866bd1c10412a5b3d08

selection-transform-benchmark-30951490118
artifact id: 8909282981
sha256: 5fa08149bcb13358773c85acb3a5ab0c5f5eebdb82083fa28b19843df7a3dd55
```

Artifacts expire on 2026-08-18. Checked-in design, runtime and handover documents remain authoritative after artifact expiry.

## Merged 008A public surface

```ts
PLOTJSON_DOCUMENT_TYPE
CURRENT_PLOTJSON_SCHEMA_VERSION
parsePlotJsonVersion(...)
comparePlotJsonVersions(...)
isCanonicalPlotJsonVersion(...)

PlotJsonError
PlotJsonErrorCode
PlotJsonErrorContext

DEFAULT_PLOTJSON_LIMITS
resolvePlotJsonLimits(...)
assertPlotJsonInputSize(...)
clonePlotJsonValue(...)
scanPlotJsonValue(...)
```

## Merged safety contracts

### Persisted versions

- canonical numeric `MAJOR.MINOR.PATCH` only;
- non-negative safe-integer components;
- numeric tuple comparison;
- frozen parsed results;
- forged parsed records reject;
- malformed-version errors do not echo untrusted payloads.

### Direct-object JSON boundary

Accepted:

```text
null / string / boolean / finite number
dense arrays
plain or null-prototype objects
```

Rejected:

```text
undefined / NaN / Infinity / BigInt / Symbol / function
Date / Map / Set / RegExp / typed arrays / class instances
custom prototypes / accessors / hidden or symbol properties
sparse arrays / custom array properties / cycles
```

Traversal is iterative and descriptor-based. It does not invoke getters. Object keys are visited lexicographically, repeated non-cyclic references are cloned independently, and own `__proto__`/`constructor` keys cannot pollute prototypes.

### Default finite ceilings

```text
UTF-8 input:             16 MiB
maximum depth:           128
value nodes:             1,000,000
object keys:             250,000
string/key length:       1,000,000 UTF-16 code units
features:                100,000
controls per feature:    10,000
total authored controls: 1,000,000
```

These values are security ceilings, not recommended document sizes, memory guarantees or latency SLAs.

## Preserved boundaries

008A did not change:

```text
parsePlotDocument()
serializePlotDocument()
PlotRegistry behavior
Definition-version enforcement
migration registration or execution
migration report implementation
PlotStore transactions
PlotLibre.importDocument()
MapLibre or Playground runtime
PlotJSON schema 1.0.0
persisted document output
```

The historical `1.0.0` parser remains permissive until 008C. The current import path remains non-atomic under duplicate ids until 008D.

## Next runtime branch

Create only after this finalization is merged:

```text
agent/008b-plotjson-migration-registry-runtime
```

008B scope:

1. immutable document migration step types;
2. immutable Definition migration references and step types;
3. separate document and Definition registration APIs;
4. one outgoing edge per source node and scope;
5. strict version increase;
6. duplicate, self, decreasing, cycle and branch rejection;
7. deterministic linear chain planning independent of registration order;
8. explicit plotType rename edges for Definition migrations;
9. immutable applied-step and migration-report record types;
10. public core exports, pure Node tests, runtime documentation and immutable handover.

008B exclusions:

```text
production migration execution
parsePlotDocument replacement
historical 1.0 normalization integration
production symbol migrations
Definition-version enforcement in Registry
Store document replacement
MapLibre import changes
schema bump
007D persisted fields
```

## Runtime sequence

```text
008A version / JSON safety / limits / errors — merged
008B migration registry / planner / report records — next
008C report-bearing reader / compatibility / invariants
008D Registry-aware preparation / atomic import
008E runtime closure / compatibility fixtures / synchronization
```

## Known risks

- the JavaScript engine must enumerate a large own-key set before the library can reject it;
- diagnostic paths may contain application keys and are not secret containers;
- `scanPlotJsonValue()` currently allocates a clone to keep scan and clone safety identical;
- the current parser does not yet call the input-byte or JSON-safety primitives;
- Registry still renders mismatched `definitionVersion` values;
- current import still uses `clear()` plus repeated `add()`;
- arbitrary migration DAGs, downgrade, future-version best effort and unresolved-feature preservation remain excluded;
- 007D groups/locks/visibility/z-order remains blocked through 008D/E.
