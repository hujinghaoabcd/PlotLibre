# PlotLibre Development Handover — Milestone 006I Active

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
合并基线：`main@a883cbf382b61309e7d64e788e46d9319b8c0ea1`  
活跃分支：`agent/006i-closed-action-area-group`  
活跃 PR：`#31 Add closed action area symbol group`  
Workspace：`0.0.19`  
状态：006I 实现、Playground 与文档已完成；正在进行最终 current-head CI 和交接冻结

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
base main SHA:      a883cbf382b61309e7d64e788e46d9319b8c0ea1
active branch:      agent/006i-closed-action-area-group
active PR:          #31
```

新增公共 Definitions：

```text
area.closed-curve@1.0.0
area.gathering-place@1.0.0
```

延期：

```text
area.route-loop
```

Canonical state 仍为：

```text
plot definition + authored control points + parameters + style + metadata
```

闭合重复点、周期曲线采样、winding normalization、gathering rear anchor 和 Polygon coordinates 均为派生数据。

## Completed in this milestone

- 冻结 closed action area group 的公共语义、控制点角色、拓扑和 PlotJSON 边界；
- 增加 `area.closed-curve@1.0.0`，支持 3–64 个有序边界途经点；
- 增加 `area.gathering-place@1.0.0`，支持 flank/crown/flank 固定三控制点；
- 明确 `area.route-loop` 不在 006I 中实现；
- 增加纯 periodic Hermite/Catmull–Rom closed-area geometry；
- 使用 circular longitude mean + mean latitude 建立与遍历顺序无关的局部投影中心；
- 保证每个 authored control 被曲线插值；
- 自动闭合并规范化 counterclockwise ring；
- duplicate、degenerate、invalid parameter 和 self-intersection fail closed；
- gathering-place 只允许两个 flank 的 permutation-only canonicalization；
- derived rear anchor 不进入 Store、History、handles 或 PlotJSON；
- 增加独立 `DEFAULT_AREA_STYLE`；
- 保留 `arrowSymbols` 兼容数组并新增 `areaSymbols`；
- `builtInSymbols` 扩展到 16；
- 增加 9 个 closed-area Node tests，Node 总数从 154 增至 163；
- Playground 增加两类 selector、两类南京样例和独立交互提示；
- 生产和无底图模式加载完整 16 类样例；
- 基础 `?e2e=1` 保留原九类 selector compatibility surface；
- extended E2E 增加 `areas=1`；
- 增加 3 个 Area Chromium tests，suite 从 20 增至 23；
- 修复 installer/start 顺序，保证 symbol-specific rejection guidance 不被 generic status 覆盖；
- 根 workspace 提升到 `0.0.19`；
- README、AGENTS、DEVELOPMENT_PLAN、PLAYGROUND、INTERACTION_MODEL、设计与算法索引已同步。

## Validation

已取得的阶段性证据：

```text
Core validation run #275:
  Node 20.19:        success
  Node 22:           success
  Node tests:        163 passed / 0 failed
  TypeScript:        success
  Playground build: success
  handover contract: success

Browser run #279 before compatibility fixes:
  Area tests:        3 passed
  total passed:      20
  failures:          3 compatibility/listener-order regressions
```

三个浏览器失败的根因与处理：

1. 两项旧测试仍断言生产样例为 9，现已更新为 16 类完整目录；
2. installer 提前绑定导致 generic status 覆盖 pincer rejection，现已恢复 generic-first、specialized-after 顺序；
3. 未降低任何 geometry、rejection 或 rendered-feature 断言。

最终 merge gate：

```text
Node 20.19:        success on final head
Node 22:           success on final head
Node tests:        163 passed
Chromium tests:    23 passed
Playground build: success
handover contract: success
unresolved review threads: 0
```

PR #31 在上述 final current-head gate 全绿前保持 Draft。

## Next tasks

1. 触发 PR #31 最新 head 的完整 GitHub Actions；
2. 处理任何真实类型、geometry、interaction 或 browser regression；
3. 全绿后新增 immutable 006I final handover；
4. 将 PR #31 标记 Ready；
5. 确认 unresolved review threads = 0；
6. 使用 expected head SHA squash merge；
7. 通过独立 finalization PR 把 `LATEST.md` 更新为真实 merged SHA；
8. 从最终 `main` 创建 006J arc/sector/lune 语义设计分支；
9. 先研究控制点、方位角、弧方向、输出类型与 geodesic 边界，再实现 geometry；
10. 不返回 pincer hardening，不扩展 route-head variants。

## Risks and decisions

- 当前 packages 仍为 `UNLICENSED`，正式 npm release 前必须决定许可证；
- root workspace 为 `0.0.19`，公共 package versions 尚未统一；
- PlotJSON 1.0 尚缺正式 JSON Schema 和 migration framework；
- Store/History 尚无多对象事务、持久化或通用 rollback；
- closed-area 1.0 使用局部米制投影，不承诺全球尺度、极区或模糊反经线输入；
- `area.closed-curve` 的 canonical order 不因 winding normalization 被重写；
- `area.gathering-place` 的 crown 固定为 index 1，只有 flank pair 可交换；
- sampled ring、closing duplicate 和 rear anchor 绝不能进入 canonical controls；
- production sample catalog 为 16，基础 E2E 的 9-selector surface 是明确 compatibility mode，不是生产目录；
- generic 与 specialized Playground listener 顺序是可见行为契约；
- Vite 生产 bundle 已超过 1 MB，后续需评估 code splitting，但不阻塞 006I；
- Pages 是否真实线上更新必须以 main deploy workflow 和 live verification 分别确认。

Continuation：继续在 `agent/006i-closed-action-area-group` / PR #31 完成最终 CI、immutable handover、Ready 与 squash merge。不要在该 PR 中加入 006J geometry。
