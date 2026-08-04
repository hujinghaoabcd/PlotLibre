# PlotLibre Milestone 006I Handover — Closed Action Area Group

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
基线：`main@a883cbf382b61309e7d64e788e46d9319b8c0ea1`  
分支：`agent/006i-closed-action-area-group`  
PR：`#31 Add closed action area symbol group`  
验证 head：`145e6fe007353c39c5f71a13f0e54cbfe509b949`  
权威候选 CI：run `30883349847` / `#292`  
Workspace：`0.0.19`

## Milestone scope

006I 是 PlotLibre 第一个 Area family 纵向切片。公共范围固定为：

```text
area.closed-curve@1.0.0
area.gathering-place@1.0.0
```

明确延期：

```text
area.route-loop
```

`area.route-loop` 只有在具有独立路线、方向、入口/出口或行动语义时才可成为公共 Definition。样式或默认参数不同的 closed curve 不构成独立符号。

## Public semantic contracts

### `area.closed-curve`

Canonical controls：3–64 个有序边界途经点。

```text
0..n-1 authored boundary waypoints
```

- periodic Hermite/Catmull–Rom curve 插值每个 authored control；
- 最后一个 span 自动回到首点；
- authored controls 不保存重复首点；
- 双击末点或 Enter 完成；
- reversing traversal 保持 footprint contract；
- canonical authored order 不因 output winding normalization 被静默改写。

### `area.gathering-place`

Canonical controls：

```text
0 flank A
1 front crown
2 flank B
```

- 固定三点，第三次点击自动完成；
- 两个 flank 是无序语义对；
- canonicalization 只允许 indices `0`/`2` 的确定性 permutation；
- crown 保持 exact index `1`；
- rear closure anchor 从 flank midpoint 和 crown direction 派生；
- rear anchor 不进入 Store、History、handles 或 PlotJSON。

## Geometry implementation

新增：

```text
packages/geometry/src/closed-area.ts
```

主要能力：

- local-metre projection；
- circular longitude mean + mean latitude projection origin；
- traversal-order-independent projection frame；
- periodic cubic Hermite/Catmull–Rom sampling；
- exact authored-control interpolation；
- gathering-place rear-anchor derivation；
- explicit ring closure；
- counterclockwise winding normalization；
- finite、signed-area 和 simple-ring validation；
- WGS84 unprojection。

Fail-closed conditions：

- control count 不符合 Definition；
- 非有限或非法 WGS84 positions；
- pairwise duplicate controls；
- ambiguous global longitude centre；
- invalid tension、segments 或 rear-depth parameters；
- derived rear anchor collapse；
- zero/near-zero area；
- sampled ring self-intersection。

不允许静默删除 authored controls、polygonize 自交或回退到 raw authored polygon。

## Symbols and Registry

新增：

```text
packages/symbols/src/closed-curve.ts
packages/symbols/src/gathering-place.ts
```

更新：

```text
packages/symbols/src/catalog.ts
packages/symbols/src/index.ts
packages/symbols/src/style.ts
```

决策：

- 保持现有 `arrowSymbols` 数组兼容；
- 新增 `areaSymbols`；
- `builtInSymbols` 扩展到 16；
- 新增 `DEFAULT_AREA_STYLE`，不沿用 Arrow 默认红色；
- 两个 Area Definitions 各自拥有独立 public identifier、control schema、parameters 和 default style contract。

## Canonical state and PlotJSON

持久化：

```text
plotType
definitionVersion
authored canonical controlPoints
explicit parameters
style
metadata
revision
```

禁止持久化：

```text
closing duplicate
periodic curve samples
winding-normalized copies
gathering rear anchor
rendered Polygon coordinates
```

Create、replace 和 import 继续在 Store mutation 前执行 full Registry generation preflight。

## Interaction and Playground

新增：

```text
apps/playground/src/closed-action-area-playground.ts
apps/playground/e2e/closed-action-area.spec.ts
```

交互：

- 两个 Area Definitions 均通过 schema-driven `MultiPointDrawSession`；
- closed curve 在第三个 pointer candidate 起显示完整 draft；
- closed curve 双击/Enter 完成且不重复 terminal point；
- gathering place 在第三个 pointer candidate 显示完整 draft；
- gathering place 第三次 authored click 自动完成；
- committed handles 只对应 authored controls。

Playground：

- workspace badge 更新为 `0.0.19`；
- 生产与 `?basemap=none` 模式加载 16 类南京样例；
- 基础 `?e2e=1` 保留原九类 selector compatibility surface；
- 完整 E2E 使用 `?e2e=1&squad=1&paths=1&areas=1`；
- generic listeners 在 `PlaygroundApp.start()` 中先绑定；
- symbol-specific listeners 后绑定，防止 actionable rejection guidance 被通用状态覆盖；
- production 在 installer wrapping 后重新调用完整 `loadSample()`，E2E 保持空 Store。

## Tests

新增 Node 文件：

```text
tests/closed-action-area.test.mjs
```

新增 9 项 Node coverage：

- periodic interpolation；
- authored-control preservation；
- finite/closed/CCW/simple ring；
- reversed closed-curve traversal；
- gathering flank canonicalization；
- rear-depth parameter isolation；
- Registry render roles；
- invalid inputs and parameters；
- PlotJSON authored-control round trip。

Node suite：

```text
154 → 163
```

新增 3 项 Chromium coverage：

- 16-symbol selector/sample catalog；
- closed-curve actual draft and committed rendering；
- gathering-place third-pointer draft and fixed-three completion。

Chromium suite：

```text
20 → 23
```

## Validation

权威候选 run：

```text
GitHub Actions run: 30883349847 (#292)
head SHA:           145e6fe007353c39c5f71a13f0e54cbfe509b949
Node 20.19:         success
Node 22:            success
TypeScript:         success
Node tests:         163 passed / 0 failed
Playground typecheck: success
Playground build:   success
handover contract:  success
Chromium tests:     23 passed / 0 failed
unresolved threads: 0
```

Chromium 日志明确记录：

```text
Running 23 tests using 1 worker
23 passed (1.3m)
```

由于本 immutable handover 本身会生成新的 branch head，PR 在合并前仍需对最终文档 head 再执行一次完整 CI。run #292 是实现候选的权威证据，不替代最终文档 head gate。

## Clean-room provenance

行为与命名交叉研究：

```text
sakitam-fdd/ol-plot
revision c919e60b4edeaeca53c08f9552f793b2ae9537f0

sakitam-fdd/maptalks.plot
revision 37dab8d0dd31650540146e1e0f03f54982f01799
```

用途仅限：

- 公共名称；
- observable control-count behavior；
- closed curve 与 gathering place 的独立身份；
- 测试预期研究。

Code reuse：`none`。PlotLibre 独立使用标准 Hermite/Catmull–Rom 数学，并保持自己的 projection、topology、Definition、interaction、Registry 和 PlotJSON 架构。

## Architecture decisions

1. Area family 不复用 arrow head、shaft、neck、notch 或 route-ribbon 语义；
2. related Area Definitions 只共享纯 cyclic closed geometry；
3. `area.closed-curve` 不 canonicalize authored order；
4. `area.gathering-place` 只 canonicalize flank pair；
5. output Polygon 是 derived state；
6. no holes / no MultiPolygon in 1.0.0；
7. topology validation 不因困难输入而弱化；
8. local-metre mode 不隐式承诺全球尺度支持；
9. production catalog 与 base E2E compatibility surface 明确分离；
10. symbol-specific UI guidance 的事件顺序是可测试行为契约。

## Known risks

- packages 仍为 `UNLICENSED`；
- root workspace 与 public package versions 尚未统一；
- PlotJSON 缺正式 JSON Schema 和 migration framework；
- Store/History 缺多对象事务、持久化和通用 rollback；
- closed-area 1.0 不支持 holes、MultiPolygon、polar 或 global ambiguous extents；
- Vite JS bundle 约 `1,067.41 kB`，需要后续 code splitting；
- connector 工作流无法删除已合并分支；
- Pages live 状态必须在合并后的部署 workflow 与人工访问中分别确认。

## Continuation

PR #31 的剩余流程：

1. 对包含本 handover 的最终 head 执行完整 CI；
2. 确认 163 Node、23 Chromium、build 和 handover 全绿；
3. 再确认 unresolved review threads = 0；
4. 标记 Ready；
5. 使用 expected final head SHA squash merge；
6. 通过单独 post-merge finalization 更新 `LATEST.md` 的真实 squash SHA；
7. 从最终 `main` 创建 `agent/006j-arc-sector-lune-design`；
8. 先冻结 arc/sector/lune 控制点、方向、输出类型和 geodesic policy；
9. 不在 006I PR 中加入 006J geometry；
10. 不返回 pincer hardening，不增加 route-head variants。
