# PlotLibre Development Handover — Milestone 006C Pincer Objective-Order Hotfix

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
分支：`fix/pincer-natural-objective-order`  
PR：`#23 Fix pincer fifth-click failure for natural objective order`  
Workspace：`0.0.14`  
Pincer Definition：`1.1.0`  
状态：代码与浏览器回归已全绿；等待文档包含的最终 CI、Ready、squash merge 和 Pages 部署

## Current state

用户在线上 Playground 报告：钳形箭头完成前四个点后，点击最后一个汇合点无法完成绘制。

复现的自然轮廓点序：

```text
左外尾 → 右外尾 → 右目标 → 左目标 → 内侧汇合点
```

旧版 `arrow.pincer` 1.0.0 把控制点 2、3 严格解释为与尾点 0、1 同索引配对的目标。因此上述自然轮廓顺序会形成错误的交叉配对。第五点击进入完整 renderability preflight 后，被严格几何拒绝；`MultiPointDrawSession` 按设计保持 active，Store 不增加对象，用户看到“最后一点点完失败”。

根因不是第五点没有进入会话，也不是 junction admissibility 过窄。失败发生在 objective A/B positional pairing 与用户自然点击顺序不一致。

## Completed in this milestone

- 建立用户报告的 Node 与 Chromium 回归；
- Chromium 使用“左尾、右尾、右目标、左目标、汇合点”的真实自然顺序；
- 证明第五点 pointer draft 可见；
- 证明第五次点击完成、Store 增加一个对象并产生实际 MapLibre rendered feature；
- 新增可选 `PlotDefinition.canonicalizeControlPoints`；
- 新增 `PlotRegistry.canonicalize()`；
- canonicalization 只能对已有坐标作确定性 permutation；
- 禁止 canonicalizer 添加、删除、移动、镜像、clamp 或合成控制点；
- Registry 在 validate/generate 前使用 canonical controls；
- create、replace 和 import 在 Store mutation 前持久化 canonical controls；
- 非法 canonicalizer 使用稳定 issue code `INVALID_CONTROL_POINT_CANONICALIZATION` fail closed；
- `arrow.pincer` Definition 升至 `1.1.0`；
- pincer 先尝试原始目标顺序；
- 原始顺序无效、交换 objective 2/3 后有效时，保存交换后的明确 A/B 配对；
- 两种顺序都无效时仍严格拒绝；
- pure `buildPincerArrowRing` 保持 strict positional semantics；
- 未删除 self-intersection、tail-frame、junction 或 simple-ring 检查；
- workspace/demo 升至 `0.0.14`；
- Playground 文案明确两个目标左右顺序均可；
- README 与 `AGENTS.md` 冻结 canonicalization 安全边界和新基线。

## Validation

权威代码 CI：

```text
Run ID: 30465128769
Node 20.19: success
Node 22: success
Typecheck/tests/build: success
Handover contract: success
Node tests: 124 passed / 0 failed
Chromium tests: 17 passed / 0 failed
```

关键新增断言：

```text
strict raw perimeter order is rejected by pure geometry
public Definition canonicalizes targets 2/3 only when necessary
canonicalization is idempotent
canonicalization is an exact input permutation
invented coordinates are rejected
fifth pointer candidate renders a pincer draft
fifth click completes in natural perimeter order
stored controls use canonical A/B objective roles
actual committed fill/line rendering exists
```

## Next tasks

1. 完成 README、AGENTS 和 handover 提交后的 docs-inclusive CI；
2. 更新 PR #23 body 为最终验证结果；
3. 检查 unresolved review threads；
4. 将 PR #23 标记 Ready；
5. squash merge 到 `main`；
6. 确认 merge SHA 与 `main` identical；
7. 确认 Pages workflow 完成；
8. 在线重新执行自然轮廓点序并核对 demo badge `v0.0.14`；
9. 记录 merge/deployment finalization immutable handover；
10. 后续增加无效第五点的具体 UI 错误反馈，而不是仅保持绘制状态。

## Risks and decisions

- canonicalization 是公共 Definition 能力，因此必须始终限制为 exact permutation；
- canonicalization 发生在 Registry 边界，避免纯几何 API 隐式改变语义；
- Store 和 PlotJSON 保存 canonical roles，而不是保留导致交叉的点击索引；
- pincer 只有在 direct invalid 且 swapped valid 时才交换目标，避免无条件改写用户输入；
- 两种配对都有效时保留原始点击顺序；
- 两种配对都无效时不选择“看起来较好”的形状，仍 fail closed；
- junction 不移动、不替换为 midpoint；
- 该修复不改变 double-arrow 数据模型；
- Definition 从 1.0.0 升至 1.1.0，因为公共输入规范化行为发生变化；
- 当前 UI 对真正无效的第五点仍缺少具体原因提示，这是后续交互质量任务；
- packages 仍为 `UNLICENSED`。

Continuation：若 PR #23 未合并，先完成 CI、review、merge 和 Pages 验证。若已合并，先在 live Playground 用两种目标点击顺序各绘制一次，确认均完成且导出的 PlotJSON 为 canonical objective roles；随后增加 invalid-candidate reason feedback，不要通过放宽拓扑校验解决剩余失败。
