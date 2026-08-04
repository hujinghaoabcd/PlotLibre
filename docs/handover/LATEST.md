# PlotLibre Development Handover — Milestone 006I Merged / 006J Design Next

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
当前 `main`：`f873052d44a98f7029f0eda27ea70cda8b1af347`  
已合并 PR：`#31 Add closed action area symbol group`  
合并方式：squash  
Post-merge 分支：`agent/006i-post-merge-finalization`  
Workspace：`0.0.19`  
状态：Milestone 006I 已合并到 `main`；当前仅同步合并后权威状态，下一实现阶段为 006J 语义设计

## Current state

```text
workspace:          0.0.19
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     16
public Arrow types: 14
public Area types:  2
Node tests:         163
Chromium tests:     23
main SHA:           f873052d44a98f7029f0eda27ea70cda8b1af347
merged PR:          #31
next milestone:     006J arc / sector / lune semantic design
```

当前公共 Definitions：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
arrow.pincer
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
area.closed-curve
area.gathering-place
```

Canonical state 仍为：

```text
plot definition + authored control points + parameters + style + metadata
```

闭合重复点、周期曲线采样、winding normalization、gathering rear anchor 和 Polygon coordinates 均为派生数据。

## Completed in this milestone

- 冻结并实现 `area.closed-curve@1.0.0`；
- 冻结并实现 `area.gathering-place@1.0.0`；
- 将 `area.route-loop` 延期，避免没有独立语义的公共别名；
- 增加 pure periodic Hermite/Catmull–Rom closed-area geometry；
- 使用 circular longitude mean + mean latitude 建立与遍历顺序无关的局部投影中心；
- 保证每个 authored control 被曲线插值；
- 自动闭合并规范化 counterclockwise simple ring；
- duplicate、degenerate、invalid parameter 和 self-intersection fail closed；
- gathering-place 仅允许两个 flank 的 permutation-only canonicalization；
- derived rear anchor 不进入 Store、History、handles 或 PlotJSON；
- 增加独立 `DEFAULT_AREA_STYLE`；
- 保留 `arrowSymbols` 并新增 `areaSymbols`；
- `builtInSymbols` 从 14 扩展到 16；
- Node tests 从 154 增至 163；
- Chromium tests 从 20 增至 23；
- Playground 增加两类 selector、两类南京样例和独立交互提示；
- 生产和无底图模式加载完整 16 类样例；
- 基础 `?e2e=1` 保留原九类 selector compatibility surface；
- extended E2E 增加 `areas=1`；
- 修复 generic/specialized listener 顺序，保留 actionable rejection guidance；
- root workspace 提升到 `0.0.19`；
- 完成 README、AGENTS、路线图、Playground、interaction、design、algorithm 和 immutable handover；
- PR #31 在 current-head CI 全绿、0 个未解决线程后标记 Ready；
- PR #31 使用 expected head SHA squash 合并；
- 实际 squash merge SHA 为 `f873052d44a98f7029f0eda27ea70cda8b1af347`。

## Validation

最终 PR head 验证：

```text
GitHub Actions run: 30883623452 (#294)
validated head SHA: d39657ebbd0d450a8bb184a30dbc6d014821a913
Node 20.19:         success
Node 22:            success
TypeScript:         success
Node tests:         163 passed / 0 failed
Playground typecheck: success
Playground build:   success
handover contract:  success
Chromium tests:     23 passed / 0 failed
unresolved threads: 0
```

前一实现候选 run `#292` 也独立完成 163 Node / 23 Chromium 全绿。run #294 验证了包含 immutable handover 的最终 PR head，是实际 Ready 和 squash merge 门槛。

本 post-merge finalization 只修改权威 Markdown 状态并增加合并记录，不改变 runtime、geometry、Definitions、interaction、Playground 或 tests。该 finalization 仍需在自己的 PR 中通过完整 CI 后进入 `main`。

## Next tasks

1. 完成 `agent/006i-post-merge-finalization` 的文档一致性修复；
2. 为该分支创建 Draft PR；
3. 通过 Node 20.19、Node 22、163 Node、23 Chromium、build 和 handover contract；
4. 全绿后 squash 合并 post-merge finalization；
5. 从最终 `main` 创建 `agent/006j-arc-sector-lune-design`；
6. 先研究并冻结 `area.arc`、`area.sector`、`area.lune` 的独立语义；
7. 明确 center、radius、start/end bearing、arc direction 和 output type；
8. 明确 local-metre / geodesic、antimeridian 和 high-latitude policy；
9. 语义、控制点角色和拓扑未冻结前不写 006J geometry；
10. 不返回 pincer hardening，不增加 route-head variants。

## Risks and decisions

- 当前 packages 仍为 `UNLICENSED`，正式 npm release 前必须决定许可证；
- root workspace 为 `0.0.19`，公共 package versions 尚未统一；
- PlotJSON 1.0 尚缺正式 JSON Schema 和 migration framework；
- Store/History 尚无多对象事务、持久化或通用 rollback；
- closed-area 1.0 使用局部米制投影，不承诺全球尺度、极区或模糊反经线输入；
- `area.closed-curve` 的 canonical order 不因 winding normalization 被重写；
- `area.gathering-place` 的 crown 固定为 index 1，只有 flank pair 可交换；
- sampled ring、closing duplicate 和 rear anchor 绝不能进入 canonical controls；
- production sample catalog 为 16，基础 E2E 的 9-selector surface 是明确 compatibility mode；
- generic 与 specialized Playground listener 顺序是可见行为契约；
- Vite 生产 bundle 为约 `1,067.41 kB`，后续需评估 code splitting；
- connector 工作流无法删除已合并分支；
- PR #31 合并触发的 Pages workflow 与 live page 人工核验是两个独立状态，不能仅凭源码宣称线上缓存已更新。

Continuation：完成 006I post-merge finalization 后，只进入 006J 语义设计。不要在 finalization PR 中加入任何新 geometry 或 public Definition。
