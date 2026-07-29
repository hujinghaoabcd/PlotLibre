# PlotLibre Development Handover — Milestone 006A Pincer Semantic Design Finalization

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/pincer-arrow-semantic-design`  
PR：`#20 Design canonical pincer arrow semantics`  
Workspace：`0.0.12`  
状态：设计已审查批准；完整 CI 全绿；等待 Ready、squash merge

## Current state

跨类型箭头显示可靠性修复已通过 PR #19 合并：

```text
main / merge SHA: d745aa2b7044f9ba9a710bf6ddeba3e630862ea4
Node tests:        107
Chromium tests:    15
```

`arrow.pincer` 的独立 canonical semantic design 已完成审查。权威文件：

```text
docs/design/arrow-pincer-semantic-design.md
docs/handover/2026-07-29-milestone-006a-pincer-semantic-design.md
docs/handover/2026-07-29-milestone-006a-pincer-semantic-design-finalization.md
```

批准的 canonical controls：

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

- 建立并审查设计 PR #20；
- 完成 clean-room behavior review；
- 批准 exactly-five authored-control model；
- 批准 fixed-five、第五次有效点击自动完成；
- 批准 positional PlotJSON 1.0 角色；
- 批准 A-to-A 与 B-to-B 配对；
- 批准 simultaneous whole-arm swap invariance；
- 明确独立交换 tail 或 objective 会改变 pairing，不要求 geometry invariance；
- 批准 junction 为 final inner boundary 上的 exact semantic point；
- 批准一个无孔 closed simple Polygon；
- 禁止 alias `arrow.double`、调用 double public generator 或以 `DoubleArrowFrame` 作为 semantic frame；
- 批准独立 `PincerArrowFrame`、parameter family、validation、geometry invariants 和 testing plan；
- 明确四控制 double data 不能静默转换为五控制 pincer data；
- 修正 `AGENTS.md` 中把所有 compound symbols 强制为 shared-body topology 的错误泛化；
- 将开发合同当前优先级切换到 pincer design；
- 本 slice 未增加 public symbol、selector、sample 或版本号。

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

## Next tasks

1. 将 PR #20 标记 Ready；
2. 检查 unresolved review threads；
3. squash merge PR #20；
4. 确认 `main` 与 merge SHA identical；
5. 从更新后的 `main` 新建 `agent/pincer-arrow-implementation`；
6. 先写 `docs/algorithms/arrow-pincer.md`；
7. 实现参数、`PincerArrowFrame` 和 ring；
8. 添加 Definition、Registry、PlotJSON 和 interaction；
9. 增加第九个 Playground option/sample；
10. 扩展九类型 Chromium visibility/edit coverage；
11. implementation slice 将 workspace 升至 `0.0.13`；
12. 不并行开发其他复杂符号。

## Risks and decisions

- 公开生态经常将 pincer 与 double 当作同义词，PlotLibre 明确不采用该兼容策略；
- 第五点击增加交互成本，但消除了 hidden state 和导入/编辑歧义；
- junction admissible region 的最终数值范围必须由 PlotLibre fixtures 校准；
- exact junction 无效时必须拒绝，不能 clamp 或替换为 midpoint；
- 参考 `zhous1993/cesium-symbol` 未发现 LICENSE 或 package license，只能观察行为；
- 参数名称已批准，但数值默认值属于 implementation slice；
- semantic-guide fallback、renderability preflight 和 fail-closed topology 必须保持；
- implementation 必须在设计 PR 合并后的独立分支进行。

Continuation：PR #20 合并后，读取 `AGENTS.md`、pincer design 与 006A finalization handover，从算法记录开始独立实现五控制点钳形箭头，不得退回四控制别名模型。