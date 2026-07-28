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
        <span class="version-badge">v0.0.10 demo</span>
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
      </select>
      <button id="draw-button" data-testid="draw-button" class="primary" type="button">开始绘制</button>
      <button id="cancel-button" data-testid="cancel-button" type="button">取消绘制</button>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <button id="undo-button" data-testid="undo-button" type="button">撤销</button>
      <button id="redo-button" data-testid="redo-button" type="button">重做</button>
      <button id="delete-button" data-testid="delete-button" type="button">删除选中</button>
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
            <span class="eyebrow">选中对象</span>
            <strong id="selected-id" data-testid="selected-id">未选择</strong>
          </div>
        </section>

        <section class="inspector-section">
          <div class="section-heading">
            <div>
              <span class="eyebrow">Style</span>
              <h2>选中箭头样式</h2>
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
            <li>两点箭头：点击箭尾，再点击箭尖完成。</li>
            <li>曲线箭头：第一个点为尾部中心，后续点定义路径。</li>
            <li>攻击箭头：前两个点定义左右尾缘，后续点定义进攻骨架和目标。</li>
            <li>多点箭头从第三个候选点开始显示合法预览。</li>
            <li>双击最后一点或按 Enter 完成；Backspace/Delete 逐点回退。</li>
            <li>完成后可拖动任一圆形语义控制点重新编辑。</li>
          </ol>
        </section>

        <section class="inspector-section technical-card">
          <span class="eyebrow">Architecture</span>
          <p>PlotLibre 保存控制点、参数和样式。地图上的 Polygon 是派生结果，可随编辑、算法升级或地图样式重载重新生成。</p>
        </section>
      </aside>
    </main>
  </div>
`;
