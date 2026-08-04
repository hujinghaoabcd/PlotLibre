# Batch Edit Transaction Algorithm Record

Milestone: 007 professional editing  
Status: design freeze candidate only  
Runtime implementation: prohibited on `agent/007-professional-editing-design`  
Code reuse: none

## 1. Purpose

This record defines the state and transaction algorithms needed for multi-selection, batch delete and authored-control translation while preserving PlotLibre's semantic source model.

Initial implementation slice:

```text
SelectionController
PlotStore.applyTransaction
BatchEditCommand
local-metre multi-feature translation
selection/transform overlays
```

## 2. Current failure mode

Current single-feature flow:

```text
command.execute()
→ PlotStore mutation
→ synchronous listeners
→ CommandHistory push
```

If a listener throws after Store mutation, `command.execute()` throws before history push. The document changes but no undo entry exists.

Batch editing cannot build on this behavior.

## 3. Selection data structure

Internal representation candidate:

```text
ordered ids: string[]
membership: Set<string>
primary: final ordered id or undefined
revision: integer
```

The Set provides membership checks. The array preserves acquisition order and deterministic primary fallback.

Normalization:

```text
input ids
→ remove duplicates by first occurrence
→ validate existence/selectability
→ remove invalid ids or fail according to API contract
→ ensure primary belongs to ids
→ move primary to final position
→ freeze snapshot
```

Programmatic APIs should fail on missing ids rather than silently produce partial selection. Store reconciliation is the only path that silently drops ids because the features were removed by a committed transaction.

## 4. Selection operation algorithms

### Replace

```text
normalize requested ids
→ if equal to current snapshot: no-op
→ selectedIds = normalized ids
→ primary = requested primary or final id
→ revision + 1
→ emit one change
```

### Add

```text
for id in requested order:
  if absent: append
primary = final newly added id
if no id added and requested final id already selected:
  make that id primary
```

### Subtract

```text
remove requested ids
if primary removed:
  primary = final surviving id
```

### Toggle

```text
if id selected:
  remove it
else:
  append it and make primary
```

### Reconcile

```text
Store batch change
→ filter selectedIds by Store.has
→ preserve surviving order
→ primary = previous primary if surviving, otherwise final surviving id
→ emit at most one store-reconcile event
```

## 5. Transaction staging

Proposed Store operation categories:

```text
add
replace
remove
```

Validation set construction:

```text
addIds = unique ids of add features
replaceIds = unique ids of replace features
removeIds = unique removal ids
```

Reject if any id appears in more than one set.

Preconditions:

```text
add id      must not exist
replace id  must exist
remove id   must exist
```

Staging:

```text
staged = clone(current feature Map)
apply removals
apply replacements
apply additions
```

Feature values are cloned when entering the staged map. Store state remains untouched until all operations finish.

Commit:

```text
replace internal Map contents from staged
emit one immutable batch change
```

Document order policy:

- unchanged features retain relative order;
- replacements retain their existing positions;
- removals disappear;
- additions append in transaction input order;
- future z-order operations require a separate explicit reorder transaction.

## 6. Batch change event

```ts
interface PlotStoreBatchChange {
  readonly type: "batch";
  readonly ids: readonly string[];
  readonly addedIds: readonly string[];
  readonly updatedIds: readonly string[];
  readonly removedIds: readonly string[];
}
```

Ordering:

- each category follows deterministic Store/document order where possible;
- added ids follow input order;
- `ids` is the de-duplicated concatenation of removed, updated and added ids;
- consumers must not infer operation ordering from listener invocation order.

Existing single-operation events may remain for compatibility when existing `add/update/remove` APIs are called. Batch editing uses only the batch event.

## 7. Listener failure isolation

Notification is outside the atomic mutation decision.

Algorithm:

```text
commit Store state
errors = []
for listener in listener snapshot:
  try listener(change)
  catch error: errors.push(error)
if errors not empty:
  onListenerError(errors, change)
return committed change
```

Rules:

- one listener cannot prevent later listeners from running;
- errors do not escape `applyTransaction` after commit;
- errors do not prevent CommandHistory from recording the command;
- mutation precondition/validation failures still throw before commit;
- default error handler reports without synchronously throwing;
- renderer may recover by explicit render or style reload.

## 8. Registry preflight

Store is not responsible for plot semantics. A batch edit coordinator performs:

```text
build all candidate PlotFeatures
→ canonicalize every feature through Registry
→ Registry.validate/generate every feature
→ any invalid: reject entire batch
→ all valid: construct BatchEditCommand
```

The Store transaction never receives a partially validated feature set.

Preflight ordering is deterministic by selection/document order. Rejection includes every failing feature id, but no feature is committed.

## 9. BatchEditCommand state

Command captures immutable snapshots:

```text
before removed/replaced features
after added/replaced features
before selection
after selection
label
```

Execution plan is precomputed.

### Execute/redo

```text
Store.applyTransaction(after transaction)
SelectionController.restore(after selection)
```

### Undo

```text
Store.applyTransaction(inverse transaction)
SelectionController.restore(before selection)
```

Redo uses exact stored after features and revisions. It does not regenerate revisions.

## 10. Batch delete transaction

Before:

```text
features = selected features in document order
selection = current snapshot
```

After:

```text
features removed
selection empty
```

Undo restores exact feature values/order and the prior selection snapshot. To preserve original document order, the transaction model may need indexed insertion or a complete ordered after-state representation. This must be implemented before batch delete is considered complete.

A simplistic append-on-undo is not acceptable because it changes rendering/z-order semantics.

## 11. Ordered Store requirement

The current Map preserves insertion order but cannot restore removed features to arbitrary positions through simple `add`.

Implementation options:

1. transaction stores the entire ordered feature-id sequence before and after;
2. Store exposes indexed insertion/reorder operations;
3. Store stages a complete ordered Map from command snapshots.

Recommended 007A design:

```text
PlotStoreTransaction includes optional orderedIds
```

Rules:

- `orderedIds` must contain every post-transaction feature exactly once;
- no unknown or duplicate ids;
- if omitted, normal replacement/removal/append ordering applies;
- batch delete undo supplies the exact before-order;
- translation does not need `orderedIds` because replacements retain positions.

## 12. Translation frame

Input controls across all selected features:

```text
C = concatenated authored controls in document order
```

Reject empty `C`.

Coordinate analysis:

- finite WGS84 controls;
- no antimeridian crossing;
- maximum absolute latitude <= local policy;
- maximum pairwise/document extent <= local policy.

Projection origin candidate:

```text
longitude = circular mean of all authored longitudes
latitude = arithmetic mean of all authored latitudes
```

This is deterministic and independent of selection acquisition order.

Pointer delta:

```text
startLocal = project(pointerDown)
currentLocal = project(pointerCurrent)
delta = currentLocal - startLocal
```

For every authored control:

```text
translatedLocal = project(control) + delta
translatedWgs84 = unproject(translatedLocal)
```

All features use the same projection and delta.

## 13. Translation preview

Immutable gesture state:

```text
original features
original selection
projection
pointer-down local point
last-valid candidate features
last rejection
```

On pointer move:

```text
compute delta
→ transform all authored controls
→ revision = original revision + 1
→ Registry canonicalize/generate all candidates
→ all valid: replace last-valid preview, clear rejection
→ any invalid: preserve previous valid preview, set structured rejection
```

Preview never writes Store or History.

On pointer up:

- below drag threshold: treat as click, no command;
- zero effective delta: no command;
- valid candidate: one BatchEditCommand;
- invalid candidate: no mutation and retain actionable rejection;
- Escape: clear preview and restore overlays.

## 14. Numeric tolerance

Translation no-op tolerance must be expressed in local metres, not raw longitude/latitude.

Candidate:

```text
movement length <= 1e-6 m → no-op
```

Pointer drag threshold remains a UI value:

```text
4 CSS pixels
```

The two tolerances serve different purposes and must not be conflated.

## 15. Overlay generation

Selection overlay is derived from Registry render output but must not duplicate every fill.

Candidate conversion:

- Polygon/MultiPolygon: outline boundaries only;
- LineString/MultiLineString: line geometry;
- Point: point geometry;
- compound output: include relevant components and de-duplicate by render id;
- primary flag stored in overlay properties;
- selection bounds derived from authored controls or projected overlay, never persisted.

The adapter may cache overlay bundles by:

```text
feature id + revision + primary flag
```

Selection-only changes must not call Registry.generate for every document feature; only selected ids are processed.

## 16. Hit testing and gesture arbitration

Hit result priority:

```text
control handle
transform handle
selected overlay / committed feature
empty map
```

MapLibre candidate results are de-duplicated by `plotId` and resolved in visual top-to-bottom order for single-click targeting. Selection-set ordering still follows acquisition order.

Modifiers are read from the original pointer event and normalized by the adapter into engine-independent intent:

```text
replace
add
subtract
toggle
```

The SelectionController does not inspect browser-specific modifier keys.

## 17. Box-selection candidate ordering

MapLibre `queryRenderedFeatures` ordering is engine/render dependent. A box result must be normalized:

```text
candidate plotIds
→ de-duplicate
→ filter Store existence/selectability
→ order by PlotStore document order
```

This makes selection snapshots deterministic across tiles and render-component duplication.

## 18. Lasso validation

Screen-space lasso path processing candidate:

```text
raw pointer samples
→ remove adjacent duplicates
→ simplify with fixed pixel tolerance
→ require >= 3 distinct vertices
→ close ring
→ validate finite/simple ring
```

Self-intersection rejects completion; no automatic polygon repair.

The lasso geometry is transient and must not use geographic projection until candidate feature hit testing requires it.

## 19. Rotation transform

Given local pivot `P`, control `X`, clockwise user angle `α`:

Convert to Cartesian counterclockwise angle:

```text
θ = -α
```

Then:

```text
x' = Px + cosθ (Xx - Px) - sinθ (Xy - Py)
y' = Py + sinθ (Xx - Px) + cosθ (Xy - Py)
```

Unproject to WGS84, then canonicalize/generate every feature.

All selected features share the same pivot and angle.

## 20. Uniform scale transform

For positive factor `s` and pivot `P`:

```text
X' = P + s (X - P)
```

Reject:

- non-finite factor;
- factor outside `[0.01, 100]`;
- candidate coordinate-mode violation;
- any Definition generation failure.

No negative/reflection or non-uniform scale in 007C.

## 21. Parameter transformation

Translation leaves parameters unchanged.

Rotation usually leaves parameters unchanged.

Scale may require Definition-specific semantic parameter updates. Hidden name-based heuristics such as scaling every key ending in `Width` are prohibited.

Future pure hook candidate:

```ts
interface TransformParametersContext {
  readonly feature: PlotFeature;
  readonly kind: "translate" | "rotate" | "scale";
  readonly scaleFactor?: number;
  readonly rotationDegrees?: number;
}
```

A Definition without the hook keeps parameters unchanged. The hook is versioned public behavior and requires fixtures.

## 22. Test vectors before runtime

Freeze fixtures for:

- selection acquisition and primary fallback;
- batch Store ordering;
- listener exception isolation;
- delete/undo exact order restoration;
- mixed circular/Arrow/closed-area translation;
- identical local delta across every control;
- invalid one-member rollback;
- revision execute/undo/redo;
- style reload overlays;
- screen modifier normalization;
- box result de-duplication and Store ordering;
- rotation/scale pivot formulas;
- 100/1,000/10,000 feature performance measurements.

## 23. Clean-room references

Fixed revisions and licenses:

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b
MIT License

geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c
MIT License

mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52
ISC-style License
```

Studied only for observable mode separation, selection lifecycle, keyboard configuration, drag/rotate/scale behavior and test organization.

Code reuse: none.

## 24. Implementation order

After design PR merge:

1. SelectionController and tests;
2. Store transaction and listener isolation;
3. BatchEditCommand and ordered undo fixtures;
4. PlotLibre selection API compatibility;
5. selection overlay renderer;
6. click multi-selection browser tests;
7. batch delete/undo;
8. local translation preview and commit;
9. style reload and performance fixtures;
10. immutable 007A handover;
11. current-head green before merge.

Box/lasso and rotation/scale must remain in later PRs.
