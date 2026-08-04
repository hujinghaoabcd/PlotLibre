# PlotLibre 开发路线图

## 工程流程

```text
设计冻结
→ 独立 runtime PR
→ exact-head CI
→ immutable handover
→ Ready
→ squash merge
→ post-merge authority synchronization
```

禁止编辑派生 GeoJSON 顶点代替 authored controls、部分批量提交、绕过 Registry generation preflight、在设计 PR 混入 runtime、使用旧 head CI 或发布未经测量的性能保证。

## 当前基线

```text
main SHA:          349a09160ac2e17883e2270123d371c164ef28c2
workspace:         0.0.22
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        264
Chromium tests:    32
MapLibre Sources:  4
MapLibre Layers:   10
benchmark job:     required
completed:         007A + 007B + 007B-P
current slice:     007C rotation + positive uniform scale design
current branch:    agent/007c-rotation-scale-design
runtime:           prohibited
```

## Milestones

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON、MapLibre、geometry、19 symbols | 已完成 |
| 007A | ordered selection、atomic Store、delete、translation | PR #38/#39 |
| 007B | box/lasso design、runtime、Playground、docs | PR #40–#44 |
| 007B-P | resolver benchmark 与索引决策 | PR #45/#46 |
| 007C Design | shared-pivot rotation + positive uniform scale | 当前进行中 |
| 007C Runtime | pure math、session、MapLibre handles、Playground | 设计合并后 |
| 007D | groups/locks/visibility/z-order after PlotJSON migration | deferred |

## 007B-P retained decision

Measured all-candidate pressure profile：

| 唯一候选 | median | p95 |
|---:|---:|---:|
| 100 | 2.399 ms | 5.308 ms |
| 1,000 | 10.961 ms | 18.246 ms |
| 10,000 | 109.308 ms | 119.182 ms |

Current decision：retain MapLibre rendered-index broad phase；do not add a persistent custom index without real Chromium/MapLibre data、varied candidate ratios、mixed symbols、clear budget and complete invalidation semantics。

## 007C frozen design direction

Authority：

```text
docs/design/rotation-uniform-scale.md
docs/algorithms/selection-local-transform.md
```

### Canonical state

- transform authored controls only；
- preserve id、plotType、parameters、style、metadata；
- changed revision = original + 1；
- preserve document order、selection order and Primary；
- one valid gesture = one BatchEditCommand；
- no partial preview/commit。

### Shared frame and pivot

```text
all selected authored controls
→ validate one local coordinate domain
→ order-independent seed
→ one local projection
→ local authored-control AABB
→ fixed AABB-center pivot
```

Reject empty/missing/invalid/antimeridian/high-latitude/large-extent/degenerate frames before arming。

### Rotation

```text
x' = px + cosθ(x-px) + sinθ(y-py)
y' = py - sinθ(x-px) + cosθ(y-py)
```

User-positive angle is clockwise. Pointer vectors are converted through `map.unproject()` into the fixed local frame. Successive signed deltas are accumulated across ±180°。No snapping。

### Positive uniform scale

```text
k = current local radius / start local radius
x' = px + k(x-px)
y' = py + k(y-py)
0.01 <= k <= 100
```

Out-of-range rejects rather than clamps. No reflection、negative scale、non-uniform scale、skew or snapping。

### Parameter policy

Parameters/style/metadata remain unchanged. Absolute caps such as `minimumWidthMeters` and `maximumWidthMeters` mean strict rendered similarity is not guaranteed when a cap becomes active. Registry generation is authoritative. Parameter-transform hooks are deferred。

### Explicit modes and overlay

Candidate APIs：

```text
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
plot.selectionTransformSnapshot
```

Use one DOM/SVG overlay with local-frame quadrilateral、pivot、scale handle、28 px rotation handle and transient value label. No new MapLibre Source/Layer. A 24 px minimum visual frame cannot change canonical math。

### Gesture priority

```text
active drawing
> authored handle
> active transform
> active region
> armed transform handle
> armed region
> Shift-empty box
> body translation
> click
> camera
```

Transform and region modes are mutually exclusive. Body translation is disabled while transform mode is armed。

### Preflight and lifecycle

Every complete candidate set is canonicalized and Registry-generated before preview. Failure preserves the last-valid complete preview and a structured rejection. Success exits explicit mode；invalid completion remains armed for retry。

Cancel on Escape、pointer loss、style/resize、active-drag camera movement、Store/selection/document lifecycle changes or destroy。

## 007C design merge gate

```text
Markdown/design only
Node 20.19 / 22
264 Node tests
Playground build
handover contract
benchmark job + artifact
32 Chromium tests
0 unresolved review threads
```

## 007C runtime order

After design merge and documentation-only post-merge synchronization：

1. shared frame + pure rotation/scale functions；
2. transform session and rejections；
3. all-Definition Registry fixtures；
4. MapLibre explicit controller；
5. DOM/SVG overlay and handles；
6. BatchEditCommand preview/commit integration；
7. public APIs and Playground；
8. Chromium flows and `1/100/1,000` transform benchmark；
9. immutable runtime handover and exact-head merge。

## Non-goals

Runtime on design branch；reflection；non-uniform scale；groups/locks/visibility/z-order；snapping；touch transforms；new symbols；PlotJSON shortcuts；parameter heuristics。

## Cross-stage tasks

Open-source license、coordinated release、PlotJSON schema/migrations、docs/test consistency automation、real-browser performance、Playground code splitting、npm boundaries、source/build/deploy/live verification、branch cleanup documentation。
