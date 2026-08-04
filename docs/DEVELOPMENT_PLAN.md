# PlotLibre 开发路线图

## 总体策略

所有复杂符号族与专业编辑功能统一采用：

```text
设计冻结
→ 独立 runtime slice
→ current-head CI
→ immutable handover
→ Ready review
→ squash merge
→ documentation-only post-merge finalization
```

禁止：

- 编辑 rendered GeoJSON vertices 代替 authored controls；
- 部分 batch mutation；
- 绕过 Registry generation preflight；
- 把 canonical editor state 隐藏在任意 metadata；
- 在 design/finalization PR 中混入 runtime；
- 一个 PR 并行扩散多个复杂子系统；
- 使用旧 head CI 声明新 head 已通过；
- 未测量就发布性能保证或引入持久空间索引。

## 当前合并基线

```text
main SHA:          f98483d3504ce464c93e5a03a49f7f856d1cc1a0
workspace:         0.0.22
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        264
Chromium tests:    32
MapLibre Sources:  4
MapLibre Layers:   10
completed:         007A + 007B design/runtime/Playground validation
current slice:     007B documentation-only finalization
current branch:    agent/007b-docs-benchmark-finalization
runtime on branch: prohibited
```

## 007B merge evidence

### Runtime foundation

```text
PR:               #42
validated head:   812183a47413bdac554fbd6ca75e1443026ac474
CI:               #437 / 30920263173
Node 20.19/22:    success
Node tests:       264 passed
Chromium tests:   30 passed
threads:          0 unresolved
squash SHA:       e18183df5be4b98c38ba177e8440b28e859c2c90
```

### Playground/browser finalization

```text
PR:               #43
validated head:   f7d9e107221d4ee3fc4278f697a7c0ba84d95a59
CI:               #445 / 30924648279
Node 20.19/22:    success
Node tests:       264 passed
Chromium tests:   32 passed
threads:          0 unresolved
squash SHA:       f98483d3504ce464c93e5a03a49f7f856d1cc1a0
```

After PR #43, `main` was explicitly compared with `f98483d...` and was identical.

## 已完成里程碑

| 里程碑 | 主要成果 | 状态 |
|---|---|---|
| 001–004 | Workspace、Core、History、PlotJSON、MapLibre、geometry foundations | 已完成 |
| 005A–005H | 基础与复合 Arrow families | 已完成 |
| 006A–006D | pincer、canonical roles、structured rejection | 已完成 |
| 006E | squad combat | 已合并 |
| 006F–006G | route + corridor PathRibbon | 已合并 |
| 006H | bidirectional + double-head route | 已合并 |
| 006I | closed curve + gathering place | 已合并 |
| 006J | circular design、implementation、semantic guides | 已合并 |
| 007 Design | professional editing overall semantics | 已合并 |
| 007A | ordered selection、atomic Store、batch delete、local translation | PR #38/#39 已合并 |
| 007B Design | screen-space box/lasso semantics and algorithms | PR #40/#41 已合并 |
| 007B Runtime | screen algorithms、MapLibre resolver、DOM overlay、Playground、Chromium | PR #42/#43 已合并 |

## Milestone 007 总体拆分

```text
007A — ordered multi-selection + atomic Store + batch delete + local translation — merged
007B — exact screen-space box/lasso selection — merged
007B-P — measured 100/1,000/10,000 scale benchmark and indexing decision — next
007C — local rotation + positive uniform scale — design after benchmark slice
007D — groups/locks/visibility/z-order after PlotJSON migration design — deferred
```

## 007B 已实现契约

Authoritative documents：

```text
docs/design/box-lasso-selection.md
docs/algorithms/screen-region-selection.md
docs/handover/2026-08-04-milestone-007b-box-lasso-runtime.md
```

### Input ownership

- unified controller replaces immediate Shift-add-on-mousedown；
- `Shift + empty drag` = additive box；
- explicit one-shot box/lasso = default replace；
- configured intent plus modifier override supports add/toggle/subtract；
- intent captured on pointerdown；
- drawing、handle drag and translation retain priority；
- touch deferred。

### Box and lasso numbers

```text
box threshold:       4 CSS px
lasso spacing:       2 CSS px
minimum points:      3
minimum area:        16 CSS px²
RDP tolerance:       1.5 CSS px
```

Raw and simplified lasso paths both reject repeated non-consecutive vertices and non-adjacent crossing、touch or overlap. Invalid explicit lasso preserves selection and supports direct retry.

### One-event selection

```text
SelectionController.applyMany(ids, intent, "box" | "lasso")
```

- ids validated and deduplicated before mutation；
- results ordered by Store/document order；
- replace/add/subtract/toggle deterministic；
- one effective completion = one SelectionChange；
- no-op = no event；
- region selection remains outside History and PlotJSON。

### Broad/narrow pipeline

```text
region bbox
→ queryRenderedFeatures(committed fill/line/point layers)
→ plotId dedup
→ Store-order normalization
→ Registry.generate once per candidate
→ map.project semantic fills/lines/points
→ exact screen intersection
```

- MapLibre query is broad phase only；
- selection、draft、handle、guide、label and hit-area geometry excluded；
- Point、Line、Polygon、Multi and Polygon holes supported；
- CSS stroke/radius ignored；
- query/generation/projection failure rejects whole completion；
- partial selection prohibited。

### Overlay/lifecycle

- DOM/SVG screen overlay；
- no new Source/Layer；
- 4/10 renderer baseline retained；
- synthetic post-drag click suppressed；
- boxZoom、dragPan and pointer capture restored exactly once；
- Escape、pointer、camera、style、resize、Store、external selection and document lifecycle cancellation implemented；
- intentional pointer release cannot let `lostpointercapture` erase a rejected state；
- unexpected pointer loss while owned still cancels。

### Playground and browser validation

Playground exposes：

```text
框选
套索
取消区域
```

Real Chromium covers explicit box replace、overlay visibility/cleanup、invalid lasso rejection persistence、direct retry、Store-order result and Primary. Final baseline is 32 tests.

## 当前 documentation-only finalization

`agent/007b-docs-benchmark-finalization` may only:

- bump root workspace/demo baseline to 0.0.22；
- synchronize README、AGENTS、development plan and interaction documentation；
- record actual PR #42/#43 squash and CI evidence；
- add immutable runtime handover and update latest pointer；
- document benchmark as pending without invented data；
- pass unchanged 264/32 current-head CI。

Do not add selection runtime, new symbols, transforms, spatial indices or unrelated refactors.

## Next slice：007B-P measured performance

Create a separate branch from the final documentation `main`.

Required fixtures：

```text
100 features
1,000 features
10,000 features
```

Required reporting：

- hardware、OS、Node/browser and MapLibre versions；
- viewport、camera and device pixel ratio；
- feature-type mix and generated-vertex counts；
- Store size and broad-phase unique candidate count；
- query time；
- Registry generation and projection time；
- exact-intersection time；
- total latency；
- warmup and repetition count；
- median and p95；
- memory if available。

Decision after evidence：

```text
keep MapLibre rendered index only
or
introduce a documented persistent index with explicit invalidation
```

No public latency SLA exists before this slice.

## Milestone 007C：Rotation and scale

Design-only first：

- local-metre only initially；
- pivot = authored-control bounds center of the complete selection；
- positive clockwise user angle；
- positive uniform scale `[0.01, 100]`；
- no reflection or non-uniform scale；
- no Store mutation during preview；
- canonicalize and Registry-generate every candidate before one atomic batch command；
- exact undo/redo of feature values、document order and selection。

Do not implement 007C until its design PR freezes pivot、angle convention、handle geometry、failure policy and interaction priority.

## Milestone 007D：Canonical editor object state

Groups、locks、visibility and z-order require formal PlotJSON schema and migration before runtime. Arbitrary metadata shortcuts are prohibited.

## Runtime non-goals still in force

- new symbols inside professional-editing slices；
- snapping without its own design；
- touch region gestures；
- contain-only or persistent region modes；
- rotation/scale before 007C design；
- groups/locks before schema migration；
- unmeasured performance claims。

## Merge order for this finalization

1. finish authority docs、version and immutable handover；
2. open Draft documentation-only PR；
3. pass exact-head Node 20.19/22、264 Node、32 Chromium、build and handover；
4. confirm zero unresolved threads；
5. mark Ready and Squash and merge with expected head SHA；
6. verify `main` equals the returned squash SHA；
7. create benchmark work only from that final `main`。

## 跨阶段工程任务

1. decide open-source license；
2. coordinate workspace/public package versions and release workflow；
3. formal PlotJSON JSON Schema and migrations；
4. docs/Registry/test baseline consistency automation；
5. reproducible benchmark infrastructure；
6. npm package-boundary review；
7. Playground code splitting；
8. distinguish source/build/deploy/live verification；
9. branch deletion automation or documented manual cleanup。
