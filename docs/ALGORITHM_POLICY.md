# 算法研究、来源和净室实现政策

## 1. 目的

态势标绘领域存在大量相互移植的 JavaScript 代码，来源和许可证经常不清楚。PlotLibre 必须从项目初期建立可追溯的算法政策，避免未来发布、商业使用或论文引用时产生风险。

## 2. 默认策略

默认采用净室实现：

1. 研究公开 API、截图、演示和数学描述；
2. 写出独立的控制点语义和公式说明；
3. 编写行为测试；
4. 在不查看具体实现或不复制表达的前提下独立编码；
5. 通过视觉和数值测试比较行为。

## 3. 允许的来源

- 公共领域数学公式；
- 学术论文和标准中公开的几何定义；
- 许可证兼容且保留必要通知的源码；
- 项目作者明确授权的实现；
- 自主推导和原创算法。

## 4. 禁止事项

- 复制许可证不明的博客代码；
- 从闭源平台反编译；
- 复制非开源许可证下的 Mapbox 新代码；
- 删除原作者版权声明；
- 将第三方算法说成完全原创；
- 仅通过改变量名掩盖复制；
- 混用多个来源后无法说明 provenance。

## 5. 算法记录模板

每个复杂符号在实现前创建记录：

```text
Symbol type:
Implementation file:
Author:
Date:
Mathematical description:
Reference behavior:
Reference repositories and revisions:
License review:
Code reuse: none / partial / full
Required notices:
Degenerate input policy:
Tests:
```

后续可在 `docs/algorithms/` 下为每种符号建立独立文件。

## 6. 当前直箭头来源说明

`arrow.straight` 当前实现为独立基础几何实现：

- 输入两个 WGS84 控制点；
- 将终点投影到起点附近的局部米制平面；
- 根据方向向量和法向量构造尾部、颈部、箭头肩部和尖端；
- 宽度和头部长度由显式比例参数控制；
- 输出闭合 Polygon ring；
- 未复制参考库源代码。

其目标是建立架构和测试垂直切片，不代表最终传统标绘直箭头算法已经冻结。

## 7. 许可证状态

当前仓库尚未选择开源许可证，package manifest 使用 `UNLICENSED`。在选择许可证前：

- 可以继续自主开发；
- 不得引入要求传播特定许可证但未审计的代码；
- 第三方依赖必须记录许可证；
- 发布 npm 包前必须完成许可证决策。
