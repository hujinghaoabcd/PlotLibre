# PlotLibre Development Handover — Milestone 006A Pincer Semantic Design Finalization

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/pincer-arrow-semantic-design`  
PR：`#20 Design canonical pincer arrow semantics`  
Workspace：`0.0.12`  
状态：semantic design reviewed and approved; full CI green; Ready/merge pending

## Current state

006A 已完成 `arrow.pincer` 的独立 canonical semantic design，并通过反例审查。

批准的 version-1.0 控制模型：

```text
0 outer tail A
1 outer tail B
2 objective A
3 objective B
4 shared inner junction
```

批准的配对模型：

```text
arm A = tail A → junction → objective A
arm B = tail B → junction → objective B
```

批准的 invariance：

```text
swap whole arm A/B together → normalized geometry unchanged
swap only tails or only objectives → pairing changes; invariance not required
```

批准的 topology：

```text
one coherent closed simple Polygon
inner boundaries meet at exact authored junction
no shared forward body requirement
no independently persisted component arrows
```

## Completed in this milestone

- 完成并审查 `docs/design/arrow-pincer-semantic-design.md`；
- 通过 clean-room behavior review 确认公开生态经常混用 pincer/double 命名；
- 明确 PlotLibre 不采用别名或调用 double generator 的兼容策略；
- 批准 exactly-five authored controls；
- 批准 fixed-five、第五次有效点击自动完成；
- 批准 exact authored inner junction 进入 PlotJSON 和 handles；
- 批准 ordered A/B arm pairing；
- 批准 simultaneous whole-arm swap invariance only；
- 批准四控制 double data 不得静默迁移为 pincer；
- 批准独立 `PincerArrowFrame`，禁止以 `DoubleArrowFrame` 作为语义 frame；
- 修正 `AGENTS.md` 的通用 compound-symbol 测试规则：测试符号声明的耦合拓扑，而不是强制所有复合符号共享主体；
- 将 `AGENTS.md` 当前优先级切换到 PR #20 设计合同；
- 运行完整 Node、build、handover 和 Chromium CI。

## Validation

权威 CI：

```text
Run ID: 30458945657
Node 20.19: success
Node 22: success
Typecheck/tests/build: success
Handover contract: success
Chromium: success
```

最低回归保持：

```text
107 Node tests
15 Chromium tests
```

本 milestone 未修改运行时代码、public identifiers、Playground selector、sample 或 workspace version。

## Next tasks

1. 将 PR #20 标记 Ready；
2. 检查 unresolved review threads；
3. squash merge PR #20；
4. 确认 `main` 与 merge SHA identical；
5. 从更新后的 `main` 新建独立 implementation branch；
6. 首先创建 `docs/algorithms/arrow-pincer.md`；
7. 实现参数解析与 `PincerArrowFrame`；
8. 实现两条 paired arms、两个 heads、exact junction 和 one coherent ring；
9. 添加 geometry、Definition、PlotJSON、interaction 和 MapLibre tests；
10. 增加第九个 Playground selector/sample；
11. 将 all-arrow visibility matrix 扩展为九类；
12. workspace 仅在 implementation slice 升级到 `0.0.13`。

## Risks and decisions

- 第五 junction 的 admissible region 数值仍需通过 PlotLibre fixtures 校准；
- exact junction 必须保留，不能通过 clamp 或 midpoint 替换“修复”无效输入；
- 公开参考无明确 license 的内容只能观察行为，implementation 必须 clean-room；
- 两条 arm 可以复用 pure curve/head/offset primitives，但不能复用 double semantic frame；
- independent objective swap 不是 invariant，这是 authored pairing 的预期结果；
- implementation 必须维持 fail-closed renderability preflight 和 semantic-guide fallback；
- 任何运行时代码都必须在设计 PR 合并后的独立分支进行。

Continuation：设计已经批准。PR #20 合并后，下一对话应读取本文件与 `docs/design/arrow-pincer-semantic-design.md`，在独立分支从算法记录开始实施，不得回退为四控制别名模型。