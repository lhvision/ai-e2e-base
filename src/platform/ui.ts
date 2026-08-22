/**
 * Vercel 风格极简 UI 回归测试看板 HTML 模板（纯原生 HTML/CSS/JS，零外部依赖）
 */
export function getPlatformUiHtml(title = 'AI E2E 回归测试平台'): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #000000;
      --accents-1: #fafafa;
      --accents-2: #eaeaea;
      --accents-3: #999999;
      --accents-4: #666666;
      --accents-5: #333333;
      --success: #0070f3;
      --success-light: #e6f1fe;
      --pass: #10b981;
      --pass-bg: #ecfdf5;
      --fail: #ee0000;
      --fail-bg: #fef2f2;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      --font-mono: Menlo, Monaco, "Lucida Console", "Liberation Mono", monospace;
      --border-radius: 6px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--fg);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    header {
      border-bottom: 1px solid var(--accents-2);
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      font-size: 16px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background: var(--accents-1);
      border: 1px solid var(--accents-2);
      color: var(--accents-5);
    }
    .badge.p0 { background: #fee2e2; border-color: #fca5a5; color: #b91c1c; }
    .badge.p1 { background: #fef3c7; border-color: #fde68a; color: #b45309; }
    .badge.passed { background: var(--pass-bg); border-color: #a7f3d0; color: #065f46; }
    .badge.failed { background: var(--fail-bg); border-color: #fca5a5; color: #991b1b; }
    .badge.running { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    
    .btn {
      appearance: none;
      background: var(--fg);
      color: var(--bg);
      border: 1px solid var(--fg);
      border-radius: var(--border-radius);
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn:hover { background: #333; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      background: var(--bg);
      color: var(--fg);
      border: 1px solid var(--accents-2);
    }
    .btn-secondary:hover { background: var(--accents-1); border-color: var(--accents-3); }
    .btn-sm { padding: 3px 8px; font-size: 12px; }

    main {
      display: grid;
      grid-template-columns: 400px 1fr;
      height: calc(100vh - 61px);
    }
    .sidebar {
      border-right: 1px solid var(--accents-2);
      background: var(--accents-1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid var(--accents-2);
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--bg);
    }
    .search-box {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid var(--accents-2);
      border-radius: var(--border-radius);
      font-size: 13px;
      outline: none;
    }
    .search-box:focus { border-color: var(--fg); }
    .case-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    .group-block {
      margin-bottom: 16px;
      background: var(--bg);
      border: 1px solid var(--accents-2);
      border-radius: var(--border-radius);
      overflow: hidden;
    }
    .group-header {
      padding: 10px 12px;
      background: var(--accents-1);
      border-bottom: 1px solid var(--accents-2);
      font-size: 13px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .case-item {
      padding: 10px 12px;
      border-bottom: 1px solid var(--accents-2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 13px;
      transition: background 0.1s ease;
    }
    .case-item:last-child { border-bottom: none; }
    .case-item:hover { background: var(--accents-1); }
    .case-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .case-title {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .case-meta {
      font-size: 11px;
      color: var(--accents-4);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .content-pane {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 24px;
      gap: 24px;
    }
    .card {
      border: 1px solid var(--accents-2);
      border-radius: var(--border-radius);
      padding: 20px;
      background: var(--bg);
    }
    .card-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }
    .stat-box {
      border: 1px solid var(--accents-2);
      border-radius: var(--border-radius);
      padding: 12px;
      background: var(--accents-1);
    }
    .stat-label { font-size: 12px; color: var(--accents-4); margin-bottom: 4px; }
    .stat-value { font-size: 22px; font-weight: 600; }
    .stat-value.pass { color: var(--pass); }
    .stat-value.fail { color: var(--fail); }

    .log-box {
      font-family: var(--font-mono);
      background: #0c0c0c;
      color: #f1f1f1;
      padding: 16px;
      border-radius: var(--border-radius);
      font-size: 12px;
      line-height: 1.6;
      max-height: 320px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .results-table th {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid var(--accents-2);
      color: var(--accents-4);
      font-weight: 500;
      background: var(--accents-1);
    }
    .results-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--accents-2);
    }
    .report-link {
      color: var(--success);
      text-decoration: none;
      font-weight: 500;
    }
    .report-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>🚀</span>
      <span>${title}</span>
      <span class="badge">Node Native</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-secondary" onclick="loadCases()">刷新用例</button>
      <button id="btn-run-all" class="btn" onclick="runTests()">▶ 运行全部用例</button>
    </div>
  </header>

  <main>
    <aside class="sidebar">
      <div class="sidebar-header">
        <input type="text" id="case-search" class="search-box" placeholder="搜索测试用例或分组..." oninput="filterCases()" />
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--accents-4);">
          <span id="case-count">加载中...</span>
          <span id="group-count"></span>
        </div>
      </div>
      <div class="case-list" id="case-list-container">
        <!-- 用例分组动态渲染 -->
      </div>
    </aside>

    <section class="content-pane">
      <!-- 概览卡片 -->
      <div class="card">
        <div class="card-title">
          <span>📊 最新运行概览</span>
          <span id="run-status-badge" class="badge">就绪</span>
        </div>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">执行用例数</div>
            <div class="stat-value" id="stat-total">0</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">通过 (Passed)</div>
            <div class="stat-value pass" id="stat-passed">0</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">失败 (Failed)</div>
            <div class="stat-value fail" id="stat-failed">0</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">总耗时</div>
            <div class="stat-value" id="stat-duration">0s</div>
          </div>
        </div>
      </div>

      <!-- 执行日志与实时流 -->
      <div class="card">
        <div class="card-title">
          <span>💻 运行日志 (Console Output)</span>
          <button class="btn btn-secondary btn-sm" onclick="clearLogs()">清空</button>
        </div>
        <pre class="log-box" id="log-output">点击左侧用例或右上角【运行全部用例】开始测试...</pre>
      </div>

      <!-- 详细结果列表 -->
      <div class="card">
        <div class="card-title">
          <span>📋 用例结果与 Midscene 视觉报告</span>
        </div>
        <table class="results-table">
          <thead>
            <tr>
              <th>测试用例</th>
              <th>状态</th>
              <th>耗时</th>
              <th>Midscene 视觉报告</th>
            </tr>
          </thead>
          <tbody id="results-table-body">
            <tr>
              <td colspan="4" style="text-align: center; color: var(--accents-3); padding: 24px;">暂无执行结果</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <script>
    let allCases = [];
    let isRunning = false;

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    async function loadCases() {
      try {
        const res = await fetch('/api/cases');
        allCases = await res.json();
        renderCases(allCases);
      } catch (err) {
        document.getElementById('log-output').textContent = '加载用例失败: ' + err.message;
      }
    }

    function renderCases(cases) {
      const container = document.getElementById('case-list-container');
      container.innerHTML = '';

      if (!cases || cases.length === 0) {
        document.getElementById('case-count').textContent = '共 0 条用例';
        document.getElementById('group-count').textContent = '0 个分组';
        container.innerHTML = '<div style="text-align: center; color: var(--accents-4); padding: 40px 16px; font-size: 13px;">暂未发现测试用例<br/><small style="color: var(--accents-3); margin-top: 8px; display: block;">请在 tests/ 目录下添加 *.spec.ts 文件</small></div>';
        return;
      }
      
      const groups = {};
      cases.forEach(c => {
        const g = c.group || c.describe || '默认分组';
        if (!groups[g]) groups[g] = [];
        groups[g].push(c);
      });

      const groupKeys = Object.keys(groups);
      document.getElementById('case-count').textContent = '共 ' + cases.length + ' 条用例';
      document.getElementById('group-count').textContent = groupKeys.length + ' 个分组';

      groupKeys.forEach(gName => {
        const groupEl = document.createElement('div');
        groupEl.className = 'group-block';
        
        const headerEl = document.createElement('div');
        headerEl.className = 'group-header';
        headerEl.innerHTML = '<span>' + escapeHtml(gName) + ' (' + groups[gName].length + ')</span>' +
          '<button class="btn btn-secondary btn-sm" data-action="run-group" data-group="' + escapeHtml(gName) + '">跑本组</button>';
        groupEl.appendChild(headerEl);

        groups[gName].forEach(c => {
          const itemEl = document.createElement('div');
          itemEl.className = 'case-item';
          const pClass = c.priority ? c.priority.toLowerCase() : '';
          const badgeHtml = c.priority ? '<span class="badge ' + pClass + '">' + escapeHtml(c.priority) + '</span>' : '';
          const fileName = c.file ? c.file.split(/[/\\]/).pop() : 'spec';
          
          itemEl.innerHTML = 
            '<div class="case-info">' +
              '<div class="case-title" title="' + escapeHtml(c.title) + '">' + escapeHtml(c.title) + '</div>' +
              '<div class="case-meta">' + badgeHtml + '<span>' + escapeHtml(fileName) + ':' + c.line + '</span></div>' +
            '</div>' +
            '<button class="btn btn-secondary btn-sm" data-action="run-single" data-title="' + escapeHtml(c.title) + '">执行</button>';
          groupEl.appendChild(itemEl);
        });

        container.appendChild(groupEl);
      });
    }

    // 事件委托统一处理点击
    document.getElementById('case-list-container').addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      const action = target.getAttribute('data-action');
      if (action === 'run-group') {
        const group = target.getAttribute('data-group');
        if (group) runTests({ grep: group });
      } else if (action === 'run-single') {
        const title = target.getAttribute('data-title');
        if (title) runTests({ grep: title });
      }
    });

    function filterCases() {
      const q = document.getElementById('case-search').value.trim().toLowerCase();
      if (!q) return renderCases(allCases);
      const filtered = allCases.filter(c => 
        (c.title && c.title.toLowerCase().includes(q)) || 
        (c.group && c.group.toLowerCase().includes(q)) ||
        (c.describe && c.describe.toLowerCase().includes(q))
      );
      renderCases(filtered);
    }

    async function runTests(opts = {}) {
      if (isRunning) return;
      isRunning = true;
      updateRunState(true);

      const logEl = document.getElementById('log-output');
      logEl.textContent = '🚀 [Platform] 启动测试任务中...\n';
      
      const payload = {
        grep: opts.grep,
        specFiles: opts.specFiles
      };

      try {
        const res = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        logEl.textContent = data.rawOutput || (data.success ? '✅ 测试执行成功完成' : '❌ 测试执行失败');
        renderResults(data);
      } catch (err) {
        logEl.textContent += '\n❌ 运行请求异常: ' + err.message;
      } finally {
        isRunning = false;
        updateRunState(false);
      }
    }

    function updateRunState(running) {
      const badge = document.getElementById('run-status-badge');
      const btnAll = document.getElementById('btn-run-all');
      if (running) {
        badge.className = 'badge running';
        badge.textContent = '运行中...';
        btnAll.disabled = true;
      } else {
        badge.className = 'badge';
        badge.textContent = '已完成';
        btnAll.disabled = false;
      }
    }

    function renderResults(data) {
      const results = data.results || [];
      const passed = results.filter(r => r.status === 'passed').length;
      const failed = results.filter(r => r.status === 'failed' || r.status === 'timedOut').length;

      document.getElementById('stat-total').textContent = results.length;
      document.getElementById('stat-passed').textContent = passed;
      document.getElementById('stat-failed').textContent = failed;
      document.getElementById('stat-duration').textContent = ((data.durationMs || 0) / 1000).toFixed(1) + 's';

      const tbody = document.getElementById('results-table-body');
      tbody.innerHTML = '';

      if (results.length === 0) {
        const emptyMsg = data.success 
          ? '测试进程已执行完成（未产生结构化用例，请查看控制台日志）' 
          : '未产生用例结果（执行异常，请查看控制台日志）';
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--accents-3); padding: 24px;">' + emptyMsg + '</td></tr>';
        return;
      }

      results.forEach(r => {
        const tr = document.createElement('tr');
        const statusClass = r.status === 'passed' ? 'passed' : 'failed';
        const safeReportUrl = r.midsceneReportUrl ? escapeHtml(encodeURI(r.midsceneReportUrl)) : '';
        const reportCell = safeReportUrl 
          ? '<a class="report-link" href="' + safeReportUrl + '" target="_blank">🔍 查看 Midscene 视觉报告 ↗</a>'
          : '<span style="color: var(--accents-3)">无视觉报告</span>';

        tr.innerHTML = 
          '<td><strong>' + escapeHtml(r.testTitle) + '</strong><br/><small style="color: var(--accents-4)">' + escapeHtml(r.suiteTitle) + '</small></td>' +
          '<td><span class="badge ' + statusClass + '">' + escapeHtml(r.status) + '</span></td>' +
          '<td>' + ((r.durationMs || 0) / 1000).toFixed(2) + 's</td>' +
          '<td>' + reportCell + '</td>';
        tbody.appendChild(tr);
      });
    }

    function clearLogs() {
      document.getElementById('log-output').textContent = '';
    }

    // 初始加载
    loadCases();
  </script>
</body>
</html>
`
}
