# PlotLibre Development Handover — Milestone 006C Pincer Objective-Order Hotfix Finalization

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
实施 PR：`#23 Fix pincer fifth-click failure for natural objective order`  
实施 merge SHA：`79e503d5080481cc459e7395b1e8c3983c6945f7`  
Workspace：`0.0.14`  
Pincer Definition：`1.1.0`  
状态：PR #23 已 squash merge；`main` 与 merge SHA identical；等待线上 Pages 最终核对

## Current state

用户报告的自然轮廓点序第五点击失败已修复：

```text
左外尾 → 右外尾 → 右目标 → 左目标 → 内侧汇合点
```

公共 Definition 会先尝试直接 A/B 配对；直接无效、交换两个目标后有效时，只交换控制点 2、3 并保存 canonical roles。任何坐标都不会被添加、删除、移动、镜像或 clamp。

```text
controlPoints[0] = outer tail A
controlPoints[1] = outer tail B
controlPoints[2] = objective A
controlPoints[3] = objective B
controlPoints[4] = shared inner junction
```

实施状态：

```text
PR #23: merged
merge SHA: 79e503d5080481cc459e7395b1e8c3983c6945f7
compare merge SHA...main: identical
workspace: 0.0.14
pincer Definition: 1.1.0
```

权威记录：

```text
docs/handover/2026-07-29-milestone-006c-pincer-objective-order-hotfix.md
docs/handover/2026-07-29-milestone-006c-pincer-objective-order-finalization.md
```

## Completed in this milestone

- 复现用户线上第五点击失败；
- 确认根因是 objective positional pairing，而不是第五点事件丢失；
- 新增 permutation-only Definition canonicalization；
- Registry、create、replace 和 import 使用 canonical roles；
- strict pure geometry 和拓扑校验保持不变；
- pincer 升至 `1.1.0`；
- workspace/demo 升至 `0.0.14`；
- 新增自然轮廓点序 Node 与 Chromium 回归；
- 新基线为 124 Node / 17 Chromium；
- PR #23 全绿、无 review threads、已 squash merge；
- `main` 与 merge SHA identical；
- Pages workflow 的 main/path 触发条件覆盖本次 Playground、packages 和 package.json 变更。

## Validation

```text
Implementation CI: 30465128769
Docs-inclusive CI: 30465663153
Node 20.19: success
Node 22: success
Node tests: 124 passed / 0 failed
Chromium tests: 17 passed / 0 failed
Typecheck/tests/build: success
Handover contract: success
Unresolved review threads: 0
```

## Next tasks

1. 在线核对 badge 显示 `v0.0.14 demo`；
2. 在线分别测试左右两种目标点击顺序；
3. 浏览器仍显示旧版时强制刷新；
4. 增加真正无效第五点的具体错误原因提示；
5. 增加 asymmetric/off-center/junction-boundary fixtures；
6. 增加 antimeridian/high-latitude cases；
7. 补 Definition 1.0.0 → 1.1.0 迁移说明；
8. 暂不开发下一个复杂符号。

## Risks and decisions

- canonicalization 只能 exact permutation；
- direct 和 swapped 都无效时仍严格拒绝；
- Store/PlotJSON 保存 canonical roles；
- pure geometry 保持 strict positional API；
- junction 不移动、不替换；
- GitHub Pages 部署完成需要独立线上核对；
- 真正无效的最后点仍缺少具体 UI 原因；
- packages 仍为 `UNLICENSED`。

Continuation：先核对 live Playground 的 `v0.0.14 demo` 和两种点序。若仍失败，保存五点坐标和 status text 并添加 exact regression fixture，禁止删除拓扑检查或把 pincer 改成 double alias。
