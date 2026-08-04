# PlotLibre Milestone 007 Handover — Professional Editing Design

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
设计基线：`main@4ce59d189b65c8257bf49beabc308a4020249cd0`  
分支：`agent/007-professional-editing-design`  
Workspace：`0.0.20`  
状态：selection、transaction、translation、later editing slices 与测试边界已冻结为设计候选；无 runtime changes

## Purpose

Milestone 007 replaces the current single-selection/single-command editing foundation with a staged professional editing architecture while preserving authored controls as canonical state.

The design branch is documentation-only. It must not create SelectionController、Store transactions、batch commands、selection overlays、transform code or tests.

## Existing constraints found

Merged runtime currently has：

```text
one selectedId
single-feature Create/Delete/Replace commands
one Store event per mutation
synchronous Store listeners
CommandHistory pushes only after command.execute returns
primary authored handles only
```

Critical existing risk：

```text
Store mutation
→ listener throws
→ command.execute throws
→ history does not push
→ changed state without undo entry
```

007A must correct this before batch editing.

## Staged milestone scope

```text
007A selection + atomic batch commands + batch delete + local translation
007B box/lasso selection
007C local rotation + positive uniform scale
007D groups/locks/visibility/z-order after PlotJSON migration design
```

Only 007A belongs in the first implementation PR.

## Selection contract

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

Frozen invariants：

- selection is transient and excluded from PlotJSON；
- ids are unique existing Store ids；
- order is acquisition order；
- primary, when present, is the final selected id；
- empty selection has no primary；
- one effective operation emits one event；
- no-op emits nothing；
- Store remove/clear reconciles once；
- only primary exposes authored handles and Definition guides；
- secondary features expose lightweight selection overlays；
- `selectedId` remains a compatibility alias for primary selection。

Intent operations：

```text
replace
add
subtract
toggle
clear
make-primary
store-reconcile
```

MapLibre modifier mapping：

```text
plain click       replace / make primary
Shift             add
Ctrl or Cmd       toggle
Alt               subtract
empty plain click clear
```

## Atomic Store transaction

Proposed transaction categories：

```text
add
replace
remove
optional exact orderedIds
```

Algorithm：

```text
validate duplicate and cross-category ids
→ validate existence preconditions
→ clone ordered Store state
→ apply every operation to staged state
→ any error: no mutation
→ commit once
→ emit one immutable batch event
```

No listener may observe partial state.

Exact ordered state is required because batch delete undo must restore original document/render order. Appending restored features is invalid.

## Listener failure policy

After commit begins notification：

- invoke every listener；
- collect exceptions；
- report through `onListenerError`；
- do not synchronously throw across the committed command boundary；
- do not roll back after other listeners observed the commit；
- still record CommandHistory entry；
- semantic transaction validation errors continue throwing before mutation。

## BatchEditCommand

Command stores immutable：

```text
before/after features
before/after document order
before/after selection
label
```

Execute/redo applies exact after-state and after-selection. Undo applies exact before-state and before-selection. Redo does not increase revisions again.

One batch delete or pointer gesture creates one history entry.

## 007A translation contract

Initial translation is local-metre only.

```text
all selected authored controls
→ one coordinate analysis
→ one order-independent projection
→ one pointer meter delta
→ transform all authored controls
→ revision = original + 1
→ Registry canonicalize/generate every candidate
→ all valid: transient preview and one batch command
→ any invalid: no Store mutation
```

Frozen rules：

- parameters/style/metadata unchanged；
- same projection and delta for all features；
- antimeridian/high-latitude/large-extent selections reject；
- control handle priority > transform handle > object drag > selection click > camera drag；
- drag threshold = 4 CSS pixels；
- Escape cancels；
- zero local movement no-op；
- dragPan disabled only during active transform；
- preview preserves last valid batch and structured rejection。

Initial rejection codes：

```text
TRANSFORM_SELECTION_EMPTY
TRANSFORM_FEATURE_MISSING
TRANSFORM_FEATURE_LOCKED
TRANSFORM_UNSUPPORTED_COORDINATE_MODE
TRANSFORM_CANDIDATE_GENERATION_FAILED
TRANSFORM_TRANSACTION_INVALID
```

## Batch delete contract

```text
selected ids
→ one atomic remove transaction
→ afterSelection empty
```

Undo restores exact features、order、selection and primary. Redo restores exact after-state.

## Selection overlay contract

Candidate MapLibre resources：

```text
plotlibre-selection source
plotlibre-selection-line layer
plotlibre-selection-point layer
plotlibre-transform-guide layer
```

Overlay is transient. Polygon uses boundaries, LineString uses line, Point uses point, compound output is deduplicated by `plotId`. Only selected features are regenerated for overlay changes.

## Later slices

### 007B box/lasso

- default screen-space intersection policy；
- candidate ids deduplicated by `plotId`；
- result order normalized to Store/document order；
- exact contain policy deferred；
- simple lasso required；
- self-intersection rejects completion；
- spatial index required before large-document support。

### 007C rotation/scale

- local-metre only；
- pivot = selection authored-control bounds center；
- positive user rotation clockwise；
- positive uniform scale `[0.01, 100]`；
- no reflection/non-uniform scale；
- all-feature Registry preflight；
- parameters unchanged unless future Definition pure transform hook opts in。

### 007D canonical editor state

Groups、locks、visibility and z-order require formal PlotJSON schema and migration. Free-form metadata is prohibited as a shortcut.

## Reference and license review

```text
JamesLMilner/terra-draw
revision 26d7ec91f071ab5d2bdeab774d14763746cd798b
MIT License

geoman-io/maplibre-geoman
revision b177748cac826fc820ff7ea068186f8eb6e0fc3c
MIT License

mapbox/mapbox-gl-draw
revision cb0ca464872d8468f0b912a2321f2e0503718c52
ISC-style License
```

Studied behavior：selection mode lifecycle、programmatic select/deselect、whole-feature versus direct edit、drag/rotate/scale separation、keyboard configuration and tests。

Code reuse：`none`。

## Required 007A tests

Selection：

- replace/add/subtract/toggle/clear；
- acquisition order and primary fallback；
- duplicate/missing ids；
- Store reconciliation；
- one event per effective change；
- compatibility alias。

Store transaction：

- add/replace/remove combinations；
- precondition failures；
- no partial mutation；
- one batch event；
- listener error isolation；
- exact order restoration；
- exact revisions。

Batch command：

- execute/undo/redo exact state；
- selection restoration；
- delete/undo order；
- any invalid member rejects all。

Translation：

- mixed Arrow/Line/Area；
- one common meter delta；
- unchanged parameters；
- structured rejection；
- Escape and zero movement；
- drag arbitration；
- one gesture / one history entry。

Browser：

- modifier multi-selection；
- primary handles only；
- actual overlays；
- batch translation preview/commit；
- undo/redo；
- batch delete/undo；
- style reload；
- all merged 19-symbol/28-Chromium regressions。

## Performance design targets

```text
100 selected features:
  preview target >= 60 fps on documented reference desktop

1,000 document features:
  click adapter work < 16 ms
  box candidate query < 50 ms

10,000 document features:
  no full-document Registry regeneration for selection-only changes
  spatial index required before box/lasso performance claims
```

Measurements must record browser、hardware、feature mix and render complexity.

## Files in design slice

```text
docs/design/professional-editing.md
docs/algorithms/batch-edit-transaction.md
docs/design/README.md
docs/algorithms/README.md
docs/REFERENCE_LIBRARY_MATRIX.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
docs/handover/2026-08-04-milestone-007-professional-editing-design.md
```

## Design merge gate

```text
Node 20.19
Node 22
184 Node tests
28 Chromium tests
Playground build
handover contract
0 unresolved review threads
```

## Continuation

After the documentation-only design PR is squash merged, create：

```text
agent/007a-selection-batch-translation
```

Implementation order：

1. SelectionController；
2. Store batch transaction and listener isolation；
3. BatchEditCommand and ordered undo；
4. backward-compatible PlotLibre selection API；
5. selection overlays；
6. click multi-selection browser coverage；
7. batch delete/undo；
8. local translation preview/commit；
9. style reload and performance fixtures；
10. immutable 007A implementation handover。

Do not add box/lasso、rotation/scale、groups、snapping or new symbols to 007A。
