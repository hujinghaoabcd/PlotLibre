# Milestone 008A — PlotJSON Version and JSON-Safety Runtime

Status: runtime implementation on PR #53.  
Design authority: `docs/design/plotjson-migrations.md`.  
Algorithm authority: `docs/algorithms/plotjson-migration-pipeline.md`.

## 1. Scope

008A implements only the engine-independent primitives needed by later PlotJSON migration and atomic-import stages:

```text
canonical persisted version parsing/comparison
structured PlotJSON errors
JSON-safe iterative validation and deep cloning
finite resource-limit configuration
path-aware immutable scan statistics
public @plotlibre/core exports
```

008A does not alter `parsePlotDocument()`, the current `1.0.0` normalization behavior, `PlotRegistry`, `PlotStore`, `PlotLibre.importDocument()`, MapLibre, PlotJSON schema shape or persisted documents.

## 2. Modules

```text
packages/core/src/plotjson-version.ts
packages/core/src/plotjson-error.ts
packages/core/src/plotjson-safety.ts
```

All are exported through `@plotlibre/core`.

## 3. Persisted version primitives

Public constants:

```ts
PLOTJSON_DOCUMENT_TYPE = "PlotLibreDocument"
CURRENT_PLOTJSON_SCHEMA_VERSION = "1.0.0"
```

Public functions:

```ts
parsePlotJsonVersion(value)
comparePlotJsonVersions(left, right)
isCanonicalPlotJsonVersion(value)
```

Accepted syntax:

```text
MAJOR.MINOR.PATCH
```

Each component is a non-negative safe integer with no leading zero except `0`. The initial persisted syntax rejects prefixes, missing components, negative values, decimals, exponent notation, prerelease labels and build metadata.

Comparison is numeric tuple comparison. For example:

```text
1.2.9 < 1.10.0
10.0.0 > 2.99.99
```

Parsed records are frozen. Comparator inputs that claim inconsistent numeric components and string values reject rather than being trusted.

Malformed-version errors intentionally do not echo the supplied version payload. This prevents an untrusted very long value from becoming an equally large log or UI message.

## 4. Structured error surface

`PlotJsonError` extends `PlotLibreError` and uses the complete frozen Milestone 008 code union.

Optional scalar context:

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

The error object never retains the input document or application metadata. Later milestones may wrap syntax, migration, Definition and import failures with the same surface.

008A directly emits:

```text
PLOTJSON_SCHEMA_VERSION_INVALID
PLOTJSON_VALUE_NOT_JSON
PLOTJSON_RESOURCE_LIMIT_EXCEEDED
PLOTJSON_CURRENT_SCHEMA_INVALID
```

Other frozen codes are exported now so later slices do not redefine the public union.

## 5. Accepted JSON value domain

`clonePlotJsonValue()` accepts only:

```text
null
string
boolean
finite number
dense array
plain object with Object.prototype or null prototype
```

It rejects:

```text
undefined
NaN / Infinity
BigInt
Symbol
function
Date
Map / Set
RegExp
typed arrays
class instances
objects with custom prototypes
accessor properties
non-enumerable properties
symbol keys
sparse arrays
custom array properties
cyclic references
```

This is intentionally stricter than `JSON.stringify()`. Direct object input cannot invoke `toJSON`, getters or inherited behavior to change what is validated.

## 6. Iterative traversal

Traversal uses an explicit stack, not recursive function calls. A tested 2,000-level nested array clones successfully when limits permit it.

Algorithm:

```text
visit frame
→ register node/depth
→ classify primitive or container
→ inspect own descriptors without reading properties
→ create plain target container
→ push exit frame for active-ancestor cycle tracking
→ push children in reverse deterministic order
→ assign cloned child values
```

Object keys are visited in lexicographic order. Therefore the first reported invalid path does not depend on property insertion order.

The cycle detector tracks only the current ancestor path. A repeated non-cyclic object reference is valid JSON-like data and is cloned independently at each occurrence.

## 7. Descriptor safety

The validator uses:

```text
Reflect.ownKeys
Object.getOwnPropertyDescriptor
Object.getPrototypeOf
```

It does not evaluate property getters.

For arrays:

- every index from `0` through `length - 1` must have one enumerable data descriptor;
- holes reject;
- symbol keys reject;
- non-index custom properties reject.

For objects:

- only plain/null prototypes are accepted;
- all own keys must be strings;
- every own property must be enumerable data;
- keys are sorted before child traversal.

Proxy inspection failures are wrapped as structured JSON-value failures with a cause.

## 8. Prototype-pollution protection

Cloned objects are created as ordinary plain objects, but properties are installed with `Object.defineProperty()` rather than assignment.

Consequently valid own JSON keys such as:

```text
__proto__
constructor
prototype
```

remain own data properties and cannot mutate the target prototype. Tests verify that cloning a `__proto__` key does not pollute `Object.prototype`.

Null-prototype input objects are accepted and normalized to ordinary safe JSON objects.

## 9. Resource limits

Default limits:

| Limit | Default |
|---|---:|
| UTF-8 input bytes | 16 MiB |
| maximum depth | 128 |
| total value nodes | 1,000,000 |
| total object keys | 250,000 |
| maximum string value or key length | 1,000,000 UTF-16 code units |
| root `features` length | 100,000 |
| controls per feature | 10,000 |
| total authored controls | 1,000,000 |

These values are finite security ceilings, not recommended document sizes, browser frame budgets, memory guarantees or public performance SLAs.

Rationale:

- 16 MiB bounds raw string parsing before a later report-bearing reader calls `JSON.parse()`;
- depth 128 is far above the current PlotJSON schema while preventing adversarial nesting;
- node/key/control ceilings cap allocation and traversal independently of input bytes and direct-object input;
- feature/control ceilings remain deliberately generous so 008A does not invent a product-size policy before real import benchmarks;
- string length applies to both values and object keys, preventing oversized keys from bypassing the limit.

Applications may provide different finite positive safe integers. Invalid, zero, negative, fractional, infinite or unsafe values reject. No limit can be disabled through `Infinity` or `NaN`.

Every configured limit has below-boundary, exact-boundary and over-boundary tests where the structure permits concise fixtures.

## 10. Input-byte guard

`assertPlotJsonInputSize()` measures UTF-8 bytes with `TextEncoder`, not JavaScript code units.

Example:

```text
"é" = 2 UTF-8 bytes
```

This primitive is not yet called by `parsePlotDocument()`; integration belongs to 008C.

## 11. Statistics

`clonePlotJsonValue()` returns:

```ts
{
  value,
  statistics,
  limits
}
```

Both `statistics` and resolved `limits` are frozen.

Statistics:

```text
totalNodes
objectKeys
maximumDepth
maximumStringLength
features
maximumControlPointsPerFeature
totalControlPoints
```

Semantic feature/control counts are recognized only at the current document paths:

```text
$.features
$.features[i].controlPoints
```

They are safety observations, not current-schema validation. 008C later decodes and validates actual feature semantics.

`scanPlotJsonValue()` uses the same clone-and-validate path and returns statistics only. It currently pays clone allocation by design so validation and cloning cannot drift into different safety behavior. Optimization requires measurement and cannot weaken checks.

## 12. Immutability and references

The input is never mutated. Output arrays and objects share no nested references with input.

Repeated sibling references in direct object input are cloned independently. The result is JSON-tree semantics rather than preserving an application object graph.

The cloned JSON containers are intentionally mutable values; only the result envelope, limits and statistics are frozen. Later canonical constructors own domain-level immutability.

## 13. Deterministic paths

Examples:

```text
$
$.features
$.features[3]
$.features[3].controlPoints[1][0]
$["non-identifier key"]
```

The optional root path is application-provided context and must be non-empty. Object-key sorting ensures equal input content produces the same first failure path independent of insertion order.

## 14. Public API boundary

008A exports primitives but does not connect them to existing document parsing. Current behavior remains:

```text
parsePlotDocument()
serializePlotDocument()
PlotLibre.importDocument()
```

unchanged.

This separation is essential: adding a safety primitive is not the same as silently tightening accepted PlotJSON `1.0.0` input. 008C will preserve and report the historical normalization contract explicitly.

## 15. Validation coverage

Version tests cover:

- `0.0.0`, current version and safe large components;
- malformed and unsafe components;
- lexical-order traps;
- frozen parsed values;
- forged parsed records;
- bounded malformed-version error messages.

JSON-safety tests cover:

- primitives, nested arrays and objects;
- null-prototype normalization;
- `__proto__` and `constructor` keys;
- every prohibited primitive/object family;
- getter non-invocation for objects and arrays;
- symbol/hidden properties;
- sparse/custom arrays;
- direct/indirect cycles;
- repeated valid references;
- lexicographic first-error paths;
- 2,000-level iterative traversal;
- UTF-8 byte measurement;
- immutable statistics and limits;
- every limit category and semantic feature/control paths.

## 16. Next runtime slice

008B adds only:

```text
document/Definition migration step types
migration registry registration
strict graph validation
deterministic linear chain planning
immutable migration report types/test helpers
```

008B continues to exclude parser replacement, current-schema decode, Registry integration, Store replacement and MapLibre import changes.
