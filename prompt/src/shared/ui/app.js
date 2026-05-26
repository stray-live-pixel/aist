(() => {
  const SNAPSHOT = (typeof window !== 'undefined')
    && (window.__AGENT_AUTO_SNAPSHOT__ || window.__CLAUDE_AUTO_SNAPSHOT__);
  const isSnapshot = !!SNAPSHOT;
  const params = new URLSearchParams(window.location.search);
  const session = isSnapshot ? (SNAPSHOT.session || '') : (params.get('session') || '');

  const stateNode = document.getElementById('state');
  const sessionNode = document.getElementById('session');
  const pidNode = document.getElementById('pid');
  const modeNode = document.getElementById('mode');
  const logfileNode = document.getElementById('logfile');
  const pageTitle = document.getElementById('page-title');
  const sessionViewMode = document.getElementById('session-view-mode');
  const stopBtn = document.getElementById('stop-server');
  const serverState = document.getElementById('server-state');
  const pipelineCard = document.getElementById('pipeline-card');
  const pipelineTitle = document.getElementById('pipeline-title');
  const pipelineStatus = document.getElementById('pipeline-status');
  const pipelineError = document.getElementById('pipeline-error');
  const logTitle = document.getElementById('log-title');

  const logBody = document.getElementById('log-body');
  const logCounter = document.getElementById('log-counter');
  const logDuration = document.getElementById('log-duration');
  const stageTabsNode = document.getElementById('pipeline');
  const viewToggle = document.getElementById('log-view');
  const eventFilterToggle = document.getElementById('log-filter');
  const copyBtn = document.getElementById('copy-log');
  const contextModal = document.getElementById('context-modal');
  const contextModalContent = document.getElementById('context-modal-content');
  const contextModalClose = document.getElementById('context-modal-close');
  const logSearchInput = document.getElementById('log-search');

  const sessionBase = `/.agent-auto-logs/${encodeURIComponent(session)}`;
  const statusUrl = `${sessionBase}/status.json`;
  const logJsonlUrl = `${sessionBase}/log.jsonl`;
  const flowUrl = `${sessionBase}/flow.json`;
  const commandUrl = `${sessionBase}/command.txt`;

  const ACTION_META = {
    ASSISTANT: { label: 'ASSISTANT', emoji: '🧠', cssClass: 'assistant', important: true },
    DONE: { label: 'DONE', emoji: '✅', cssClass: 'done', important: true },
    STAGE: { label: 'STAGE', emoji: '🎬', cssClass: 'stage', important: true },
    STAGE_CTX: { label: 'CTX', emoji: '📋', cssClass: 'stage-ctx', important: true },
    FLOW: { label: 'FLOW', emoji: '🧩', cssClass: 'flow', important: true },
    WRITE: { label: 'WRITE', emoji: '✍️', cssClass: 'write', important: true },
    RESULT: { label: 'RESULT', emoji: '🧪', cssClass: 'result', important: true },
    ERROR: { label: 'ERROR', emoji: '🚫', cssClass: 'error', important: true },
    SYS: { label: 'SYS', emoji: '🛰️', cssClass: 'sys', important: true },
    DRY: { label: 'DRY', emoji: '🧊', cssClass: 'dry', important: true },
    BASH: { label: 'BASH', emoji: '💻', cssClass: 'bash', important: false },
    EVENT: { label: 'EVENT', emoji: '📡', cssClass: 'event', important: false },
    EVENTS: { label: 'EVENTS', emoji: '📡', cssClass: 'event', important: false },
    THINK: { label: 'THINK', emoji: '💭', cssClass: 'think', important: false },
    THINKING: { label: 'THINK', emoji: '💭', cssClass: 'think', important: false },
    INFO: { label: 'INFO', emoji: 'ℹ️', cssClass: 'info', important: false },
    DRY_RUN: { label: 'DRY', emoji: '🧊', cssClass: 'dry', important: true },
  };

  const DEFAULT_ACTION_META = {
    label: 'EVENT',
    emoji: '📌',
    cssClass: 'other',
    important: true,
  };

  const IMPORTANT_FILTER_ACTIONS = new Set(
    Object.entries(ACTION_META)
      .filter(([, meta]) => meta.important)
      .map(([action]) => action),
  );

  const ui = {
    entries: [],
    rendered: 0,
    viewMode: 'cards',
    eventFilter: 'important',
    searchQuery: '',
    stageFilter: 'all',
    flow: null,
    status: null,
    knownStages: '',
  };
  let serverDown = false;
  let timer = null;

  if (!session) {
    stateNode.textContent = 'не задана';
    stateNode.className = 'status-finished';
    if (pageTitle) pageTitle.textContent = 'Agent Auto Monitor';
    if (sessionViewMode) {
      sessionViewMode.textContent = 'режим: неизвестен';
      sessionViewMode.classList.remove('session-mode-live', 'session-mode-snapshot');
    }
    logBody.innerHTML = '<p class="log-empty">Откройте страницу по ссылке вида:<br/>/ui?session=ID</p>';
    stopBtn.disabled = true;
    return;
  }

  sessionNode.textContent = session;
  if (sessionViewMode) {
    sessionViewMode.textContent = 'режим: живой просмотр';
    sessionViewMode.classList.remove('session-mode-snapshot');
    sessionViewMode.classList.add('session-mode-live');
  }
  if (pageTitle) pageTitle.textContent = 'Agent Auto Monitor';
  applyLogMode();
  applyEventFilter();

  // ─── helpers ────────────────────────────────────────────────────────────
  function setStatusClass(status) {
    stateNode.classList.remove('status-running', 'status-finished', 'status-stopped');
    if (status === 'running') stateNode.classList.add('status-running');
    else if (status === 'stopped') stateNode.classList.add('status-stopped');
    else stateNode.classList.add('status-finished');
  }

  function formatDuration(ms) {
    if (ms == null || isNaN(ms) || ms < 0) return '—';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}ч ${m}м ${s}с`;
    if (m > 0) return `${m}м ${s}с`;
    return `${s}с`;
  }

  function parseTs(s) {
    if (!s) return null;
    const d = new Date(s);
    const t = d.getTime();
    return isNaN(t) ? null : t;
  }

  function durationOf(startedAt, finishedAt, isRunning) {
    const start = parseTs(startedAt);
    if (start == null) return null;
    const end = parseTs(finishedAt) ?? (isRunning ? Date.now() : null);
    if (end == null) return null;
    return Math.max(0, end - start);
  }

  function normalizeAction(action) {
    return String(action || 'INFO').toUpperCase();
  }

  function actionMeta(action) {
    const key = normalizeAction(action);
    return ACTION_META[key] || {
      ...DEFAULT_ACTION_META,
      label: key,
    };
  }

  function agentName(engine) {
    return String(engine || 'claude').toLowerCase() === 'codex' ? 'Codex' : 'Claude';
  }

  function isImportantEntry(entry) {
    const key = normalizeAction(entry && entry.action);
    if (key === 'SYS') {
      const text = String(entry && (entry.text || entry.textShort || '')).toLowerCase();
      if (text.startsWith('system event: status')) return false;
    }
    return IMPORTANT_FILTER_ACTIONS.has(key);
  }

  function getSearchQuery() {
    return ui.searchQuery.trim().toLowerCase();
  }

  function matchesSearch(entry) {
    const query = getSearchQuery();
    if (!query) return true;
    const text = [
      entry.action,
      entry.text,
      entry.textShort,
      entry.tsHuman,
      entry.ts,
      entry.ctxK,
      entry.ctxLimitK,
      entry.stage,
    ]
      .filter((value) => value !== undefined && value !== null)
      .join(' ')
      .toLowerCase();

    const terms = query.split(/\s+/).filter(Boolean);
    return terms.every((term) => text.includes(term));
  }

  // ─── data fetching ──────────────────────────────────────────────────────
  function parseJsonl(text) {
    const out = [];
    if (!text) return out;
    for (const line of text.split('\n')) {
      if (!line) continue;
      try { out.push(JSON.parse(line)); }
      catch (e) { /* partial trailing line during write — skip */ }
    }
    return out;
  }

  function applyLogMode() {
    if (!viewToggle) return;
    for (const b of viewToggle.querySelectorAll('button[data-mode]')) {
      b.classList.toggle('active', b.dataset.mode === ui.viewMode);
    }
  }

  function applyEventFilter() {
    if (!eventFilterToggle) return;
    for (const b of eventFilterToggle.querySelectorAll('button[data-event-filter]')) {
      b.classList.toggle('active', b.dataset.eventFilter === ui.eventFilter);
    }
  }

  async function fetchAll() {
    const [statusResp, logResp, flowResp] = await Promise.all([
      fetch(statusUrl, { cache: 'no-store' }),
      fetch(logJsonlUrl, { cache: 'no-store' }),
      fetch(flowUrl, { cache: 'no-store' }),
    ]);
    return { statusResp, logResp, flowResp };
  }

  // ─── header / pipeline ────────────────────────────────────────────────
  function paintStatus(data) {
    ui.status = data;
    const agent = agentName(data.engine);
    const title = `${agent} Auto Monitor${isSnapshot ? ' (история)' : ''}`;
    if (pageTitle) pageTitle.textContent = title;
    document.title = title;
    if (logTitle) logTitle.textContent = `Логи ${agent}`;
    stateNode.textContent = data.status || 'unknown';
    setStatusClass(data.status);
    pidNode.textContent = data.pid || '—';
    modeNode.textContent = data.engine ? `${data.mode || '—'} / ${data.engine}` : (data.mode || '—');
    logfileNode.textContent = data.logFile || '—';
  }

  function paintFlow(data) {
    ui.flow = data;
    if (!data || !data.flow) {
      pipelineCard.hidden = true;
      return;
    }
    pipelineCard.hidden = false;
    pipelineTitle.textContent = data.title || data.flow;
    pipelineStatus.textContent = data.status || '—';
    pipelineStatus.className = 'pipeline-status status-' + (data.status || 'pending');

    if (data.status === 'error' && data.error) {
      pipelineError.hidden = false;
      pipelineError.textContent = data.error;
    } else {
      pipelineError.hidden = true;
      pipelineError.textContent = '';
    }
  }

  function normalizeCtxPct(entry) {
    const explicit = Number(entry.ctxPct);
    if (Number.isFinite(explicit)) return Math.max(0, Math.min(100, Math.round(explicit)));
    const ctxK = Number(entry.ctxK || 0);
    const ctxLimitK = Number(entry.ctxLimitK || 0);
    if (!ctxLimitK) return 0;
    return Math.max(0, Math.min(100, Math.round((ctxK / ctxLimitK) * 100)));
  }

  function showContextDetails(entry) {
    const ctxK = Number(entry.ctxK || 0);
    const ctxLimitK = Number(entry.ctxLimitK || 0);
    const ctxPct = normalizeCtxPct(entry);
    const usedTokens = Number.isFinite(Number(entry.contextTokens))
      ? Math.max(0, Math.round(Number(entry.contextTokens)))
      : ctxK * 1000;
    const limitTokens = Math.max(0, Math.round(ctxLimitK * 1000));
    const remTokens = Math.max(0, limitTokens - usedTokens);
    const fmt = (v) => (Number.isFinite(v) ? v.toLocaleString('ru-RU') : '—');
    const model = [
      `Контекст: ${ctxK}k / ${ctxLimitK}k (${ctxPct}%)`,
      `Использовано: ${fmt(usedTokens)} токенов`,
      `Лимит: ${fmt(limitTokens)} токенов`,
      `Остаток: ${fmt(remTokens)} токенов`,
    ];
    if (!contextModal || !contextModal.showModal || !contextModalContent) {
      alert(model.join('\n'));
      return;
    }

    contextModalContent.textContent = model.join('\n');
    contextModal.showModal();
    if (contextModalClose) contextModalClose.focus();
  }

  function createContextChart(entry) {
    const ctxK = Number(entry.ctxK || 0);
    const pct = normalizeCtxPct(entry);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'le-ctx-chart';
    btn.dataset.used = `${ctxK}k`;
    btn.style.setProperty('--ctx-pct', `${pct}%`);
    btn.title = `Контекст: ${ctxK}k / ${entry.ctxLimitK || 0}k`;
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      showContextDetails(entry);
    });
    return btn;
  }

  // ─── stage tabs ─────────────────────────────────────────────────────────
  function stageInfo(idx) {
    if (!ui.flow || !Array.isArray(ui.flow.stages)) return null;
    return ui.flow.stages.find((s) => s.index === idx) || null;
  }

  function tabSignature() {
    const stages = (ui.flow && ui.flow.stages) || [];
    return stages.map((s) => `${s.index}:${s.title || s.file || ''}`).join('|');
  }

  function rebuildStageTabs() {
    const sig = tabSignature();
    if (sig === ui.knownStages) return;
    ui.knownStages = sig;

    const stages = (ui.flow && ui.flow.stages) || [];
    stageTabsNode.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.dataset.stage = 'all';
    allBtn.className = 'stage-tab';
    allBtn.textContent = 'Все';
    stageTabsNode.appendChild(allBtn);

    for (const stage of stages) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.stage = String(stage.index);
      btn.className = 'stage-tab';
      const titleSpan = document.createElement('span');
      titleSpan.textContent = `${stage.index}. ${stage.title || stage.file || `Stage ${stage.index}`}`;
      btn.appendChild(titleSpan);

      if (stage.mode) {
        const mode = document.createElement('span');
        mode.className = 'stage-mode';
        mode.textContent = stage.mode;
        btn.appendChild(mode);
      }

      if (stage.model) {
        const model = document.createElement('span');
        model.className = 'stage-model';
        model.textContent = stage.model;
        model.title = `model: ${stage.model}`;
        btn.appendChild(model);
      }

      const dur = document.createElement('span');
      dur.className = 'stage-tab-duration';
      btn.appendChild(dur);
      stageTabsNode.appendChild(btn);
    }

    // Если выбранный стейдж исчез — откатиться на All.
    if (ui.stageFilter !== 'all') {
      const exists = stages.some((s) => s.index === ui.stageFilter);
      if (!exists) ui.stageFilter = 'all';
    }
    applyActiveTab();
  }

  function applyActiveTab() {
    for (const btn of stageTabsNode.querySelectorAll('button')) {
      const isActive =
        (ui.stageFilter === 'all' && btn.dataset.stage === 'all') ||
        (ui.stageFilter !== 'all' && Number(btn.dataset.stage) === ui.stageFilter);
      btn.classList.toggle('active', isActive);
    }
  }

  function refreshStageDurations() {
    if (!stageTabsNode) return;
    const current = Number(ui.flow && ui.flow.current ? ui.flow.current : 0);
    for (const btn of stageTabsNode.querySelectorAll('button')) {
      if (btn.dataset.stage === 'all') continue;
      const idx = Number(btn.dataset.stage);
      const stage = stageInfo(idx);
      const durEl = btn.querySelector('.stage-tab-duration');
      if (!stage || !durEl) continue;
      const ms = durationOf(stage.startedAt, stage.finishedAt, stage.status === 'running');
      durEl.textContent = ms == null ? '' : formatDuration(ms);
      btn.classList.remove('is-running', 'is-done', 'is-error', 'is-current');
      if (stage.status === 'running' || idx === current) btn.classList.add('is-running');
      else if (stage.status === 'done') btn.classList.add('is-done');
      else if (stage.status === 'error') btn.classList.add('is-error');
    }
  }

  function refreshTotalDuration() {
    let ms = null;
    if (ui.flow && ui.flow.flow) {
      ms = durationOf(
        ui.flow.startedAt,
        ui.flow.finishedAt,
        ui.flow.status === 'running' || ui.flow.status === 'starting',
      );
    } else if (ui.status) {
      ms = durationOf(
        ui.status.startedAt,
        ui.status.finishedAt,
        ui.status.status === 'running',
      );
    }
    logDuration.textContent = ms == null ? '—' : formatDuration(ms);
  }

  // ─── log entries ────────────────────────────────────────────────────────
  function entryVisible(entry) {
    if (!matchesSearch(entry)) return false;
    if (ui.eventFilter === 'important' && !isImportantEntry(entry)) return false;
    if (ui.stageFilter === 'all') return true;
    return Number(entry.stage || 0) === ui.stageFilter;
  }

  function renderEntryEl(entry, mode) {
    const stage = Number(entry.stage || 0);
    const stageLabel = stage > 0 ? `S${stage}` : '·';
    const action = normalizeAction(entry.action);
    const actionInfo = actionMeta(action);
    const fullText = entry.text || '';
    const shortText = entry.textShort || fullText;
    const actionText = `${actionInfo.emoji} ${actionInfo.label}`;

    const wrapText = (cls, text) => {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = text;
      return span;
    };

    const root = document.createElement('div');
    root.className = `log-entry log-entry-${mode} log-entry-stage-${stage} log-action-${actionInfo.cssClass}`;
    root.dataset.action = action;
    root.dataset.stage = String(stage);

    const renderTs = () => {
      const ts = parseLogTimestamp(entry.tsHuman);
      if (!ts) return wrapText('le-ts', '—');
      const tsWrap = wrapText('le-ts', '');
      if (ts.date) {
        tsWrap.appendChild(wrapText('le-ts-time', ts.time));
        tsWrap.appendChild(wrapText('le-ts-date', ts.date));
      } else {
        tsWrap.appendChild(wrapText('le-ts-time', ts.time));
      }
      return tsWrap;
    };

    if (mode === 'cards') {
      const details = document.createElement('details');
      details.className = 'log-entry-details';
      const summary = document.createElement('summary');
      summary.appendChild(createContextChart(entry));
      summary.appendChild(wrapText('le-stage', stageLabel));
      summary.appendChild(wrapText(`le-action le-action-${actionInfo.cssClass}`, actionText));
      summary.appendChild(renderTs());
      const short = document.createElement('pre');
      short.className = 'le-text';
      short.textContent = shortText;
      summary.appendChild(short);
      summary.appendChild(makeCopyButton(entry));
      details.appendChild(summary);
      const body = document.createElement('div');
      body.className = 'le-body';
      const pre = document.createElement('pre');
      pre.className = 'le-full';
      pre.textContent = fullText;
      body.appendChild(pre);
      details.appendChild(body);
      root.appendChild(details);
      return root;
    }

    const head = document.createElement('div');
    head.className = 'le-head';
    head.appendChild(createContextChart(entry));
    head.appendChild(wrapText('le-stage', stageLabel));
    head.appendChild(wrapText(`le-action le-action-${actionInfo.cssClass}`, actionText));
    head.appendChild(renderTs());
    head.appendChild(makeCopyButton(entry));
    root.appendChild(head);

    const pre = document.createElement('pre');
    pre.className = 'le-text';
    pre.textContent = mode === 'full' ? fullText : shortText;
    root.appendChild(pre);
    return root;
  }

  function parseLogTimestamp(rawTs) {
    const value = String(rawTs || '').trim();
    if (!value) return null;

    const text = value.replace('T', ' ');
    const tokens = text.split(/\s+/).filter(Boolean);
    let timeToken = '';
    let dateTokens = [];

    for (const token of tokens) {
      if (!timeToken && /^\d{1,2}:\d{2}:\d{2}(?:\.\d+)?$/.test(token)) {
        timeToken = token;
      } else {
        dateTokens.push(token);
      }
    }

    if (!timeToken && tokens.length >= 2) {
      timeToken = tokens[tokens.length - 1];
      dateTokens = tokens.slice(0, -1);
    }
    if (!timeToken) return { time: value };

    const time = timeToken.replace(/\.\d+$/, '');
    const date = dateTokens.length ? dateTokens.join(' ') : '';
    return { time, date };
  }

  function makeCopyButton(entry) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'le-copy';
    btn.title = 'Скопировать полный текст этого события';
    btn.textContent = '⧉';
    btn.setAttribute('aria-label', 'Скопировать полный текст этого события');
    btn.dataset.doneText = '✓';
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const block = formatEntryForCopy(entry);
      copyToClipboard(block, btn);
    });
    return btn;
  }

  function formatEntryForCopy(entry) {
    const stage = entry.stage || 0;
    const head = `[${entry.tsHuman || ''}] [${entry.action || 'INFO'}]` +
      (stage ? ` (stage ${stage})` : '');
    return `${head}\n${entry.text || ''}\nCTX ${entry.ctxK || 0}k/${entry.ctxLimitK || 0}k - ${entry.ctxPct || 0}%`;
  }

  function fullRerender() {
    logBody.innerHTML = '';
    logBody.dataset.mode = ui.viewMode;
    const visible = ui.entries.filter(entryVisible);
    if (visible.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'log-empty';
      empty.textContent = 'Нет событий для выбранных условий.';
      logBody.appendChild(empty);
    } else {
      const frag = document.createDocumentFragment();
      for (const entry of visible) frag.appendChild(renderEntryEl(entry, ui.viewMode));
      logBody.appendChild(frag);
    }
    ui.rendered = ui.entries.length;
    updateCounter();
  }

  function appendNewEntries() {
    const startIdx = ui.rendered;
    if (startIdx >= ui.entries.length) return;
    const newOnes = ui.entries.slice(startIdx);
    let appendedAny = false;
    if (logBody.querySelector('.log-empty')) {
      logBody.innerHTML = '';
    }
    const frag = document.createDocumentFragment();
    for (const entry of newOnes) {
      if (!entryVisible(entry)) continue;
      frag.appendChild(renderEntryEl(entry, ui.viewMode));
      appendedAny = true;
    }
    if (appendedAny) {
      logBody.appendChild(frag);
    } else if (logBody.children.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'log-empty';
      empty.textContent = 'Нет событий для выбранных условий.';
      logBody.appendChild(empty);
    }
    ui.rendered = ui.entries.length;
    updateCounter();
  }

  function updateCounter() {
    const total = ui.entries.length;
    const visible = ui.entries.filter(entryVisible).length;
    const scope = ui.eventFilter === 'important' ? 'важные' : 'все';
    const filters = [];
    const query = getSearchQuery();
    if (query) {
      filters.unshift(`поиск: ${query}`);
    }
    if (ui.stageFilter === 'all') {
      if (filters.length) {
        logCounter.textContent = `${visible} из ${total} событий (${scope}, ${filters.join(', ')})`;
      } else {
        logCounter.textContent = `${visible} из ${total} событий (${scope})`;
      }
    } else {
      if (filters.length) {
        logCounter.textContent = `${visible} из ${total} событий (стейдж ${ui.stageFilter}, ${scope}, ${filters.join(', ')})`;
      } else {
        logCounter.textContent = `${visible} из ${total} событий (стейдж ${ui.stageFilter}, ${scope})`;
      }
    }
  }

  // ─── copy / clipboard ────────────────────────────────────────────────────
  function copyToClipboard(text, sourceBtn) {
    const done = () => {
      if (!sourceBtn) return;
      const old = sourceBtn.getAttribute('data-copy-text') || sourceBtn.textContent;
      if (!sourceBtn.getAttribute('data-copy-text')) {
        sourceBtn.setAttribute('data-copy-text', old);
      }
      const copiedText = sourceBtn.dataset.doneText || 'копировано';
      sourceBtn.classList.add('copied');
      sourceBtn.textContent = copiedText;
      setTimeout(() => {
        sourceBtn.classList.remove('copied');
        sourceBtn.textContent = sourceBtn.getAttribute('data-copy-text') || old;
      }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    if (done) done();
  }

  function copyAll() {
    const visible = ui.entries.filter(entryVisible);
    if (visible.length === 0) return;
    const blocks = visible.map(formatEntryForCopy);
    copyToClipboard(blocks.join('\n\n'), copyBtn);
  }

  // ─── listeners ──────────────────────────────────────────────────────────
  viewToggle.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-mode]');
    if (!btn) return;
    const mode = btn.dataset.mode;
    if (mode === ui.viewMode) return;
    ui.viewMode = mode;
    applyLogMode();
    fullRerender();
  });

  if (eventFilterToggle) {
    eventFilterToggle.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-event-filter]');
      if (!btn) return;
      const nextFilter = btn.dataset.eventFilter;
      if (nextFilter === ui.eventFilter) return;
      ui.eventFilter = nextFilter;
      applyEventFilter();
      fullRerender();
    });
  }

  stageTabsNode.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-stage]');
    if (!btn) return;
    const raw = btn.dataset.stage;
    const next = raw === 'all' ? 'all' : Number(raw);
    if (next === ui.stageFilter) return;
    ui.stageFilter = next;
    applyActiveTab();
    fullRerender();
  });

  copyBtn.addEventListener('click', copyAll);

  if (logSearchInput) {
    logSearchInput.addEventListener('input', () => {
      ui.searchQuery = logSearchInput.value;
      fullRerender();
    });
  }

  if (contextModalClose) {
    contextModalClose.addEventListener('click', () => contextModal.close());
  }

  if (contextModal) {
    contextModal.addEventListener('click', (ev) => {
      if (ev.target === contextModal) contextModal.close();
    });
  }

  stopBtn.addEventListener('click', async () => {
    if (serverDown) return;
    stopBtn.disabled = true;
    serverState.textContent = 'сервер: останавливается…';
    try {
      await fetch('/shutdown', { method: 'POST', cache: 'no-store' });
    } catch (e) {
      // Сервер закрылся в ходе ответа — ожидаемо.
    }
    setTimeout(markServerDown, 200);
  });

  function markServerDown() {
    serverDown = true;
    serverState.textContent = 'сервер: остановлен';
    serverState.classList.add('stopped');
    stopBtn.disabled = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // ─── update loop ────────────────────────────────────────────────────────
  async function update() {
    if (serverDown) return;
    try {
      const { statusResp, logResp, flowResp } = await fetchAll();

      if (statusResp.ok) paintStatus(await statusResp.json());
      else {
        stateNode.textContent = 'не найден';
        setStatusClass('stopped');
      }

      if (flowResp.ok) {
        try { paintFlow(await flowResp.json()); }
        catch (e) { paintFlow(null); }
      } else {
        paintFlow(null);
      }

      rebuildStageTabs();
      refreshStageDurations();
      refreshTotalDuration();

      if (logResp.ok) {
        const text = await logResp.text();
        const parsed = parseJsonl(text);
        if (parsed.length < ui.entries.length) {
          // Лог обнулился (новая сессия / усечение) — перерендер с нуля.
          ui.entries = parsed;
          fullRerender();
        } else if (parsed.length > ui.entries.length) {
          ui.entries = parsed;
          appendNewEntries();
        } else {
          // Без изменений — только пересчитать счётчик (мог поменяться фильтр).
          updateCounter();
        }
      }
    } catch (error) {
      markServerDown();
    }
  }

  // ─── command card ───────────────────────────────────────────────────────
  function injectCommandCard(cmd) {
    if (!cmd) return;
    if (document.getElementById('command-card')) return;
    const container = document.querySelector('.system-column')
      || document.querySelector('.grid');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'card command-card';
    card.id = 'command-card';
    const title = document.createElement('strong');
    title.textContent = 'Команда запуска';
    card.appendChild(title);
    const row = document.createElement('div');
    row.className = 'command-row';
    const pre = document.createElement('pre');
    pre.className = 'command-text';
    pre.textContent = cmd.trim();
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'command-copy';
    copy.textContent = '⧉';
    copy.title = 'Копировать команду';
    copy.setAttribute('aria-label', 'Скопировать команду');
    copy.dataset.doneText = '✓';
    copy.addEventListener('click', () => copyToClipboard(cmd.trim(), copy));
    row.appendChild(pre);
    row.appendChild(copy);
    card.appendChild(row);
    // Вставляем сразу после header.
    const header = container.querySelector('.session-card');
    if (header && header.nextSibling) container.insertBefore(card, header.nextSibling);
    else container.appendChild(card);
  }

  // ─── snapshot mode ──────────────────────────────────────────────────────
  if (isSnapshot) {
    if (pageTitle) pageTitle.textContent = 'Agent Auto Monitor (история)';
    if (sessionViewMode) {
      sessionViewMode.textContent = 'режим: только чтение';
      sessionViewMode.classList.remove('session-mode-live');
      sessionViewMode.classList.add('session-mode-snapshot');
    }
    if (SNAPSHOT.command) injectCommandCard(SNAPSHOT.command);
    if (SNAPSHOT.status) paintStatus(SNAPSHOT.status);
    paintFlow(SNAPSHOT.flow || null);
    rebuildStageTabs();
    refreshStageDurations();
    refreshTotalDuration();
    ui.entries = Array.isArray(SNAPSHOT.log) ? SNAPSHOT.log : [];
    fullRerender();
    stopBtn.disabled = true;
    stopBtn.hidden = true;
    serverState.textContent = 'снапшот: только просмотр';
    serverState.classList.add('stopped');
    return;
  }

  // ─── live: подгружаем command.txt один раз ──────────────────────────────
  fetch(commandUrl, { cache: 'no-store' })
    .then((r) => (r.ok ? r.text() : ''))
    .then((txt) => { if (txt && txt.trim()) injectCommandCard(txt); })
    .catch(() => { /* ignore */ });

  update();
  timer = setInterval(update, 1000);
})();
