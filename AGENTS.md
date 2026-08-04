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

## 3. Current merged baseline

```text
main SHA:           04dca0b120b1440afb49a300eeee92faf6644a7d
workspace:          0.0.21
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      219
Chromium baseline:  30
MapLibre Sources:   4
MapLibre Layers:    10
Milestone 007A:     merged through PR #38
validated head:     2d499a1cb122abbf6fce7548ec32f1b0031dd8f2
validated CI:       #409 / 30906467230
squash SHA:         04dca0b120b1440afb49a300eeee92faf6644a7d
```

The current `agent/007a-post-merge-finalization` branch is documentation-only. Runtime changes are prohibited on it.

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
interaction.select(id | undefined)
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

Undo must never restore deleted features by appending them.

## 7. Listener failure isolation

Store listener errors occur after commit and cannot safely trigger rollback after another listener has observed the state.

- validation and precondition errors throw before commit;
- every listener is invoked after commit;
- listener exceptions are collected;
- collected errors are reported through `onListenerError`;
- listener exceptions do not synchronously escape the committed transaction;
- CommandHistory records the committed command;
- renderer recovery may occur through explicit render or style reload.

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

Selection reconciliation is suspended during Store mutation and followed by one explicit final selection restoration. One completed gesture or batch action creates one History entry.

## 9. Whole-object translation

Whole-selection translation is local-metre only.

```text
selected authored controls
→ analyze one shared coordinate frame
→ derive one order-independent projection origin
→ pointer metre delta
→ add the same delta to every authored control
→ revision = original + 1
→ canonicalize/generate every candidate
→ all valid: preview/commit batch
→ any invalid: no Store or History mutation
```

Rules:

- parameters, style and metadata remain unchanged;
- all selected members use one projection and one delta;
- antimeridian/high-latitude/large-extent/non-finite selections reject;
- preview is transient and Store remains unchanged;
- Escape cancels;
- sub-threshold or zero movement creates no command;
- one pointer gesture creates one History entry;
- authored handle drag has priority;
- dragPan is disabled only during active translation and restored afterward.

## 10. Batch delete

Delete/Backspace and `removeSelected()` remove all selected features through one `BatchEditCommand`.

- after selection is empty;
- undo restores exact feature values, document order and previous selection/Primary;
- redo restores exact after-state;
- active drawing and handle editing retain key priority;
- lock-aware filtering remains deferred until formal lock semantics exist.

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
- compound output is de-duplicated;
- Primary is explicit transient overlay metadata;
- only Primary handles remain in `plotlibre-handles`;
- translation preview does not mutate Store;
- style reload reconstructs committed, selection, draft, handle and guide state.

## 12. Required validation

Current merged baseline:

```text
219 Node
30 Chromium
```

Coverage includes selection order/Primary/modifiers, transaction atomicity, listener isolation, exact ordered restoration, batch delete, local translation, invalid-member rejection, exact revision replay, actual overlays, style reload, Shift/box-zoom integration, real canvas body drag/Escape/Delete and all historical symbol regressions.

Every PR must pass on its exact current head:

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

## 13. Clean-room references

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Only observable selection/mode/transform behavior and test organization were studied. Code reuse: `none`.

## 14. Documentation and handover

Every completed design or implementation milestone:

- updates README and relevant authoritative docs;
- updates `docs/handover/LATEST.md`;
- adds one immutable dated handover;
- records exact branch, PR, tested head, CI and squash SHA;
- does not rewrite older immutable handovers;
- uses a documentation-only post-merge finalization when actual merge state must be synchronized.

`LATEST.md` must contain:

```text
## Current state
## Completed in this milestone
## Validation
## Next tasks
## Risks and decisions
```

## 15. Pull request and merge discipline

- branch from current `main`;
- keep PR Draft while incomplete;
- do not locally merge into `main`;
- resolve every actionable review thread;
- mark Ready only after exact current-head CI is green;
- use **Squash and merge** with `expected_head_sha`;
- delete merged branches when tooling permits;
- disclose branch-cleanup limitations;
- start subsequent work from the new latest `main`.

## 16. Next slices

007B — box/lasso selection:

- design before runtime;
- screen-space intersection selection first;
- candidate ids de-duplicated by `plotId`;
- deterministic Store/document ordering;
- contain policy deferred until exact projected containment exists;
- lasso must be simple and reject self-intersection;
- spatial indexing is required before large-document claims.

007C — rotation and scale:

- local-metre only initially;
- pivot from selection authored-control bounds;
- positive clockwise user rotation;
- positive uniform scale `[0.01, 100]`;
- no reflection or non-uniform scale;
- all candidates preflight atomically.

007D — groups, locks, visibility and z-order:

Do not hide canonical editor state inside arbitrary metadata. Formal PlotJSON schema, migration and command semantics must precede runtime fields.

## 17. Current continuation order

1. merge `agent/007a-post-merge-finalization` as documentation-only after full 219/30 CI;
2. create 007B design branch from the resulting latest `main`;
3. freeze box selection coordinate space, hit policy and ordering;
4. freeze lasso ring validation and self-intersection policy;
5. freeze `plotId` de-duplication and spatial-index boundary;
6. add deterministic design fixtures and clean-room evidence;
7. do not implement rotation/scale, groups/locks, snapping or new symbols in 007B;
8. do not add runtime to the post-merge finalization branch.
