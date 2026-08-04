export const playgroundTemplate = `
  <div class="app-shell">
    <header class="app-header">
      <a class="brand" href="./" aria-label="PlotLibre Playground 首页">
        <span class="brand-mark" aria-hidden="true">P</span>
        <span>
          <strong>PlotLibre</strong>
          <small>MapLibre 态势标绘 Playground</small>
        </span>
      </a>
      <div class="header-links">
        <a href="https://github.com/hujinghaoabcd/PlotLibre" target="_blank" rel="noreferrer">GitHub</a>
        <span class="version-badge">v0.0.21 demo</span>
      </div>
    </header>

    <nav class="toolbar" aria-label="标绘工具栏">
      <label for="symbol-select">符号</label>
      <select id="symbol-select" data-testid="symbol-select" aria-label="选择标绘符号">
        <option value="arrow.straight">直箭头</option>
        <option value="arrow.fine">细箭头</option>
        <option value="arrow.fine.tailed">燕尾细箭头</option>
        <option value="arrow.assault-direction">突击方向</option>
        <option value="arrow.curved">曲线箭头</option>
        <option value="arrow.attack">攻击箭头</option>
        <option value="arrow.attack.tailed">燕尾攻击箭头</option>
        <option value="arrow.double">双箭头</option>
        <option value="arrow.pincer">钳形箭头</option>
      </select>
      <button id="draw-button" data-testid="draw-button" class="primary" type="button">开始绘制</button>
      <button id="cancel-button" data-testid="cancel-button" type="button">取消绘制</button>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <button id="undo-button" data-testid="undo-button" type="button">撤销</button>
      <button id="redo-button" data-testid="redo-button" type="button">重做</button>
      <button id="delete-button" data-testid="delete-button" type="button">批量删除选中</button>
      <button id="clear-button" data-testid="clear-button" type="button">清空</button>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <button id="sample-button" data-testid="sample-button" type="button">加载示例</button>
      <button id="export-button" data-testid="export-button" type="button">导出 PlotJSON</button>
      <button id="import-button" data-testid="import-button" type="button">导入 PlotJSON</button>
      <input id="import-input" type="file" accept="application/json,.json" hidden />
    </nav>

    <main class="workspace">
      <section class="map-panel" aria-label="地图标绘区域">
        <div id="map" class="map" data-testid="map"></div>
        <div class="map-help" aria-live="polite">
          <strong>操作提示</strong>
          <span id="status-text" data-testid="status-text">正在初始化地图……</span>
        </div>
      </section>

      <aside class="inspector" aria-label="标绘属性面板">
        <section class="inspector-section summary-card">
          <div>
            <span class="eyebrow">当前文档</span>
            <strong id="plot-count" data-testid="plot-count">0 个标绘</strong>
          </div>
          <div>
            <span class="eyebrow">选择 / Primary</span>
            <strong id="selected-id" data-testid="selected-id">未选择</strong>
          </div>
        </section>

        <section class="inspector-section">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Style</span>
              <h2>Primary 标绘样式</h2>
            </div>
            <span id="selection-state" class="state-pill">未选择</span>
          </div>

          <label class="field-row">
            <span>填充颜色</span>
            <input id="fill-color" data-testid="fill-color" type="color" value="#d32f2f" />
          </label>

          <label class="field-row field-row-stack">
            <span>填充透明度 <output id="fill-opacity-output">0.45</output></span>
            <input id="fill-opacity" data-testid="fill-opacity" type="range" min="0.05" max="1" step="0.05" value="0.45" />
          </label>

          <label class="field-row">
            <span>边线颜色</span>
            <input id="line-color" data-testid="line-color" type="color" value="#8e0000" />
          </label>

          <label class="field-row field-row-stack">
            <span>边线宽度 <output id="line-width-output">2 px</output></span>
            <input id="line-width" data-testid="line-width" type="range" min="1" max="8" step="1" value="2" />
          </label>
        </section>

        <section class="inspector-section">
          <span class="eyebrow">Workflow</span>
          <h2>交互说明</h2>
          <ol class="instruction-list">
            <li>普通点击替换选择；Shift 点击添加；Ctrl/Cmd 点击切换；Alt 点击移除。</li>
            <li>多选中的最后一个对象是 Primary，只有 Primary 显示语义控制点并接受样式编辑。</li>
            <li>拖动任一已选对象的主体可整体平移全部选中对象；拖动期间只更新临时预览，释放后一次原子提交。</li>
            <li>Delete/Backspace 或“批量删除选中”会生成一个历史命令；撤销恢复原文档顺序、选择集合和 Primary。</li>
            <li>整体平移按同一个局部米制向量移动全部 authored controls；Escape 取消，任一对象无效时整批拒绝。</li>
            <li>两点箭头：点击箭尾，再点击箭尖完成。</li>
            <li>曲线箭头：第一个点为尾部中心，后续点定义路径。</li>
            <li>攻击箭头：前两个点定义左右尾缘，后续点定义进攻骨架和目标。</li>
            <li>燕尾攻击箭头保留相同控制点语义，仅使用独立内凹燕尾闭合。</li>
            <li>双箭头：前两点为尾缘，后两点为两个目标；第四次点击自动完成。</li>
            <li>钳形箭头：先点两个外尾，再点两个目标（左右顺序均可），最后点内侧汇合点。</li>
            <li>分队战斗箭头：首点为尾部中心，后续点为行动路径和目标，尾宽自动派生。</li>
            <li>路线箭头：首点为路线起点，后续点定义中心路线，末点为精确目标箭尖。</li>
            <li>走廊箭头：控制点定义无方向中心路径，派生双向平头走廊。</li>
            <li>双向路线箭头：首末点均为精确箭尖，中间控制点定义共同路线。</li>
            <li>双头路线箭头：末点为精确目标，后方同向强调头自动派生。</li>
            <li>闭合曲线区域：沿边界点击至少三个途经点，双击末点或按 Enter 自动闭合。</li>
            <li>集结地：依次点击一侧翼点、前向冠点和另一侧翼点；第三点自动完成。</li>
            <li>三点圆弧：依次点击起点、弧上经过点和终点；经过点决定小弧或大弧，第三点自动完成。</li>
            <li>圆弓形区域：三个点定义圆弧，两个端点再由直线弦闭合。</li>
            <li>扇形区域：圆心、半径起点和结束方位控制点固定三点完成；第三点距离不改变半径。</li>
            <li>扇形的圆心至结束方位控制点以临时虚线显示，不进入 PlotJSON 或最终几何。</li>
            <li>可变多点标绘双击最后一点或按 Enter 完成；Backspace/Delete 逐点回退。</li>
            <li>完成后可拖动任一圆形语义控制点重新编辑。</li>
          </ol>
        </section>

        <section class="inspector-section technical-card">
          <span class="eyebrow">Architecture</span>
          <p>PlotLibre 保存 authored controls、参数、样式和元数据。选择轮廓、平移预览、LineString、Polygon 与语义引导线均为派生结果，可随编辑、算法升级或地图样式重载重新生成。</p>
        </section>
      </aside>
    </main>
  </div>
`;