# PlotLibre Handover — Milestone 008C PlotJSON Reader Runtime

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
PR：#57  
分支：`agent/008c-plotjson-reader-runtime`  
基线 main：`dead641a40852758bcdecbfad99cbf2215024916`

## 1. Milestone result

008C connects the merged 008A JSON-safety/version foundation and 008B deterministic migration planner into one pure, report-bearing reader.

```text
workspace:             0.0.22
persisted schema:      PlotLibreDocument / 1.0.0
production migrations: none
public Definitions:    19
candidate Node tests:  375
Chromium baseline:     34
Store mutation:        excluded
MapLibre mutation:     excluded
next milestone:        008D atomic import
```

## 2. Runtime authority

```text
packages/core/src/plotjson-reader.ts
packages/core/src/plotjson-current-decoder.ts
packages/core/src/plotjson.ts
packages/core/src/index.ts
```

Tests:

```text
tests/plotjson-reader.test.mjs
tests/plotjson-reader-hardening.test.mjs
```

Design:

```text
docs/design/plotjson-reader-runtime.md
```

## 3. Public API

```ts
interface ReadPlotDocumentOptions {
  readonly migrations?: PlotJsonMigrationRegistry;
  readonly definitionTargets?: Readonly<
    Record<string, PlotJsonDefinitionReference>
  >;
  readonly limits?: Partial<PlotJsonLimits>;
}

interface ReadPlotDocumentResult {
  readonly document: PlotDocument;
  readonly report: PlotJsonMigrationReport;
}

readPlotDocument(input, options?)
parsePlotDocument(input, options?)
```

`readPlotDocument()` is the evidence-bearing API. `parsePlotDocument()` remains a compatibility wrapper returning only the immutable current document.

## 4. Input safety

### 4.1 String input

- UTF-8 byte limit is checked before `JSON.parse`;
- syntax failure becomes `PLOTJSON_SYNTAX_INVALID`;
- no partial document is exposed.

### 4.2 Direct object input

- all values pass through the descriptor-safe 008A clone;
- getters are never invoked;
- accessors, symbols, hidden properties, custom prototypes, sparse arrays, cycles, non-finite values and non-JSON object families reject;
- caller containers are not reused in the returned document.

## 5. Document migration execution

```text
safe cloned root
→ exact deterministic plan to current schema
→ frozen cloned input per step
→ trusted synchronous migration
→ reject same-object and Promise output
→ descriptor-safe clone and resource scan
→ require exact target type/schema envelope
→ record successful applied step
```

Document output failures use `PLOTJSON_MIGRATION_OUTPUT_INVALID` and carry scalar source/target context.

Tests cover thrown errors, same-object returns, asynchronous returns, accessors without getter invocation, non-JSON object families, resource-limit output, exact multi-step order and unchanged caller input.

## 6. Current 1.0.0 compatibility decoder

The historical compatibility behavior remains intact and is now observable:

```text
missing/non-string definitionVersion → 1.0.0
missing/non-record parameters        → {}
missing/non-record style             → {}
missing/non-record feature metadata  → {}
missing/invalid revision             → 0
unknown root/feature fields          → dropped
```

The decoder records deterministic normalization and warning facts and visits unknown keys in sorted order.

It additionally enforces:

- root id/name strings;
- features array and root metadata object;
- feature id/plotType strings;
- numeric `[longitude, latitude]` controls;
- latitude within `[-90,90]`;
- canonical present Definition versions;
- non-negative safe integer retained revision;
- document-wide unique feature ids.

Duplicate feature ids fail with `PLOTJSON_FEATURE_ID_DUPLICATE` before any external application state is touched.

## 7. Definition migration execution

`definitionTargets` is an explicit application configuration keyed by source plotType after document decoding.

```ts
{
  "arrow.legacy": {
    plotType: "arrow.current",
    definitionVersion: "2.0.0",
  },
}
```

When the map is omitted, parser-only current-1.0 compatibility remains available and no live Registry equality is claimed.

When the map is supplied:

- every source plotType needs an own target;
- an exact target performs no migration and emits no feature-step record;
- other targets require an exact 008B migration chain;
- every step receives frozen cloned feature JSON;
- every output is cloned and generically safety/resource scanned;
- every step enforces `controlPointsPerFeature` explicitly;
- output feature id must remain stable;
- output plotType and Definition version must match the exact step target;
- final structural decode failures are attributed to Definition migration;
- final decoded feature must match the requested target reference.

After all Definition migrations, the complete current document is rebuilt and rescanned. This re-establishes document semantic roles and enforces aggregate budgets, including `totalControlPoints`, which cannot be inferred from an independently scanned feature root.

Explicit plotType renames are retained in the immutable report.

## 8. Result immutability

The returned result, document, feature array, feature records, control arrays, parameters, styles, metadata and migration report are detached and deeply frozen.

Repeated reads of the same fixed input produce deeply equal but distinct result objects.

## 9. Stable expected failures

Important codes exercised in 008C:

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
```

Errors retain scalar context only and do not retain complete documents or business metadata.

## 10. Scope exclusions

008C does not change:

```text
packages/core/src/registry.ts
packages/core/src/store.ts
packages/maplibre/**
apps/playground runtime
.github/workflows/**
PlotJSON serializer output
PlotJSON persisted schema
public Definition implementations
```

It does not mutate Store, selection, History, interaction sessions or MapLibre. It does not register a production migration or bump the schema.

## 11. Validation history

### Structured reader head

```text
head:       83aa795217e3b684ac5816e80eb4a8d434419df4
CI:         30959801435 / #545
Node tests: 364 passed
Chromium:   34 passed
```

### Initial hardening discovery

The first 372-test run exposed two incorrect test expectations rather than runtime defects:

- public limit key is `stringLength`, not `maxStringLength`;
- cycles use the existing unified non-JSON code `PLOTJSON_VALUE_NOT_JSON`.

Both expectations were corrected without removing security assertions.

### Semantic-budget review

A subsequent code review found a real semantic-limit gap. Generic cloning of an individual Definition feature correctly enforced JSON limits, but the root role was not `features[i]`; therefore it could not infer the `controlPoints` semantic role or accumulate document-wide controls.

The runtime was hardened to:

1. enforce `controlPointsPerFeature` after every Definition migration step;
2. attribute malformed final feature decoding to `PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID`;
3. rebuild and scan the complete final document after all Definition migrations;
4. enforce aggregate `totalControlPoints` and all other complete-document limits;
5. add three regression tests, raising the candidate total from 372 to 375.

### Final exact-head validation

Pending after the semantic-budget code and documentation commits. The PR must not become Ready until the final head passes:

```text
Node 20.19
Node 22
375 Node tests
Playground typecheck/build
handover check
region-selection benchmark
selection-transform benchmark
34 Chromium tests
0 unresolved review threads
```

The final PR body must record exact head, run id, artifact ids/digests and review-thread count. This handover will be updated with that evidence before Ready/merge, followed by one final exact-head CI run.

## 12. 008D frozen boundary

Create `agent/008d-plotjson-atomic-import-runtime` only after PR #57 and a Markdown-only 008C post-merge finalization are merged and `main` is re-verified.

008D owns:

1. derive exact Definition targets from live `PlotRegistry`;
2. require final Definition-version equality;
3. canonicalize and generate every feature before mutation;
4. validate complete document order and ids;
5. add a dedicated atomic Store document-replacement transaction;
6. commit one Store batch event;
7. preserve old Store/order/selection/History/interactions on failure;
8. clear selection and History only after successful commit;
9. integrate `PlotLibre.importDocument()`;
10. add Chromium rollback and success regressions.

008D must not introduce a schema bump, groups, locks, visibility, z-order, downgrade migration, unresolved-feature mode or future-version best effort.

## 13. Known remaining gaps

- current `PlotLibre.importDocument()` still clears then repeatedly adds;
- duplicate ids can still cause partial replacement in the old import path;
- reader Definition targets are explicit configuration rather than derived from live Registry;
- Registry generation/equality is not part of the pure reader;
- no production migration is registered;
- no schema 1.1 document exists;
- groups, locks, visibility and z-order remain blocked;
- migration functions are trusted code and cannot be sandboxed by JavaScript runtime checks.

## 14. Merge discipline

1. update this handover with final exact-head evidence;
2. update `LATEST.md` to the same head/run/artifacts;
3. compare against `dead641a40852758bcdecbfad99cbf2215024916` and verify expected scope;
4. run full exact-head CI;
5. verify zero unresolved review threads;
6. mark PR #57 Ready without changing head;
7. squash merge with expected head;
8. verify returned squash SHA as current `main`;
9. create Markdown-only 008C post-merge finalization from that SHA;
10. synchronize README, AGENTS, architecture, PlotJSON spec, roadmap and LATEST;
11. run exact-head closure CI and merge;
12. create 008D only from synchronized main.
