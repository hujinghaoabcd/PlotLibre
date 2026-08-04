# PlotLibre Development Handover — Milestone 007B Runtime Merged

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
当前 `main`：`f98483d3504ce464c93e5a03a49f7f856d1cc1a0`  
Workspace：`0.0.22`  
状态：box/lasso runtime、Playground 控件、真实浏览器验收与 pointer-capture 生命周期修复均已合入 `main`

完整不可变交接：

```text
docs/handover/2026-08-04-milestone-007b-box-lasso-runtime.md
```

## Current baseline

```text
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node.js:            20.19+
Node tests:         264
Chromium tests:     32
MapLibre GL JS:     6.0.0
MapLibre Sources:   4
MapLibre Layers:    10
007A:               merged through PR #38/#39
007B design:        merged through PR #40/#41
007B runtime:       merged through PR #42/#43
```

## Merge evidence

### PR #42 — runtime foundation

```text
validated head: 812183a47413bdac554fbd6ca75e1443026ac474
CI:             #437 / 30920263173
Node:           264 passed
Chromium:       30 passed
threads:        0 unresolved
squash SHA:     e18183df5be4b98c38ba177e8440b28e859c2c90
```

### PR #43 — Playground/browser finalization

```text
validated head: f7d9e107221d4ee3fc4278f697a7c0ba84d95a59
CI:             #445 / 30924648279
Node:           264 passed
Chromium:       32 passed
threads:        0 unresolved
squash SHA:     f98483d3504ce464c93e5a03a49f7f856d1cc1a0
```

After PR #43, `main` and `f98483d...` were explicitly compared and were identical.

## Implemented 007B behavior

- CSS-pixel box and lasso selection;
- Shift-empty additive box after a 4 px threshold;
- explicit one-shot box/lasso, default replace;
- add/toggle/subtract intent support;
- one-event `SelectionController.applyMany()`;
- MapLibre rendered index as broad phase only;
- Store-order candidate normalization;
- canonical Registry generation and exact projected semantic-geometry intersection;
- Point/Line/Polygon/Multi support with Polygon holes;
- fail-closed query/generation/projection;
- DOM/SVG region overlay with no new geographic Source/Layer;
- Escape/camera/style/resize/Store/selection/pointer lifecycle cancellation;
- direct retry after invalid explicit lasso;
- Playground `框选`、`套索`、`取消区域` controls and status feedback;
- real Chromium box and invalid-lasso retry flows.

Selection remains transient, outside PlotJSON and CommandHistory. Region paths and projected candidates are derived UI state.

## Browser-discovered correction

Intentional `releasePointerCapture()` emits `lostpointercapture` in Chromium. The controller now ignores that event after intentional pointer ownership release, preserving a new rejected state; unexpected loss while ownership is active still cancels.

## Next work

1. merge the documentation-only 0.0.22 finalization after unchanged 264/32 current-head CI;
2. produce a measured 100 / 1,000 / 10,000 feature benchmark before considering a persistent spatial index;
3. begin Milestone 007C rotation/positive-uniform-scale as a separate design branch;
4. keep groups/locks/visibility/z-order deferred until formal PlotJSON migration design.

No hard region-selection latency claim is currently published. Production bundle code splitting and coordinated package release remain cross-stage tasks.
