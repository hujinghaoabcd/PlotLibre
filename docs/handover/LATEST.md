# PlotLibre Development Handover — Milestone 006I Ready Candidate

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
合并基线：`main@a883cbf382b61309e7d64e788e46d9319b8c0ea1`  
活跃分支：`agent/006i-closed-action-area-group`  
活跃 PR：`#31 Add closed action area symbol group`  
Workspace：`0.0.19`  
状态：006I 实现、Playground、文档和 immutable handover 已完成；run #292 全绿，等待包含最终交接文档的新 head CI

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
- README、AGENTS、DEVELOPMENT_PLAN、PLAYGROUND、INTERACTION_MODEL、设计与算法索引已同步；
- 新增 immutable handover：`docs/handover/2026-08-04-milestone-006i-closed-action-area.md`；
- PR #31 当前无未解决评审线程，与 `main` 无分叉。

## Validation

权威实现候选 run：

```text
GitHub Actions run: 30883349847 (#292)
validated head SHA: 145e6fe007353c39c5f71a13f0e54cbfe509b949
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

Chromium 日志明确记录：

```text
Running 23 tests using 1 worker
23 passed (1.3m)
```

run #292 验证了最终实现、16 类样例、兼容 E2E、钳形 rejection 恢复和全部新 Area tests。随后只新增 immutable handover 并更新本 current-state 文件，没有修改运行时代码、Definition、geometry、interaction、Playground 或 tests。

最终 merge gate 仍要求对包含这两份交接文档的 current head 再执行：

```text
Node 20.19:        success
Node 22:           success
Node tests:        163 passed
Chromium tests:    23 passed
Playground build: success
handover contract: success
unresolved review threads: 0
```

PR #31 在最终文档 head 全绿前保持 Draft。

## Next tasks

1. 触发包含 immutable handover 与本 `LATEST.md` 的最终 current-head CI；
2. 确认 163 Node、23 Chromium、build 和 handover contract 全绿；
3. 再确认 unresolved review threads = 0；
4. 将 PR #31 标记 Ready；
5. 使用 expected final head SHA squash merge；
6. 记录真实 squash merge SHA；
7. 通过独立 post-merge finalization PR 把 `LATEST.md` 更新为 merged state；
8. 从最终 `main` 创建 `agent/006j-arc-sector-lune-design`；
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
- Vite 生产 bundle 为约 `1,067.41 kB`，后续需评估 code splitting，但不阻塞 006I；
- connector 工作流无法删除已合并分支；
- Pages 是否真实线上更新必须以 main deploy workflow 和 live verification 分别确认。

Continuation：继续在 `agent/006i-closed-action-area-group` / PR #31 完成最终文档 head CI、Ready 与 squash merge。不要在该 PR 中加入 006J geometry。
