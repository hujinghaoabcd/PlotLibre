# PlotLibre Development Handover — Milestone 006A Pincer Semantic Design

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/pincer-arrow-semantic-design`  
PR：`#20 Design canonical pincer arrow semantics`  
Workspace：`0.0.12`  
状态：设计文档与交接已完成；draft PR 开放；implementation 等待语义审查

## Current state

跨类型箭头显示可靠性修复已通过 PR #19 合并：

```text
main / merge SHA: d745aa2b7044f9ba9a710bf6ddeba3e630862ea4
Node tests:        107
Chromium tests:    15
```

当前只进行 `arrow.pincer` canonical semantic design。权威文件：

```text
docs/design/arrow-pincer-semantic-design.md
docs/handover/2026-07-29-milestone-006a-pincer-semantic-design.md
```

冻结的 canonical controls：

```text
controlPoints[0] = outer tail A
controlPoints[1] = outer tail B
controlPoints[2] = objective A
controlPoints[3] = objective B
controlPoints[4] = shared inner junction
```

核心配对：

```text
arm A = tail A → junction → objective A
arm B = tail B → junction → objective B
```

与 `arrow.double` 的关键差异：

```text
arrow.double
- 4 controls
- unordered tail pair
- unordered objective pair
- derived branch/shared body

arrow.pincer
- 5 controls
- authored A/B arm pairing
- exact authored inner junction
- no shared forward body
```

## Completed in this milestone

- 建立设计分支 `agent/pincer-arrow-semantic-design`；
- 创建 draft PR #20；
- 完成 clean-room behavior review，并记录参考仓库、revision 和 license 风险；
- 冻结 exactly-five authored-control model；
- 冻结 fixed-five、第五次有效点击自动完成；
- 冻结 positional PlotJSON 1.0 角色；
- 冻结 A-to-A 与 B-to-B 配对；
- 冻结 simultaneous whole-arm swap invariance；
- 明确独立交换 tail pair 或 objective pair 会改变语义，不要求几何不变；
- 冻结 junction 为 final inner boundary 上的 exact semantic point；
- 冻结一个无孔 closed simple Polygon；
- 禁止 alias `arrow.double`、禁止调用 double public generator、禁止重命名复用 `DoubleArrowFrame`；
- 定义独立 `PincerArrowFrame`、参数族、validation、geometry invariants 和 testing plan；
- 明确四控制 double data 不能静默转换为五控制 pincer data；
- 实施目标 workspace 为 `0.0.13`，本设计 slice 不改版本和运行时代码。

## Validation

本 slice 是 docs-only，但 CI 必须保持完整基线：

```text
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
npm run playground:e2e
```

最低回归：

```text
107 Node tests
15 Chromium tests
```

当前 PR #20 CI：等待本次文档提交触发并完成。

## Next tasks

1. 确认 PR #20 CI 全绿；
2. 审查五控制点模型；
3. 审查 fifth junction 的 exact inner-boundary role；
4. 审查 ordered A/B arm pairing；
5. 审查 whole-arm swap invariance only；
6. 审查 fixed-five completion；
7. 审查 PlotJSON migration boundary；
8. 设计获准后将 PR #20 Ready 并 merge；
9. 新建实施分支，不在设计 PR 中写几何；
10. 先新增 `docs/algorithms/arrow-pincer.md`，再完成参数、frame、ring、Definition、Registry、PlotJSON、Playground 和 Chromium；
11. 扩展 all-arrow visibility matrix 从八类到九类；
12. 不并行开发其他复杂符号。

## Risks and decisions

- 公开生态经常将 pincer 与 double 当作同义词，PlotLibre 明确不采用该兼容策略；
- 第五点击增加交互成本，但换来完整、可编辑、可迁移的 semantic state；
- junction admissible region 的最终数值范围尚未校准，不能从参考实现复制；
- 参考 `zhous1993/cesium-symbol` 在检查 revision 未发现 LICENSE 或 package license，只能观察行为；
- 参数名称已提出，但默认数值和 golden fixtures 属于下一 implementation slice；
- semantic guide fallback、renderability preflight 和 fail-closed topology 必须保持；
- 设计 PR 不应增加 public identifier、selector、sample 或 workspace version；
- 在语义审查完成前不得实现 `arrow.pincer`。

Continuation：后续必须先读 `AGENTS.md`、`docs/design/arrow-pincer-semantic-design.md` 和 006A handover。当前唯一任务是完成设计审查与合并，不得直接跳到 geometry implementation。