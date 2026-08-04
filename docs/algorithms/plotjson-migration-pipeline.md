# PlotJSON Migration and Atomic Import Pipeline

Status: algorithm contract for Milestone 008.  
Runtime implementation is deferred to dedicated runtime branches.

## 1. Inputs and outputs

Input:

```ts
string | unknown
```

Required dependencies:

```text
current schema version
PlotJsonMigrationRegistry
PlotRegistry
PlotJsonLimits
```

Output:

```ts
interface PreparedPlotDocumentImport {
  readonly document: PlotDocument;
  readonly report: PlotJsonMigrationReport;
  readonly orderedIds: readonly string[];
}
```

Preparation is pure with respect to application state. It may allocate, parse and generate derived geometry for validation, but it cannot mutate Store, selection, History, renderer or interaction controllers.

## 2. Stage A — input boundary

### A1. String size

When input is a string, measure encoded or conservatively estimated input bytes before `JSON.parse`. Reject when the configured limit is exceeded.

### A2. JSON syntax

Parse with `JSON.parse`. Wrap syntax failures as:

```text
PLOTJSON_SYNTAX_INVALID
```

Do not expose engine-specific stack traces in the stable message. Preserve the original error as `cause`.

### A3. Direct object inputs

Direct objects are allowed for API compatibility but are untrusted. They must pass the same recursive JSON-safety scan as parsed strings.

## 3. Stage B — recursive JSON-safety scan

Traverse the complete value iteratively or with guarded recursion.

Accepted:

```text
null
string
boolean
finite number
array
plain JSON object
```

Rejected:

```text
undefined
NaN / Infinity
BigInt
Symbol
function
Date
Map / Set
typed arrays
class instances
accessors
cyclic references
symbol keys
```

The scan records:

```text
depth
total nodes
total object keys
maximum string length
```

It rejects the first deterministic depth-first path that violates a rule or resource limit.

JSON path notation:

```text
$
$.features[3]
$.features[3].controlPoints[1][0]
```

Object-key traversal during validation and reporting must be deterministic. Schema fields use schema order; arbitrary metadata keys use lexicographic order for diagnostics.

## 4. Stage C — minimal envelope decode

Require a root object and inspect only:

```text
type
schemaVersion
```

Rules:

```text
type !== "PlotLibreDocument"
→ PLOTJSON_DOCUMENT_TYPE_UNSUPPORTED

schemaVersion not canonical MAJOR.MINOR.PATCH
→ PLOTJSON_SCHEMA_VERSION_INVALID
```

No full current-schema assumptions may run before document migration.

## 5. Stage D — migration planning

Let:

```text
source = envelope.schemaVersion
target = CURRENT_PLOTJSON_SCHEMA_VERSION
```

### D1. Equal

No document step.

### D2. Source newer than target

Reject:

```text
PLOTJSON_SCHEMA_VERSION_UNSUPPORTED
```

### D3. Source older than target

Ask the migration registry for one deterministic chain.

Pseudo-code:

```ts
function plan(scope, source, target) {
  const steps = [];
  const visited = new Set([source]);
  let current = source;

  while (current !== target) {
    const step = registry.outgoing(scope, current);
    if (!step) throw pathMissing(current, target);
    if (compare(step.toVersion, current) <= 0) throw invalidGraph();
    if (compare(step.toVersion, target) > 0) throw pathMissing(current, target);
    if (visited.has(step.toVersion)) throw invalidGraph();
    steps.push(step);
    visited.add(step.toVersion);
    current = step.toVersion;
  }

  return Object.freeze(steps);
}
```

Exactly one outgoing edge per source version is enforced at registration, so planning does not depend on map iteration order.

## 6. Stage E — document migration execution

Start with a deep JSON clone of the raw root.

For each planned step:

1. freeze or otherwise protect the step input in tests;
2. call the pure migration;
3. verify the returned value is a different JSON-safe root object;
4. rescan resource limits;
5. require returned `type` unchanged;
6. require returned `schemaVersion === step.toVersion`;
7. append one immutable report record;
8. continue from a deep clone of valid output.

A throw or invalid output becomes:

```text
PLOTJSON_MIGRATION_OUTPUT_INVALID
```

with source/target versions and cause.

No step output is externally observable before the complete chain succeeds.

## 7. Stage F — current document decode

Decode the migrated root under the current target schema.

For current `1.0.0`, preserve historical parser normalizations and report them. The decoder must still reject non-JSON content and resource-limit failures.

Construct a new document rather than returning migration-owned object references.

## 8. Stage G — document invariants

### G1. Feature-id uniqueness

Use one pass over document order:

```ts
const firstPathById = new Map<string, string>();
for (const [index, feature] of features.entries()) {
  const path = `$.features[${index}].id`;
  const firstPath = firstPathById.get(feature.id);
  if (firstPath) throw duplicate(feature.id, firstPath, path);
  firstPathById.set(feature.id, path);
}
```

Reject before Registry generation or Store mutation.

### G2. Numeric and JSON invariants

Require:

- finite coordinates;
- latitude in `[-90,90]`;
- non-negative safe-integer revision;
- JSON-safe parameters/style/metadata;
- configured feature/control limits.

### G3. Order

The features array is the authoritative current document order. Capture:

```ts
orderedIds = features.map(feature => feature.id)
```

## 9. Stage H — Definition target resolution

For each feature in document order:

1. validate `definitionVersion` syntax;
2. resolve the registered current Definition by `plotType`;
3. read `targetVersion = definition.version`;
4. compare source and target.

Unknown Definition:

```text
PLOTJSON_DEFINITION_NOT_FOUND
```

Newer authored Definition version:

```text
PLOTJSON_DEFINITION_VERSION_UNSUPPORTED
```

Older version without chain:

```text
PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING
```

The planner snapshots all required chains before executing any feature migration, so a missing chain cannot appear after partial feature processing becomes externally visible.

## 10. Stage I — feature migration execution

Execute each feature independently in document order, but publish no partial result.

For every step:

- input is a deep-cloned JSON feature record;
- returned feature id must remain stable unless a future document migration explicitly owns id rewrite;
- returned `plotType` may change only when the step explicitly records a rename;
- returned `definitionVersion` must equal the step target;
- output must remain JSON-safe and within limits;
- report identifies original document path and stable feature id.

After the chain:

```text
feature.definitionVersion === registry.get(feature.plotType).version
```

is required.

A Definition migration cannot access or reorder sibling features. Cross-feature structural changes belong to document migration.

## 11. Stage J — semantic preflight

For each fully migrated feature in document order:

```text
strict current feature decode
→ PlotRegistry.canonicalize
→ PlotRegistry.generate
```

The canonical feature returned by the Registry path becomes the prepared document member. `generate()` is called to prove current renderability but derived geometry is discarded.

If one member fails, wrap the failure with:

```text
feature id
plotType
JSON path
cause
```

and reject the entire preparation.

No partial prepared document is returned.

## 12. Stage K — result construction

Create immutable copies:

```ts
{
  document: createPlotDocument(...canonicalFeatures),
  report: freezeReport(...),
  orderedIds: Object.freeze([...ids]),
}
```

The result must not retain references owned by input or migration functions.

Idempotence requirement:

```text
prepare(prepare(input).document).document
deep-equals
prepare(input).document
```

when registries and target versions are unchanged.

The second report contains no migration steps; only unavoidable current-version normalization records may remain, and canonical output should normally require none.

## 13. Stage L — atomic application

The MapLibre facade performs lifecycle changes only after preparation succeeds.

Recommended atomic primitive:

```ts
PlotStore.replaceDocument(features, orderedIds)
```

Semantics:

1. clone and validate every feature and id;
2. stage one complete Map in supplied order;
3. compute added/updated/removed ids against current Store;
4. swap Store state once;
5. emit one batch event;
6. isolate listener exceptions.

Using separate `clear()` and `add()` calls is prohibited.

After the Store commit succeeds:

```text
cancel interaction modes
clear selection
clear History
return prepared document/report
```

If lifecycle cleanup can throw, it must be designed so Store and History cannot become observably inconsistent. Expected input errors have already been eliminated before commit.

## 14. Failure-state matrix

| Failure stage | Store | Selection | History | Interaction | Report returned |
|---|---|---|---|---|---|
| syntax / JSON safety | unchanged | unchanged | unchanged | unchanged | no |
| envelope / version | unchanged | unchanged | unchanged | unchanged | no |
| document migration | unchanged | unchanged | unchanged | unchanged | no |
| current decode | unchanged | unchanged | unchanged | unchanged | no |
| duplicate id / limits | unchanged | unchanged | unchanged | unchanged | no |
| Definition plan/migration | unchanged | unchanged | unchanged | unchanged | no |
| Registry preflight | unchanged | unchanged | unchanged | unchanged | no |
| Store staging | unchanged | unchanged | unchanged | unchanged | no |
| Store commit listener error | committed | post-commit cleanup proceeds | cleared | cancelled | yes |
| success | replaced once | empty | empty | idle | yes |

Listener errors are post-commit observer failures, not import validation failures. They are reported through the Store listener-error hook.

## 15. Determinism tests

Each migrator is executed at least twice against deep-equal cloned input. Outputs must deep-equal.

Runtime tests must also prove:

- migration does not mutate input;
- registry registration order does not change a valid plan;
- ambiguous outgoing registration is rejected;
- cycle registration is rejected;
- report ordering follows document order and step order;
- object-key insertion order in metadata does not change migration semantics;
- serialization after migration is stable under repeated read/write cycles.

## 16. Complexity

Let:

```text
J = number of JSON nodes
D = document migration steps
F = features
M = total Definition migration steps
C = total authored control points
G = Registry generation cost across all features
```

Expected preparation complexity:

```text
O(J * (1 + D) + F + M + C + G)
```

Each migration output is rescanned by design. This favors correctness and bounded untrusted input over avoiding linear passes. Optimization requires measurement and cannot skip safety scans or all-member Registry preflight.

## 17. Security constraints

- never evaluate strings as code;
- never load modules or resources named by document metadata;
- never fetch migration code from the document;
- migration registry is application-installed trusted code only;
- reject prototype-bearing direct objects or copy only own enumerable string keys into plain objects;
- defend against prototype-pollution keys during cloning;
- enforce finite resource limits before and after migrations;
- error messages must not dump complete documents or metadata.

## 18. Deferred algorithms

- downgrade planning;
- arbitrary migration DAG path search;
- unresolved-feature preservation;
- streaming JSON parsing;
- asynchronous migrations;
- collaborative conflict resolution;
- signed/canonical JSON;
- derived-geometry cache validation.
