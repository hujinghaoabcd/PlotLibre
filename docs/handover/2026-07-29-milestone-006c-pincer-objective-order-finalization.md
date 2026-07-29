# PlotLibre Development Handover — Milestone 006C Pincer Objective-Order Hotfix Finalization

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
实施 PR：`#23 Fix pincer fifth-click failure for natural objective order`  
实施 merge SHA：`79e503d5080481cc459e7395b1e8c3983c6945f7`  
Workspace：`0.0.14`  
Pincer Definition：`1.1.0`  
状态：PR #23 已 squash merge；merge SHA 与 `main` identical；Pages workflow 已由 `main` 的 Playground/package 变更触发条件覆盖

## Current state

用户报告的钳形箭头第五点击失败已经通过 objective-order canonicalization 修复并进入 `main`。

修复后的公共行为：

```text
左尾 → 右尾 → 左目标 → 右目标 → 汇合点：完成
左尾 → 右尾 → 右目标 → 左目标 → 汇合点：完成并规范化目标角色
```

Canonical Store/PlotJSON roles：

```text
0 outer tail A
1 outer tail B
2 objective A
3 objective B
4 shared inner junction
```

实施 merge 验证：

```text
PR #23: merged
merge SHA: 79e503d5080481cc459e7395b1e8c3983c6945f7
compare merge SHA...main: identical
```

Pages workflow `.github/workflows/pages.yml` 在 `main` 的以下变更时自动运行：

```text
apps/playground/**
packages/**
package.json
```

PR #23 同时修改了以上三类路径，因此满足自动部署触发条件。

## Completed in this milestone

- 复现并定位自然轮廓目标顺序导致的第五点击失败；
- 新增 Definition-level permutation-only canonicalization；
- Registry 在 validate/generate 前 canonicalize；
- create、replace、import 持久化 canonical roles；
- `arrow.pincer` 升至 `1.1.0`；
- workspace/demo 升至 `0.0.14`；
- strict pure geometry、junction、self-intersection 和 simple-ring validation 保持不变；
- 新增用户点序 Node 与 Chromium 回归；
- 完成 124 Node / 17 Chromium 验证；
- 完成 docs-inclusive CI；
- unresolved review threads 为 0；
- PR #23 标记 Ready 并 squash merge；
- `main` 与 merge SHA 确认 identical；
- README、AGENTS、LATEST 和 immutable handover 已更新。

## Validation

权威实现 CI：

```text
Run ID: 30465128769
Node 20.19: success
Node 22: success
Node tests: 124 passed / 0 failed
Chromium tests: 17 passed / 0 failed
Typecheck/tests/build: success
Handover contract: success
```

权威 docs-inclusive CI：

```text
Run ID: 30465663153
Node 20.19: success
Node 22: success
Typecheck/tests/build: success
Handover contract: success
Chromium: success
```

Browser regression verifies:

- fifth-point pincer draft exists for natural perimeter objective order;
- fifth click completes;
- Store contains one five-control pincer;
- objective roles are canonicalized;
- actual committed MapLibre fill/line features render.

## Next tasks

1. 核对 GitHub Pages 最新部署状态；
2. 在线确认 badge 为 `v0.0.14 demo`；
3. 在线分别测试两种目标顺序；
4. 若浏览器缓存仍显示旧版，强制刷新后重测；
5. 增加 invalid fifth-point 的明确错误原因提示；
6. 增加 asymmetric 与 off-center junction fixtures；
7. 增加 junction admissibility boundary tests；
8. 增加 antimeridian/high-latitude cases；
9. 检查 1.0.0 PlotJSON 导入后的版本迁移说明；
10. 暂不开始下一个复杂符号。

## Risks and decisions

- Pages 部署是合并后的独立 GitHub Actions 流程，代码合并与部署完成是两个状态；
- workflow 路径过滤明确覆盖本次变更，但仍需在线核对最终静态资源；
- canonicalization 永远只能重排输入坐标；
- direct 和 swapped 都无效时继续 fail closed；
- Store/PlotJSON 保存 canonical roles，避免后续编辑时手柄语义漂移；
- pure geometry 不自动交换点，保持可预测的低层 API；
- Definition 1.1.0 行为变化需要后续补迁移说明；
- 真正无效的第五点目前仍只表现为继续绘制，错误原因提示不足；
- packages 仍为 `UNLICENSED`。

Continuation：先在线核对 `v0.0.14 demo` 和两种目标点序。若 live site 已更新但仍失败，记录五个实际经纬度和页面 status text，再新增 exact fixture；不得通过关闭拓扑校验、移动 junction 或回退为 double alias 修复。
