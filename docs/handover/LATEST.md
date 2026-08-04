# PlotLibre Development Handover — Milestone 006J Merged / Milestone 007 Design Next

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
当前 `main`：`297d0a644eaa3427f8fd59b82b7bc3582221d49e`  
已合并 PR：`#34 Add circular arc family`  
合并方式：squash  
Post-merge 分支：`agent/006j-post-merge-finalization`  
Workspace：`0.0.20`  
状态：Milestone 006J 已合并到 `main`；当前只同步合并事实，下一开发阶段为 Milestone 007 professional editing semantic design

## Current state

```text
workspace:          0.0.20
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     19
Arrow Definitions:  14
Line Definitions:   1
Area Definitions:   4
Node tests:         184
Chromium tests:     28
main SHA:           297d0a644eaa3427f8fd59b82b7bc3582221d49e
merged PR:          #34
next milestone:     007 professional editing semantic design
```

新增并已合并的 Definitions：

```text
line.circular-arc@1.0.0
area.circular-segment@1.0.0
area.sector@1.0.0
```

延期：

```text
area.lune
```

Canonical state 保持：

```text
plot definition + authored controls + parameters + style + metadata
```

Circumcenter、radius、angles、sweeps、samples、derived endpoints、rings 和 semantic guide paths 均为派生状态。

## Completed in this milestone

- PR #33 合并 circular family 设计与数学契约；
- PR #34 实现 local-metre three-point circular frame；
- 实现 exact minor/major directed arc sampling；
- 实现 `line.circular-arc`、`area.circular-segment` 和 `area.sector`；
- 实现 strict coordinate、radius、sweep 和 topology preflight；
- 保留 authored controls 与 PlotJSON 边界；
- 新增 `lineSymbols`，公共目录扩展为 19；
- 新增 Definition-driven `deriveSemanticGuidePaths`；
- Sector 增加 transient center-to-bearing guide；
- MapLibre 增加 `plotlibre-handle-guide`，完整 layer 数为 8；
- guide 不进入 committed output、Store、History 或 PlotJSON；
- production Playground 扩展到 19 selectors / 19 samples；
- Node tests 从 163 增至 184；
- Chromium tests 从 23 增至 28；
- workspace 提升为 `0.0.20`；
- README、AGENTS、roadmap、Playground、interaction、design/algorithm indexes 和 immutable handover 全部同步；
- 最终 PR head 在完整 current-head CI 和 0 个 unresolved threads 后标记 Ready；
- PR #34 使用 expected validated head squash merge；
- 实际 squash SHA 为 `297d0a644eaa3427f8fd59b82b7bc3582221d49e`。

## Validation

最终 PR head 验证：

```text
GitHub Actions run: 30893450723 (#337)
validated head:     608567d4f8f662242b0356c54742a2ffcb087c66
Node 20.19:         success
Node 22:            success
TypeScript:         success
Node tests:         184 passed / 0 failed
Playground typecheck: success
Playground build:   success
handover contract:  success
Chromium tests:     28 passed / 0 failed
unresolved threads: 0
```

候选浏览器日志：

```text
Running 28 tests using 1 worker
28 passed (1.9m)
```

本 post-merge finalization 只修改 current-state Markdown 并增加合并记录，不修改 runtime、geometry、Definitions、interaction、Playground source、tests 或 configuration。该 finalization 仍需独立完整 CI 后进入 `main`。

## Next tasks

1. 完成 `agent/006j-post-merge-finalization` 的 documentation-only 同步；
2. 创建 Draft finalization PR；
3. 通过 Node 20.19、Node 22、184 Node、28 Chromium、build 和 handover contract；
4. 全绿且 0 unresolved threads 后 squash merge finalization；
5. 从最终 `main` 创建 Milestone 007 design branch；
6. 先冻结 multi-selection canonical model；
7. 冻结 box/lasso hit policy；
8. 冻结 whole-object translate/rotate/scale 对 authored controls 的变换规则；
9. 冻结 group、lock、z-order、multi-object command transaction 与 atomic rollback；
10. 设计未合并前不写 Milestone 007 runtime。

## Risks and decisions

- `deriveSemanticGuidePaths` 已成为 public Definition extension，必须保持 backward compatibility；
- renderer 当前有 3 Sources 和 8 Layers；
- circular version 1.0 不支持 antimeridian、polar、large-extent 或 geodesic small circles；
- true two-arc lune 仍未实现；
- packages 仍为 `UNLICENSED`；
- root workspace 与 public package versions 尚未统一；
- PlotJSON 尚缺正式 JSON Schema 和 migration framework；
- Store/History 尚无 multi-object transaction、persistence 或 general rollback；
- production JS bundle 约 1,081 kB，需要后续 code splitting；
- connector 无法删除 merged branches；
- Pages workflow deployment 与 live manual verification 是独立状态。

Continuation：完成 006J post-merge finalization 后，只进入 Milestone 007 设计。不要在 finalization PR 中加入 runtime changes。
