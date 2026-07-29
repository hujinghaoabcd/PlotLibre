# PlotLibre Development Handover — Milestone 005G Finalization

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/tailed-attack-arrow-vertical-slice`  
PR：`#13 Add tailed attack arrow vertical slice`  
Workspace：`0.0.11`

## Current state

Milestone 005G 已完成 `arrow.attack.tailed` 的代码、几何、Definition、PlotJSON、七符号 Playground、浏览器验证、算法记录和不可变详细交接。

详细记录：

```text
docs/handover/2026-07-29-milestone-005g-tailed-attack-arrow.md
```

第一轮完整权威状态：

```text
Head: f9c7418d8588ea30ba3521af7558dbda1c07b624
Run ID: 30419114264
Node 20.19: success
Node 22: success
Node tests: 90 passed
Chromium: 12 passed
/PlotLibre/ build: success
handover contract: success
```

最终文档同步提交需要再次运行同一矩阵。PR #13 当前为 Draft、mergeable。

## Completed in this milestone

### Public symbol

```text
arrow.attack.tailed
```

语义控制点与 `arrow.attack` 相同：

```text
0 + 1   = exact tail edges
2..n-2  = attack-spine controls
n-1     = exact objective/tip
```

notch roots 和 notch tip 是派生几何，不进入 PlotJSON，也不生成 handles。

### Shared frame and independent strategy

已完成：

- reuse `AttackArrowFrame`；
- preserve flat attack body/head golden coordinates；
- independent inward swallowtail closing strategy；
- exact semantic tail edges and objective；
- tail-input-order invariance；
- no flat generator duplication。

### Parameters

```text
tailNotchDepthRatio = 0.75
tailNotchWidthRatio = 0.65
```

已完成独立参数隔离、范围验证、neck-distance/neck-plane guards 和 PlotJSON round trip。

### Topology and transaction safety

已完成：

- finite/closed/CCW/simple-ring validation；
- self-intersection rejection；
- `INVALID_TAILED_ATTACK_ARROW_GEOMETRY`；
- Definition-level complete renderability validation；
- invalid previews rejected before Store mutation；
- one valid drag = one `ReplacePlotCommand`；
- undo restore；
- camera-stable deferred double-click zoom restoration。

### Playground

已完成：

- seventh selector option；
- seven Nanjing samples；
- flat and tailed attack real drawing；
- actual committed Source/rendered-feature checks；
- notch defaults；
- tailed tail-edge edit/history/undo；
- Worker and `/PlotLibre/` build regression。

### Tests

```text
Node tests: 90 passed
Chromium: 12 passed
```

新增覆盖：关系型 shared golden、exact tails/tip、input order、notch parameter isolation、topology、Definition validation、PlotJSON、real draw/render/camera/edit/history/undo。

### Clean-room record

```text
docs/algorithms/arrow-attack-tailed.md
```

仅参考公开行为和术语，未复制参考源码、常量、helper layout、参数名、类结构或公式。

## Validation

第一轮权威矩阵：

```text
Run ID: 30419114264
Node 20.19: success
Node 22: success
TypeScript/workspace: success
90 Node tests: success
Playground typecheck/build: success
handover contract: success
12 Chromium tests: success
seven-symbol committed/rendered Source: success
tailed attack draw/camera/edit/history/undo: success
```

最终文档同步 CI 全绿后才可 Ready 和合并。

## Architectural decisions

1. 平尾和燕尾攻击箭头共享 canonical control model。
2. `AttackArrowFrame` 是共享 body/head 边界。
3. 燕尾变体只拥有 closing strategy 和 notch parameters。
4. notch vertices 是派生数据，不是 semantic handles。
5. 关系型 golden 证明 shared body/head 逐坐标不变。
6. notch depth 和 opening width 是独立参数。
7. notch 必须保持在 neck 后方。
8. topology-sensitive Definition 在命令执行前验证完整可生成性。
9. MapLibre interaction 保持 Definition-driven，无 symbol ID 特判。
10. 不放宽 simple-ring policy 迁就极端参数。

## Known limitations

- notch 参数无 UI controls 或 parameter handles；
- UI 尚未显示详细 validation issue；
- committed spine controls 暂不支持插入/删除；
- 无 touch completion、snapping 或 constraints；
- local projection 不适合超大跨国符号；
- browser matrix 仅 Chromium；
- Core Store-listener exception 无通用事务回滚；
- PR #13 合并后才能验证线上七符号 Pages；
- 当前执行环境 DNS 无法直接访问 GitHub Pages。

## Next tasks

1. 等待最终文档同步 CI 全绿；
2. 更新 PR #13 最终说明；
3. 检查 review threads；
4. 将 PR #13 标记 Ready；
5. squash merge 到 `main`；
6. 验证 main CI；
7. 验证 GitHub Pages 在线页面包含七种符号；
8. 从最新 `main` 创建 Milestone 005H 分支；
9. 先完成 `arrow.double` canonical semantic design；
10. 不并行实现 pincer、route、corridor 或 squad-combat。

## Risks and decisions

### Double arrow semantic risk

`arrow.double` 不能是两个普通箭头组成的数组。它必须是共享 branch/body 的单一 semantic object。

### Canonical controls unresolved

开始 005H 编码前必须明确共享尾部、左右 objectives、中心连接/分叉控制、handedness、最小点数和 completion rule。

### Topology

双头、共享 body 和中心连接可能形成多个自交区域。必须先制定 topology policy，再实现 generator。

### Scope control

005H 只实现 `arrow.double`，不并行添加其他复杂箭头。

### Deployment

只有 PR #13 合并、Pages workflow 成功且在线页面实际出现 `arrow.attack.tailed` 后，才能宣布七符号公开部署完成。

## Continuation instructions

后续开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/algorithms/arrow-attack.md`；
3. 阅读 `docs/algorithms/arrow-attack-tailed.md`；
4. 阅读 005G 详细交接；
5. 确认 PR #13、最终 CI、main CI 和 Pages；
6. 从最新 `main` 开始 005H；
7. 保留 90 Node 和 12 Chromium 回归；
8. 先写双箭头语义设计和 clean-room 记录；
9. 完成后新增 005H immutable handover 并更新本文件。
