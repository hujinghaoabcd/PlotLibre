# PlotLibre Development Handover — Milestone 006A Pincer Semantic Design

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/pincer-arrow-semantic-design`  
PR：`#20 Design canonical pincer arrow semantics`  
Workspace：`0.0.12`  
状态：design-only slice complete; draft PR open; implementation blocked pending design review

## Current state

PR #19 的跨类型箭头显示可靠性修复已经 squash merge 到 `main`：

```text
merge SHA: d745aa2b7044f9ba9a710bf6ddeba3e630862ea4
Node baseline: 107
Chromium baseline: 15
```

下一优先级是 `arrow.pincer`，但 `AGENTS.md` 明确禁止在语义设计审查前实现。006A 因此只冻结 canonical model、interaction、PlotJSON、invariance 和 topology，不添加公共符号代码。

权威设计文件：

```text
docs/design/arrow-pincer-semantic-design.md
```

## Completed in this milestone

- 建立 `agent/pincer-arrow-semantic-design` 分支；
- 创建 draft PR #20；
- 完成 clean-room observable-behavior 调研并记录精确仓库 revision；
- 明确公开实现经常把 PincerArrow 代理到 doubleArrow，因此 PlotLibre 不采用名称别名模型；
- 冻结五个 authored controls：

```text
0 outer tail A
1 outer tail B
2 objective A
3 objective B
4 shared inner junction
```

- 冻结 arm pairing：A 尾只与 A 目标配对，B 尾只与 B 目标配对；
- 冻结 invariance：仅同时交换整条 A/B 手臂保持归一化几何不变；
- 明确单独交换尾或目标会改变配对语义，不要求几何不变；
- 冻结 fixed-five interaction：第五次有效点击自动完成；
- 明确第五控制点是精确 inner junction，必须进入 PlotJSON 和 semantic handles；
- 明确最终输出是一个无孔 simple Polygon；
- 禁止调用 double-arrow public generator、禁止将 `DoubleArrowFrame` 重命名复用；
- 定义 `PincerArrowFrame`、参数族、validation policy、geometry invariants、PlotJSON migration boundary 和完整测试计划；
- 明确实施目标版本为 Definition `1.0.0`、workspace `0.0.13`，但本设计阶段不修改版本。

## Validation

本里程碑仅包含 Markdown 设计与交接文档，不包含运行时代码。

必须通过：

```text
npm run handover:check
```

PR CI 还会执行现有完整 validation 和 Chromium 回归；文档变更不得降低以下基线：

```text
107 Node tests
15 Chromium tests
```

设计审查必须逐项确认：

```text
exactly five authored controls
A-to-A / B-to-B pairing
whole-arm swap invariance only
fixed-five completion
exact authored junction
one coherent Polygon
no arrow.double alias
fail-closed topology
```

## Next tasks

1. 等待 PR #20 CI；
2. 审查五控制点角色是否符合产品预期；
3. 审查 junction 是 inner boundary exact point，而不是 derived branch center；
4. 审查 ordered arm pairing 和 whole-arm swap invariance；
5. 审查第五点击完成方式；
6. 审查四控制 `arrow.double` 不能无迁移直接转换为 `arrow.pincer`；
7. 设计获准后将 PR #20 Ready 并 merge；
8. 新建独立实施分支；
9. 先写 `docs/algorithms/arrow-pincer.md`，再实现参数、frame、ring、Definition、Playground 和测试；
10. 不并行开发 route、corridor、squad-combat 或其他复杂箭头。

## Risks and decisions

- “钳形箭头”在公开生态中常与 double arrow 混用，PlotLibre 选择语义区分而非兼容名称；
- 第五 junction 增加一次点击，但消除了 hidden derived state 和导入/编辑歧义；
- ordered arm pairing 比独立无序 pair 更严格，但能够稳定表达每条手臂的路径身份；
- junction 的最终 admissible region 数值尚未校准，必须由 PlotLibre golden fixtures 决定；
- 公开参考 A 未发现许可证文件或 package license，因此只允许行为观察，禁止代码复用；
- 设计中参数名称是目标合同，数值默认值尚未确定；
- implementation 必须保留 107/15 基线并扩展九类型实际渲染矩阵；
- 本交接不代表实现获准，PR #20 的 review gate 仍然有效。

Continuation：后续对话必须先读 `AGENTS.md`、本交接和 `docs/design/arrow-pincer-semantic-design.md`。在设计审查完成前不得创建 `arrow.pincer` Definition、geometry generator、Playground option 或 PlotJSON public type。