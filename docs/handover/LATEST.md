# PlotLibre Development Handover — Milestone 006C Pincer Objective-Order Hotfix

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
分支：`fix/pincer-natural-objective-order`  
PR：`#23 Fix pincer fifth-click failure for natural objective order`  
Workspace：`0.0.14`  
Pincer Definition：`1.1.0`  
状态：用户报告已复现并修复；124 Node / 17 Chromium 全绿；等待最终文档 CI、合并与 Pages 部署

## Current state

线上失败点序：

```text
左外尾 → 右外尾 → 右目标 → 左目标 → 内侧汇合点
```

旧版严格把目标 2、3 与尾点 0、1 按索引配对，导致自然轮廓顺序形成无效交叉配对。第五点击经过 renderability preflight 后被拒绝，因此 Store 不增加对象。

修复后：

- 用户可按任意左右顺序点击两个目标；
- direct pairing 有效时保持原顺序；
- direct pairing 无效但交换目标 2/3 后有效时，持久化交换后的 canonical A/B roles；
- 两种配对都无效时仍 fail closed；
- junction 和任何坐标都不会被移动、clamp 或合成；
- pure geometry API 保持 strict positional semantics。

权威记录：

```text
docs/design/arrow-pincer-semantic-design.md
docs/algorithms/arrow-pincer.md
docs/handover/2026-07-29-milestone-006b-pincer-arrow-finalization.md
docs/handover/2026-07-29-milestone-006c-pincer-objective-order-hotfix.md
```

## Completed in this milestone

- 新增 Definition-level `canonicalizeControlPoints`；
- 新增 Registry canonicalization 和 exact-permutation guard；
- validate/generate/create/replace/import 使用 canonical controls；
- 非法 canonicalizer 使用 `INVALID_CONTROL_POINT_CANONICALIZATION`；
- pincer Definition 升至 `1.1.0`；
- workspace/demo 升至 `0.0.14`；
- 新增自然轮廓顺序 Node 回归；
- 新增第五点 draft、completion、Store 和 actual rendering Chromium 回归；
- Playground 文案明确两个目标左右顺序均可；
- README 和 `AGENTS.md` 更新；
- 新基线为 124 Node / 17 Chromium。

## Validation

```text
Run ID: 30465128769
Node 20.19: success
Node 22: success
Typecheck/tests/build: success
Handover contract: success
Node tests: 124 passed / 0 failed
Chromium tests: 17 passed / 0 failed
```

## Next tasks

1. 完成 docs-inclusive CI；
2. 更新并 Ready PR #23；
3. 检查 unresolved review threads；
4. squash merge 到 `main`；
5. 确认 merge SHA 与 `main` identical；
6. 核对 Pages deployment；
7. 在线重测两种目标点击顺序；
8. 记录 merge/deployment finalization；
9. 增加真正无效第五点的具体 UI 原因；
10. 继续 pincer asymmetric、junction-boundary、高纬度和跨日期变更线强化。

## Risks and decisions

- canonicalization 只能 permutation，不得修改坐标；
- Store/PlotJSON 保存 canonical roles；
- 两种配对都有效时保留用户顺序；
- 两种配对都无效时仍严格拒绝；
- 不放宽 self-intersection、junction 或 simple-ring 校验；
- Definition 版本升至 1.1.0 反映公共输入行为变化；
- 当前真正无效的最后点仍缺少具体错误提示；
- packages 仍为 `UNLICENSED`。

Continuation：优先完成 PR #23 合并和线上验证。线上 badge 应显示 `v0.0.14 demo`，自然轮廓点序和同侧配对点序都应在第五点击后完成。若仍有失败，记录具体五点坐标并新增 fixture，禁止通过移动 junction 或删除拓扑检查修复。
