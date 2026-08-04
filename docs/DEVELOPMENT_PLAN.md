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

禁止编辑派生 GeoJSON 顶点代替 authored controls、部分批量提交、绕过 Registry generation preflight、在设计/收尾 PR 混入 runtime、使用旧 head CI 或发布未经测量的性能保证。

## 当前基线

```text
main SHA:          ace18bcd58466d2eadd2b647cb0e2b67a7b546b2
workspace:         0.0.22
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        264
Chromium tests:    32
MapLibre Sources:  4
MapLibre Layers:   10
benchmark job:     required
completed:         007A + 007B + 007B-P + 007C design
current slice:     007C design post-merge synchronization
current branch:    agent/007c-design-post-merge-finalization
runtime:           prohibited
next branch:       agent/007c-rotation-scale-runtime
```

## Milestones

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON、MapLibre、geometry、19 symbols | 已完成 |
| 007A | selection、atomic Store、delete、translation | PR #38/#39 |
| 007B | box/lasso design/runtime/Playground/docs | PR #40–#44 |
| 007B-P | resolver benchmark 与索引决策 | PR #45/#46 |
| 007C Design | shared-pivot rotation + positive uniform scale | PR #47 已合并 |
| 007C Runtime | pure math、session、MapLibre handles、Playground | 下一阶段 |
| 007D | groups/locks/visibility/z-order after PlotJSON migration | deferred |

## 007C design evidence

```text
PR:                   #47
validated head:       a19444d1c76cad266fe84e3e454afa6d146c7e4d
CI:                   #468 / 30936185645
Node 20.19 / 22:      success
Node tests:           264 passed
benchmark artifact:   8903197454
Chromium tests:       32 passed
threads:              0
squash SHA:           ace18bcd58466d2eadd2b647cb0e2b67a7b546b2
```

`main` was explicitly compared with the squash SHA and was identical.

## Frozen 007C contract

Authority：

```text
docs/design/rotation-uniform-scale.md
docs/algorithms/selection-local-transform.md
```

```text
all selected authored controls
→ one order-independent local-metre frame
→ fixed authored-control AABB-center pivot
→ clockwise rotation or positive uniform scale
→ canonicalize + Registry.generate every member
→ complete transient preview
→ one BatchEditCommand
```

Binding decisions：

- authored controls only；
- changed feature revision +1；
- parameters/style/metadata unchanged；
- positive clockwise angle；
- scale `[0.01,100]`；
- no reflection/non-uniform scale/skew/snapping；
- absolute parameter caps may prevent strict rendered similarity；
- explicit one-shot modes；
- DOM/SVG frame/pivot/handles；
- no new Source/Layer；
- transform and region modes mutually exclusive；
- all-member fail-closed preflight；
- exact undo/redo；
- unsupported local coordinate frames reject。

## 007C runtime implementation order

After this post-merge PR is validated and merged, create `agent/007c-rotation-scale-runtime` from final `main`：

1. shared local frame and pure rotation/scale functions；
2. engine-independent transform session and rejections；
3. all-Definition Registry fixtures；
4. BatchEditCommand preview/commit integration；
5. MapLibre explicit transform controller；
6. DOM/SVG frame、pivot and handles；
7. public APIs and Playground controls/status；
8. Chromium flows；
9. reproducible `1/100/1,000` transform benchmark；
10. runtime docs、handover、exact-head merge and post-merge synchronization。

## Runtime acceptance

Pure：frame order invariance、clockwise cardinal fixtures、angle unwrap、scale boundaries/no reflection、local-frame failures、no-op。

Registry/command：all 19 Definitions rotate；valid scale smoke；properties unchanged；one invalid member rejects all；exact revision/order/selection/undo/redo。

MapLibre/Chromium：explicit/mutually exclusive modes；DOM handles；pointer/dragPan lifecycle；rejection retry；multi-selection rotate/scale；region-select → transform → delete → undo；all historical 264/32 regressions。

Performance：measure at least `1/100/1,000` selected features；no hard SLA before measurement。

## Non-goals

Reflection、negative or non-uniform scale、skew、snapping、pivot dragging、touch transforms、groups/locks/visibility/z-order、new symbols、PlotJSON shortcuts、parameter-name heuristics。

## Cross-stage tasks

Open-source license、coordinated release、PlotJSON schema/migrations、docs/test consistency automation、real-browser performance、Playground code splitting、npm boundaries、source/build/deploy/live verification、branch cleanup documentation。
