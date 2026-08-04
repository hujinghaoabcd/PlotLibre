# PlotLibre Milestone 006H Finalization — Route Multi-Head Group

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
实现 PR：`#29 Add route multi-head symbol group`  
合并时间：2026-07-30 03:23:18 UTC  
merge SHA：`e799b3263bc36410c4195225faad5d2fc36f494f`  
Workspace：`0.0.18`  
状态：已合并到 `main`；当前接手工作转入 Milestone 006I

## Completed in this milestone

- 新增 `arrow.route.bidirectional@1.0.0`；
- 新增 `arrow.route.double-head@1.0.0`；
- 两个 Definition 仅持久化 authored centre path；
- bidirectional route 将首尾 authored endpoints 保持为 exact tips；
- bidirectional route 输出一个 closed、counterclockwise、simple Polygon；
- double-head route 保留普通 route 的 exact primary objective/tip；
- secondary emphasis head 沿同一 sampled path 派生，并作为第二个 Polygon component 渲染；
- secondary head 不进入 Store、History、handles 或 PlotJSON；
- 两个 Definition 共享 `PathRibbonFrame` 和纯 route/head geometry；
- 两点直线与可变多点曲线路径均支持；
- Registry、public exports、RenderBundle 与 PlotJSON 覆盖完成；
- Playground selector 和样例总数增至 14；
- 14 类型 draft/committed 实际渲染矩阵完成；
- workspace 更新为 `0.0.18`；
- Node baseline 更新为 154；
- Chromium baseline 更新为 20；
- 算法、设计、README、路线图和 handover 文档在实现 PR 中更新；
- PR #29 最终无 unresolved review threads，并已合并到 `main`。

## Validation

```text
Final current-head run:      30510846019
Earlier implementation run:  30510457314
Handover-inclusive run:      30510686480
Node 20.19:                  success
Node 22:                     success
Node tests:                  154 passed / 0 failed
Chromium tests:              20 passed / 0 failed
14-type render matrix:       success
Typecheck/build:             success
Playground build:            success
Handover contract:           success
Unresolved review threads:   0
```

`main` 当前包含 merge SHA `e799b3263bc36410c4195225faad5d2fc36f494f`，因此 006H 不再处于待 Ready、待 merge 或待 compare 状态。

## Next tasks

1. 将现行文档统一到 006H 已合并的真实状态；
2. 将 `AGENTS.md` 和路线图的 active priority 转向 006I；
3. 更新严重落后的 Playground 文档；
4. 补全设计和算法索引；
5. 开始 Milestone 006I 闭合行动区域语义设计；
6. 优先冻结 `area.closed-curve` 与 `area.gathering-place` 的 canonical contracts；
7. 对 `area.route-loop` 先判断是否具有足够独立的方向语义，避免仅通过默认参数制造新符号；
8. 提取纯 closed-area frame，并保持 geometry 层无 MapLibre、Store、DOM 或 interaction 依赖；
9. 新区域符号在同一完整 slice 中覆盖 Registry、PlotJSON、Playground、Node、Chromium 和 handover；
10. 暂不增加更多 route-head variants，不返回 pincer hardening。

## Risks and decisions

- 006H 实现完成后缺少单独的 merged-state finalization handover，导致 `LATEST.md` 长期停留在待合并状态；
- README 与源码已经是 14 类型基线，但 `PLAYGROUND.md` 等文档仍停留在 8 类型阶段；
- `AGENTS.md` 与路线图仍把已合并 PR #29 写成 active work；
- workspace version 与各公共 package version 尚未统一；
- package manifests 仍为 `UNLICENSED`；
- Pages 源码与 workflow 已配置，但本 finalization 不声称重新人工打开并核验线上缓存；
- path reversal 对 bidirectional route 保证语义拓扑，不承诺不同局部投影原点下逐顶点完全相同；
- double-head secondary component 是 derived emphasis，不是第二个 authored objective；
- 每个 Polygon component 继续单独执行 finite、closed、winding 和 simple validation；
- 006I 不应把普通自由手绘 Polygon 当作参数化区域符号的 canonical model。
