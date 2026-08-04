# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical feature state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Rendered geometry, samples, inferred frames, selection overlays, transform previews and semantic guides are derived output. They must never replace authored state or be serialized as canonical PlotJSON.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

- Core cannot depend on MapLibre or DOM;
- geometry cannot depend on Store, UI, events or map engines;
- interaction state and commands remain engine-independent;
- MapLibre translates semantic state and gestures;
- Playground consumes public APIs only;
- circular dependencies are prohibited.

## 3. Current 007A candidate baseline

```text
workspace:          0.0.21
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      219
Chromium baseline:  30
MapLibre Sources:   4
MapLibre Layers:    10
PR:                 #38
branch:             agent/007a-selection-batch-translation
```

The runtime slice was validated on head `07449e7fda66069b148fa08c865b209d7dc365a3` by CI run #398 before documentation synchronization. The final documentation head must receive a new full current-head CI run before Ready or merge.

No new public symbol is part of 007A.

## 4. Selection state boundary

Selection is transient interaction state, not PlotJSON document state.

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

Invariants:

- ids are unique existing feature ids;
- order is acquisition order;
- `primaryId`, when present, is the final selected id;
- empty selection has no primary;
- one effective operation emits one immutable change;
- no-op operations emit nothing;
- Store remove/clear reconciles once;
- only Primary exposes authored handles and Definition guides;
- all selected features may expose lightweight derived overlays;
- selection does not increment PlotFeature revision;
- selection is excluded from PlotJSON;
- restoring historical membership issues a fresh monotonic interaction revision.

## 5. Selection operations

Engine-independent operations:

```text
replace
add
subtract
toggle
clear
make-primary
store-reconcile
history-restore
```

MapLibre normalization:

```text
plain click       → replace / make-primary
Shift             → add
Ctrl or Cmd       → toggle
Alt               → subtract
empty plain click → clear
```

PlotLibre reserves Shift for additive selection while installed. MapLibre box zoom is disabled only for the PlotLibre lifecycle and restored to its previous enabled state on destroy.

The `SelectionController` must not inspect DOM or MapLibre event classes. Browser modifier normalization remains in the adapter.

Backward compatibility:

```text
plot.select(id | undefined)
plot.selectedId
interaction.selectedId
```

remain single-selection/Primary aliases. `selectedIds` is the complete ordered public selection.

## 6. Atomic Store transactions

`PlotStore.applyTransaction()` stages:

```text
add
replace
remove
optional exact orderedIds
```

Rules:

1. validate duplicate and cross-operation ids before mutation;
2. added ids must not already exist;
3. replaced and removed ids must exist;
4. clone the current ordered state;
5. apply all changes to the staged state;
6. validate exact ordering against the final staged id set;
7. any error means no Store mutation and no event;
8. commit once;
9. emit one batch event;
10. no listener observes partial state;
11. exact feature order is restorable on undo.

Undo must never restore deleted features by appending them, because that changes document/render order.

## 7. Listener failure isolation

Store listener errors occur after commit and therefore cannot safely trigger rollback after another listener has observed the state.

Frozen policy:

- validation and precondition errors throw before commit;
- after commit, every listener is invoked;
- listener exceptions are collected;
- collected errors are reported through `onListenerError`;
- listener exceptions do not synchronously escape the committed transaction;
- CommandHistory records the committed command;
- renderer recovery may occur through explicit render or style reload.

This prevents changed Store state without a History entry.

## 8. BatchEditCommand

The engine-independent command stores exact:

```text
before features
after features
before document order
after document order
before selection
after selection
label
```

Execute/redo applies exact after-state and after-selection. Undo applies exact before-state and before-selection. Redo replays stored revisions and must not increment them again.

Selection reconciliation is suspended during the Store transaction so execute, undo and redo each publish one explicit final selection change rather than intermediate removals.

One completed gesture or batch action creates one History entry.

## 9. Whole-selection translation

007A translation is local-metre only.

```text
selected authored controls
→ analyze one shared coordinate frame
→ derive one order-independent projection origin
→ convert pointer start/end into that frame
→ add one common metre delta to every authored control
→ revision = original revision + 1
→ canonicalize and generate every candidate
→ all valid: preview and one atomic commit
→ any invalid: no Store or History mutation
```

Rules:

- parameters, style and metadata remain unchanged;
- all selected members use one projection and one delta;
- antimeridian, high-latitude, large-extent or non-finite selections reject;
- preview is transient and Store remains unchanged;
- Escape cancels the complete preview;
- movement below the configured CSS-pixel threshold remains a click;
- zero local movement creates no command;
- one pointer gesture creates one History entry;
- authored handle drag has priority over object-body translation;
- dragPan is disabled only during an active transform and restored afterward;
- every candidate receives full Registry canonicalization/generation preflight before commit.

## 10. Batch delete

Delete/Backspace and the Playground action remove all selected features through one `BatchEditCommand`.

- after-selection is empty;
- undo restores exact feature values, document order, selected ids and Primary;
- redo restores exact after-state;
- active drawing and authored-handle editing retain their existing key behavior and take priority;
- lock-aware filtering is deferred until formal lock semantics exist.

## 11. MapLibre derived resources

Sources:

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

Layers:

```text
plotlibre-fill
plotlibre-line
plotlibre-point
plotlibre-selection-line
plotlibre-selection-point
plotlibre-draft-fill
plotlibre-draft-line
plotlibre-draft-point
plotlibre-handle-guide
plotlibre-handle
```

Selection overlay rules:

- Polygon renders boundary highlight;
- LineString renders line highlight;
- Point renders point highlight;
- compound output is de-duplicated by semantic geometry/`plotId`;
- Primary is explicit derived metadata;
- only Primary handles remain in `plotlibre-handles`;
- translation preview reuses derived selection rendering and does not mutate Store;
- style reload reconstructs committed, selection, draft, handle and guide state from canonical data.

## 12. Public API compatibility

The following are stable compatibility surfaces during 007A:

```text
plot.select(id | undefined)
plot.selectedId
interaction.select(id | undefined)
interaction.selectedId
```

New surfaces include ordered `selectedIds`, `selection`, `removeSelected()` and translation state. Do not remove single-selection aliases without a separately designed deprecation and migration milestone.

## 13. Required validation

Current candidate baseline:

```text
219 Node
30 Chromium
```

Coverage includes:

- selection ordering, Primary fallback, immutable snapshots and modifier intents;
- Store transaction preconditions and no partial mutation;
- one batch event and listener-error isolation;
- exact ordered restoration;
- batch delete execute/undo/redo and selection restoration;
- local translation common metre delta and unchanged non-coordinate state;
- invalid one-member atomic rejection;
- exact revision replay across execute/undo/redo;
- actual MapLibre selection overlays and batch preview;
- style reload resource restoration;
- Shift/box-zoom integration;
- real canvas multi-selection, body drag, Escape and Delete flows;
- all historical symbol/drawing regressions.

Before merge, the exact final head must pass:

```text
Node 20.19 validation
Node 22 validation
all Node tests
Playground TypeScript and /PlotLibre/ build
handover contract
all Chromium E2E
zero unresolved review threads
```

Never claim CI is green based on an earlier head.

## 14. Clean-room references

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Only observable selection/mode/transform behavior and test organization were studied. Code reuse: `none`.

## 15. Documentation and handover

Every completed design or implementation milestone:

- updates `README.md` and relevant authoritative docs;
- updates `docs/handover/LATEST.md`;
- adds one immutable dated handover;
- records exact branch, PR, tested head and CI evidence;
- does not rewrite older immutable handovers;
- may require a small post-merge documentation PR to record the actual squash merge SHA.

`LATEST.md` must contain:

```text
## Current state
## Completed in this milestone
## Validation
## Next tasks
## Risks and decisions
```

## 16. Pull request and merge discipline

- work on a feature branch created from current `main`;
- keep the PR Draft while implementation or documentation is incomplete;
- do not locally merge the branch into `main`;
- resolve every actionable review thread;
- mark Ready only after exact current-head CI is green;
- merge with **Squash and merge** and `expected_head_sha`;
- delete the merged feature branch when tooling permits;
- if branch deletion is unavailable, disclose that limitation;
- create subsequent work from the new latest `main`.

## 17. Next slices

007A explicitly excludes box/lasso selection, rotation/scale, groups, locks, visibility, z-order, snapping and new symbols.

### 007B — box/lasso selection

Design before runtime. Initial direction:

- screen-space intersection selection;
- candidate ids de-duplicated by `plotId`;
- deterministic Store/document ordering;
- contain policy deferred until exact projected containment exists;
- lasso must be simple and reject self-intersection;
- spatial indexing is required before claiming large-document support.

### 007C — rotation and scale

- local-metre only initially;
- pivot based on selection authored-control bounds;
- documented clockwise UI angle conversion;
- positive uniform scale `[0.01, 100]`;
- no reflection or non-uniform scale;
- all candidates preflight atomically;
- parameters remain unchanged unless a future Definition explicitly opts into a pure transform hook.

### 007D — groups, locks, visibility and z-order

Do not hide canonical editor state inside arbitrary metadata. Formal PlotJSON schema, migration and command semantics must precede runtime fields.

## 18. Current continuation order

1. finish 007A documentation and immutable handover on PR #38;
2. run full CI on the final documentation head;
3. confirm zero unresolved review threads;
4. mark PR #38 Ready;
5. Squash and merge with the exact expected head SHA;
6. record the actual merge SHA in a documentation-only finalization PR if required;
7. start 007B design only from the latest merged `main`.
