# PlotLibre Development Handover — Milestone 006B Pincer Arrow Implementation

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/pincer-arrow-implementation`  
PR：`#21 Implement five-control pincer arrow`  
Workspace：`0.0.13`  
状态：完整运行时纵向切片已实现；122 Node / 16 Chromium 全绿；等待最终文档 CI、Ready 与 squash merge

## Current state

006A semantic design 已通过 PR #20 squash merge：

```text
merge SHA: 575924c1f1a21a1f3740f8a4e41490ba9a2194cd
```

006B 在独立分支实现 `arrow.pincer` version 1.0.0。Canonical controls：

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

最终输出为一个 closed, counterclockwise, no-hole, simple Polygon。两条手臂通过精确 authored junction 耦合，不生成或持久化两个组件箭头。

## Completed in this milestone

### Clean-room algorithm and pure geometry

- 新增 `docs/algorithms/arrow-pincer.md`；
- 新增独立 `packages/geometry/src/pincer-arrow-frame.ts`；
- 新增 `packages/geometry/src/pincer-arrow.ts`；
- 使用一个共享 local-metre projection；
- 建立 global forward/lateral frame；
- 保留 A-to-A 和 B-to-B authored arm pairing；
- 独立构建两条 Bézier centerlines；
- 使用共享 pure head/offset/ring primitives，但不调用 double-arrow generator；
- 在 head neck plane 前裁剪 shaft centerline；
- 独立 outer/inner tension；
- authored junction 精确保留，不 clamp、不替换为 midpoint；
- 验证 junction progress/lateral zone、tail span、arm length 和 paired objective forwardness；
- 拒绝两条 arm centerline 在 junction 之外相交；
- 拼装一个 coherent Polygon ring；
- 强制 junction 在 open normalized ring 中恰好出现一次；
- 强制 finite、closed、CCW、simple topology；
- whole-arm A/B simultaneous exchange 保持 normalized geometry 不变；
- independent objective swap 改变或使 pairing geometry 无效。

### Public Definition and PlotJSON

- 新增 `packages/symbols/src/pincer-arrow.ts`；
- 注册 `PINCER_ARROW_TYPE = "arrow.pincer"`；
- Definition version `1.0.0`；
- fixed-five control schema；
- fill、outline、hit-area render roles；
- stable validation issue code `INVALID_PINCER_ARROW_GEOMETRY`；
- 更新 geometry/symbols exports 与 built-in catalog；
- PlotJSON 1.0 精确保留五个 authored controls 和 positional roles；
- 明确四控制 double-arrow data 无法 relabel 为 pincer；
- pincer parameters 不包含 double-only `branchPositionRatio` 或 `innerBridgeRatio`。

### Interaction and MapLibre

- generic `MultiPointDrawSession` 直接支持 fixed-five pincer，无 symbol-ID branch；
- 前四个 committed controls + fifth pointer candidate 生成首个完整 draft；
- 第五次有效点击自动完成；
- 无效 junction completion 保持 active、visible、replaceable；
- Store/History 只接收通过 full Registry generation 的五 authored controls；
- 五个 semantic handles；
- junction drag 同时改变两条 inner arms；
- 一次 drag 对应一次 replace history command；
- undo 恢复 exact junction。

### Playground and browser coverage

- 新增 `apps/playground/src/pincer-arrow-playground.ts`；
- Playground selector 增加第九类 `arrow.pincer`；
- 新增南京 pincer sample；
- 说明第五点击 completion 和 junction role；
- demo badge 升至 `0.0.13`；
- `apps/playground/e2e/playground.spec.ts` 扩展为九类 sample、draw、edit、undo；
- all-arrow visibility matrix 扩展为九类；
- 每类均验证 draft Source、draft actual rendering、committed Source 和 committed actual rendering。

### Tests and version

- 新增 pure geometry、Definition、PlotJSON、interaction 和 golden tests；
- 新增 `tests/fixtures/pincer-arrow.json` deterministic golden fixture；
- workspace version 升至 `0.0.13`；
- README 更新为九类 Arrow、122 Node、16 Chromium；
- `AGENTS.md` 将 pincer 提升为 public contract，并冻结 122/16 baseline。

## Validation

权威代码 CI：

```text
Run ID: 30462198386
Node 20.19: success
Node 22: success
Typecheck: success
Node tests: 122 passed / 0 failed
Playground typecheck/build: success
Handover check: success
Chromium tests: 16 passed / 0 failed
```

验证命令：

```bash
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
npm run playground:e2e
```

关键测试合同：

```text
five exact authored controls
exact junction once in open ring
whole-arm swap invariance
pairing sensitivity
finite / closed / CCW / simple ring
parameter isolation
deterministic golden fixture
Definition validation and render roles
five-control PlotJSON round trip
four-control relabel rejection
fifth-click completion
rejected junction recovery
five handles
junction edit / history / undo
nine-type actual-rendered visibility matrix
```

## Next tasks

1. 运行本交接与 `AGENTS.md` 提交后的最终 docs-inclusive CI；
2. 更新 PR #21 body 为完整 vertical-slice scope 和最终结果；
3. 检查 unresolved review threads；
4. 将 PR #21 标记 Ready；
5. 使用 current head SHA squash merge；
6. 确认 `main` 与 merge SHA identical；
7. 记录 merge finalization immutable handover；
8. 确认 Pages workflow 已由 `main` 触发；
9. 合并后优先执行 pincer quality hardening，而不是立即增加新复杂符号；
10. quality hardening 包括 asymmetric fixtures、junction admissibility calibration、antimeridian/high-latitude、视觉参数审查和用户实际绘制反馈。

## Risks and decisions

- 当前 junction admissibility 是 PlotLibre 自有的初始校准区间，后续需要更多真实点位验证；
- invalid junction 采用 fail-closed，不会通过移动 authored point 强行生成；
- pincer 使用独立 semantic frame，但复用许可明确的项目内部 pure geometry primitives；
- 公开参考仅用于 observable behavior，未复制公式、常量、点序列或类结构；
- whole-arm swap invariance 已测试，但独立 tail/objective swap 不 invariant 是 authored pairing 的预期行为；
- golden fixture 固定当前默认算法输出，未来算法修改必须显式审查 fixture 变化；
- Playground sample 与 E2E 点位证明一组稳定形状，不代表所有用户点位都必然合法；
- semantic-guide fallback 会让无效输入保持可见，但不会使其具备 completion 资格；
- 当前 packages 仍为 `UNLICENSED`，发布前仍需仓库所有者决定 license；
- 不能将 pincer 回退为四控制 double alias，也不能删掉 strict topology 以提高表面成功率。

Continuation：后续对话必须先读 `AGENTS.md`、pincer semantic design、algorithm record 与本 handover。若 PR #21 尚未合并，只完成 CI/PR/merge 闭环；若已合并，先做 pincer 质量强化与真实绘制反馈，不立即并行开发另一个复杂符号。