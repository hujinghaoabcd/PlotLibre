# PlotLibre Design Notes

本目录保存公共符号在 geometry 实现前冻结的语义设计，以及多个相关符号共享数学基础时的组设计。

设计文档应回答：

- 公共 `plotType` 和 Definition version；
- authored control roles；
- 控制点顺序和交换不变量；
- derived geometry 边界；
- completion contract；
- validation 和退化输入策略；
- PlotJSON 与 migration 边界；
- shared frame 与独立 public semantics；
- clean-room research boundary；
- test plan 和 non-goals。

## 当前设计文档

| 文档 | 范围 | 当前状态 |
|---|---|---|
| `arrow-double-semantic-design.md` | 四控制双箭头、无序 tail/objective pairs、derived branch | 已实现，`arrow.double@1.0.0` |
| `arrow-pincer-semantic-design.md` | 五控制钳形箭头、paired arms、authored inner junction | 已实现并升级为 `arrow.pincer@1.1.0` |
| `route-corridor-group.md` | 共享 PathRibbon 的有向 route 与无向 flat-cap corridor | 已实现并合并 |
| `route-multihead-group.md` | bidirectional exact-two-tip route 与 derived-secondary-head route | 已实现并合并 |

## 下一设计任务

Milestone 006I 需要新增闭合行动区域组设计，候选包括：

```text
area.closed-curve
area.gathering-place
area.route-loop
```

设计阶段必须先决定：

1. controls 位于 boundary、center path 还是具有专门角色；
2. 最少和最多控制点；
3. automatic closure 是否仅为 derived ring behavior；
4. control order 是否具有方向含义；
5. reversal 是否保持 geometry；
6. Polygon/LineString/MultiPolygon 输出；
7. 是否允许 holes；006I 默认不允许；
8. self-intersection、duplicate 和 sharp-return policy；
9. 哪些候选具有真正独立语义；
10. PlotJSON 和 migration boundary。

`area.route-loop` 只有在能够证明独立路线或方向语义时才应成为 public Definition；若只是 closed curve 的参数变体，应从 006I 公共范围中删除。

## 状态说明

历史设计文档中的页首状态可能保留设计当时的事实，例如“geometry not yet implemented”。不可通过重写 immutable history 伪造当时状态。当前实现状态以：

```text
main source
README.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
latest merged PR
```

共同确定。
