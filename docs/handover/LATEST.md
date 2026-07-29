# PlotLibre Development Handover — Milestone 006B Pincer Arrow Implementation

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/pincer-arrow-implementation`  
PR：`#21 Implement five-control pincer arrow`  
Workspace：`0.0.13`  
状态：完整运行时纵向切片已完成；122 Node / 16 Chromium 全绿；等待最终文档 CI、Ready 与 squash merge

## Current state

`arrow.pincer` version 1.0.0 已按 PR #20 批准设计完成实现。Canonical controls：

```text
controlPoints[0] = outer tail A
controlPoints[1] = outer tail B
controlPoints[2] = objective A
controlPoints[3] = objective B
controlPoints[4] = shared inner junction
```

Authored pairing：

```text
arm A = tail A → junction → objective A
arm B = tail B → junction → objective B
```

关键结构差异：

```text
arrow.double
- exactly 4 controls
- unordered tail/objective pairs
- derived shared body/branch

arrow.pincer
- exactly 5 controls
- authored A/B pairing
- exact authored inner junction
- no shared forward body
```

权威记录：

```text
docs/design/arrow-pincer-semantic-design.md
docs/algorithms/arrow-pincer.md
docs/handover/2026-07-29-milestone-006a-pincer-semantic-design-finalization.md
docs/handover/2026-07-29-milestone-006b-pincer-arrow-implementation.md
```

## Completed in this milestone

- 新增独立 clean-room `PincerArrowFrame`；
- 在一个 local-metre projection 内构建两条 paired arms；
- 精确保留 outer tails、objectives 和 shared inner junction；
- 建立 junction admissibility、tail span、paired forwardness 和 centerline-crossing validation；
- 使用 neck-plane trimming、offset shaft 和独立 outer/inner tension；
- 拼装一个 no-hole closed simple Polygon；
- junction 在 open ring 中恰好出现一次；
- whole-arm simultaneous swap geometry invariant；
- independent objective swap 改变或使 authored pairing 无效；
- 新增 `arrow.pincer` public Definition、Registry catalog 和 exports；
- stable issue code `INVALID_PINCER_ARROW_GEOMETRY`；
- PlotJSON 精确保留五个 authored controls；
- 四控制 double data relabel 为 pincer 会被拒绝；
- generic fixed-five interaction，无 symbol-ID branch；
- fifth pointer candidate 生成 draft，第五次有效点击自动完成；
- invalid fifth point 保持 active、visible、replaceable；
- 五个 semantic handles；
- junction drag、history 和 undo；
- Playground 增加第九类 selector、南京 sample 和明确交互说明；
- all-arrow visibility matrix 扩展到九类实际渲染；
- 新增 deterministic golden fixture；
- workspace 与 demo 升至 `0.0.13`；
- README 和 `AGENTS.md` 更新为正式九类 baseline。

## Validation

权威代码 CI：

```text
Run ID: 30462198386
Node 20.19: success
Node 22: success
Typecheck/tests/build: success
Node tests: 122 passed / 0 failed
Handover contract: success
Chromium tests: 16 passed / 0 failed
```

最低回归：

```text
122 Node tests
16 Chromium tests
9 public Arrow types
```

本次文档提交后的最终 docs-inclusive CI：等待触发并完成。

## Next tasks

1. 完成最终 docs-inclusive CI；
2. 更新 PR #21 body 为完整实现范围和最终验证；
3. 检查 unresolved review threads；
4. 将 PR #21 标记 Ready；
5. 使用 current head SHA squash merge；
6. 确认 `main` 与 merge SHA identical；
7. 添加 merge finalization immutable handover；
8. 确认 Pages workflow 由 `main` 触发；
9. 合并后优先做 pincer visual/robustness hardening；
10. 在开始下一个复杂符号前先完成 independent semantic design review。

## Risks and decisions

- junction admissibility 是初始自有校准，需要更多 asymmetric 和真实绘制样例；
- invalid junction 不会被 clamp 或替换为 midpoint；
- semantic guide 只保证输入可见，不赋予无效几何 completion 资格；
- `PincerArrowFrame` 独立于 `DoubleArrowFrame`，但复用项目内部 pure primitives；
- golden fixture 会阻止默认几何无审查漂移；
- 当前 E2E 样例证明稳定可绘制点位，不代表所有点位都合法；
- strict finite/closed/simple/self-intersection validation 不得为提高表面成功率而删除；
- four-control compatibility 需要未来显式 adapter 和 migration，不能静默处理；
- packages 仍为 `UNLICENSED`，公开发布前需决定 license；
- PR #21 合并后不应立即堆叠新箭头，应先处理用户实际绘制反馈。

Continuation：PR #21 未合并时只完成最终 CI、review、merge 与 finalization。合并后从 pincer quality hardening 开始，先验证 symmetric/asymmetric、junction 边界、antimeridian/high-latitude 和实际交互，再决定下一 semantic-design milestone。