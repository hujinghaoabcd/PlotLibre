# PlotLibre Milestone 008A PlotJSON Foundations Handover

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
基线 `main`：`add70f52eb252b1167f7abfb4ecf4b93370bfbdf`  
分支：`agent/008a-plotjson-version-json-safety-runtime`  
PR：`#53 Add PlotJSON version and JSON-safety foundations`  
工作区版本：`0.0.22`

This is the immutable runtime-scope handover for Milestone 008A. Final exact-head CI, artifact ids and merge state must be recorded in the PR and in a separate post-merge authority synchronization.

## 1. Delivered scope

008A adds engine-independent PlotJSON foundation primitives to `@plotlibre/core`:

- current document type and schema-version constants;
- canonical persisted-version parsing;
- numeric version comparison;
- canonical-version predicate;
- complete structured PlotJSON error-code union;
- scalar/path-aware `PlotJsonError` context;
- finite default resource limits;
- validated immutable limit overrides;
- UTF-8 input-byte guard;
- iterative JSON-safe traversal;
- descriptor-safe deep clone;
- deterministic JSON paths;
- cycle, prototype, accessor and non-JSON rejection;
- prototype-pollution-safe own-property cloning;
- immutable scan statistics;
- semantic feature and authored-control counts;
- public core exports;
- pure Node tests and runtime documentation.

## 2. Explicit exclusions

008A does not change:

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

No current PlotJSON input that previously reached `parsePlotDocument()` is newly accepted or rejected by 008A because the primitives are not yet integrated into that parser.

## 3. Public API

```ts
PLOTJSON_DOCUMENT_TYPE
CURRENT_PLOTJSON_SCHEMA_VERSION

parsePlotJsonVersion(value)
comparePlotJsonVersions(left, right)
isCanonicalPlotJsonVersion(value)

PlotJsonError
PlotJsonErrorCode
PlotJsonErrorContext

DEFAULT_PLOTJSON_LIMITS
resolvePlotJsonLimits(overrides)
assertPlotJsonInputSize(input, limits)
clonePlotJsonValue(input, options)
scanPlotJsonValue(input, options)
```

## 4. Persisted version contract

Accepted form:

```text
MAJOR.MINOR.PATCH
```

Each component is a canonical non-negative safe integer. Rejected forms include:

```text
v1.0.0
1.0
01.0.0
1.0.0-beta
1.0.0+build
negative / decimal / exponent / unsafe components
```

Comparison is numeric, so `1.2.9 < 1.10.0`. Parsed results are frozen and forged parsed records reject.

Malformed-version error messages do not echo the untrusted payload.

## 5. JSON safety contract

Accepted:

```text
null
string
boolean
finite number
dense arrays
plain objects
null-prototype objects
```

Rejected:

```text
undefined
NaN / Infinity
BigInt / Symbol / function
Date / Map / Set / RegExp
typed arrays / class instances / custom prototypes
accessors / non-enumerable properties / symbol keys
sparse arrays / custom array properties
cycles
```

The implementation never invokes getters. It inspects own descriptors and uses an explicit traversal stack rather than recursive calls.

Repeated sibling references are cloned independently. Active-ancestor references reject as cycles.

## 6. Prototype-pollution safety

Output objects are plain objects. Own properties are installed with `Object.defineProperty()`, allowing valid JSON keys such as `__proto__` and `constructor` to remain data without mutating `Object.prototype`.

Tests verify no global prototype pollution occurs.

## 7. Determinism

- object keys are traversed lexicographically;
- equal content with different insertion order reports the same first invalid path;
- arrays remain index ordered;
- paths use deterministic root/key/index notation;
- input is not mutated;
- output shares no nested container references with input;
- limits and statistics are frozen.

A tested 2,000-level nested array proves traversal does not depend on the JavaScript call stack.

## 8. Default limits

```text
inputBytes:               16 MiB
maximum depth:            128
value nodes:              1,000,000
object keys:              250,000
string/key length:        1,000,000 UTF-16 code units
features:                 100,000
controls per feature:     10,000
total authored controls:  1,000,000
```

These are finite untrusted-input ceilings. They are not recommended document sizes, memory guarantees, browser budgets or performance SLAs.

Applications may override each value with another finite positive safe integer. Invalid, zero, negative, fractional, infinite, NaN or unsafe limits reject.

`stringLength` applies to both values and object keys. `assertPlotJsonInputSize()` measures UTF-8 bytes.

## 9. Statistics

```text
totalNodes
objectKeys
maximumDepth
maximumStringLength
features
maximumControlPointsPerFeature
totalControlPoints
```

Semantic counts recognize only:

```text
$.features
$.features[i].controlPoints
```

This is a resource observation, not current-schema validation.

## 10. Error surface

`PlotJsonError` extends `PlotLibreError` and can expose:

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

It does not retain full documents or metadata.

The complete design code union is exported now to keep later runtime slices source-compatible. 008A directly uses version-invalid, value-not-JSON, resource-limit and current-schema-invalid codes.

## 11. Validation coverage

Added test files:

```text
tests/plotjson-version-foundation.test.mjs
tests/plotjson-safety.test.mjs
tests/plotjson-safety-hardening.test.mjs
```

Coverage includes:

- valid/invalid/unsafe version triples;
- numeric ordering traps;
- immutable parsed versions;
- forged version records;
- bounded error messages;
- all accepted primitive/container families;
- every prohibited primitive and object family;
- getter non-invocation;
- hidden and symbol properties;
- sparse/custom arrays;
- direct/indirect cycles;
- repeated sibling references;
- null prototypes;
- `__proto__` and `constructor` keys;
- insertion-order-independent failure paths;
- deep iterative traversal;
- UTF-8 byte counting;
- all resource limit categories;
- feature/control semantic statistics;
- immutable output envelopes.

Expected final baseline:

```text
Node tests:       324
Chromium tests:   34
```

## 12. Implementation notes

`scanPlotJsonValue()` currently delegates to the same clone path and discards the clone. This deliberately avoids separate validation and clone implementations that could drift. A later measured optimization may introduce a no-allocation scan mode only if it preserves identical behavior.

The direct-object validator is stricter than `JSON.stringify()` because it does not execute `toJSON`, getters or inherited behavior.

## 13. Next runtime slice — 008B

Create only after 008A is squash-merged and post-merge authority is synchronized:

```text
agent/008b-plotjson-migration-registry-runtime
```

008B scope:

- document and Definition migration step types;
- migration registry registration;
- one outgoing step per source version/scope;
- strictly increasing version validation;
- duplicate/self/decreasing/cycle/branch rejection;
- deterministic linear chain planning;
- immutable report record types;
- test-only pure migration execution helpers if required by planner tests;
- pure Node tests and immutable handover.

008B exclusions:

```text
parsePlotDocument replacement
historical 1.0 normalization integration
Definition migration of production symbols
Registry-version enforcement
Store document replacement
MapLibre import changes
schema bump
```

## 14. Final exact-head closure

Before marking PR #53 Ready:

1. confirm exact final head on Node 20.19 and Node 22;
2. confirm 324 Node tests;
3. confirm Playground typecheck/build and handover contract;
4. confirm region and transform benchmark jobs/artifacts;
5. confirm 34 Chromium tests;
6. confirm zero unresolved review threads;
7. update PR body with exact head, CI and artifact ids;
8. mark Ready without changing head;
9. squash merge using expected head SHA;
10. verify new `main` and create a documentation-only post-merge finalization branch.

## 15. Risks and deferred work

- default ceilings are intentionally generous and may be tightened after real reader/import benchmarks;
- an object with a very large own-key set still requires the JavaScript engine to enumerate keys before the library can reject it;
- diagnostic JSON paths can include application keys and should not be treated as secrets;
- current parser remains permissive and unprotected until 008C integration;
- current Registry still ignores Definition-version mismatch;
- current import still uses non-atomic `clear()` plus repeated `add()`;
- migration graph, reports, current reader and atomic import remain 008B–008D work;
- 007D groups/locks/visibility/z-order remains blocked through 008D/E.
