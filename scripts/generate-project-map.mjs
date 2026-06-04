import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_ROOT = path.join(ROOT, 'src');
const OUT_FILE = path.join(ROOT, 'docs', 'project-map.html');
const SOURCE_EXTENSIONS = ['.ts', '.tsx'];

const moduleSpecs = [
  { id: 'webview.app', label: 'Webview App', layer: 'webview', match: /^src\/webview\/app\// },
  { id: 'webview.pages.chat', label: 'Chat Page', layer: 'webview', match: /^src\/webview\/pages\/chat\// },
  { id: 'webview.pages.permissions', label: 'Permissions Page', layer: 'webview', match: /^src\/webview\/pages\/permissions\// },
  { id: 'webview.pages.autonomous', label: 'Autonomous Page', layer: 'webview', match: /^src\/webview\/pages\/autonomous\// },
  { id: 'webview.pages.isolation', label: 'Isolation Page', layer: 'webview', match: /^src\/webview\/pages\/isolation\// },
  { id: 'webview.widgets', label: 'Webview Widgets', layer: 'webview', match: /^src\/webview\/widgets\// },
  { id: 'webview.features', label: 'Webview Features', layer: 'webview', match: /^src\/webview\/features\// },
  { id: 'webview.entities.message', label: 'Message UI Entities', layer: 'webview', match: /^src\/webview\/entities\/message\// },
  { id: 'webview.shared', label: 'Webview Shared', layer: 'webview', match: /^src\/webview\/shared\// },
  { id: 'webview.storybook', label: 'Storybook Fixtures', layer: 'webview', match: /^src\/webview\/storybook\// },

  { id: 'extension.activation', label: 'VS Code Activation', layer: 'extension', match: /^src\/extension\.ts$/ },
  { id: 'extension.agent.controller', label: 'Agent Controller', layer: 'extension', match: /^src\/extension\/agent\/agentController/ },
  { id: 'extension.agent.daemon', label: 'Daemon Bridge', layer: 'extension', match: /^src\/extension\/agent\/daemon\// },
  { id: 'extension.agent.webview', label: 'Webview Host/IPC', layer: 'extension', match: /^src\/extension\/agent\/webview\// },
  { id: 'extension.agent.config', label: 'Extension Config', layer: 'extension', match: /^src\/extension\/agent\/config\// },
  { id: 'extension.agent.context', label: 'Editor Context', layer: 'extension', match: /^src\/extension\/agent\/context\// },
  { id: 'extension.agent.commands', label: 'VS Code Commands', layer: 'extension', match: /^src\/extension\/agent\/commands\// },
  { id: 'extension.autonomous', label: 'Autonomous Shell', layer: 'extension', match: /^src\/extension\/autonomous\// },
  { id: 'extension.tools', label: 'VS Code Tool Adapters', layer: 'extension', match: /^src\/extension\/tools\// },
  { id: 'extension.skills', label: 'Extension Skills', layer: 'extension', match: /^src\/extension\/skills\// },
  { id: 'extension.shared', label: 'Extension Shared', layer: 'extension', match: /^src\/extension\/shared\// },
  { id: 'extension.other', label: 'Extension Other', layer: 'extension', match: /^src\/extension\// },

  { id: 'cli.main', label: 'CLI Entrypoints', layer: 'cli', match: /^src\/cli\/(main|index|daemon|daemonIndex|router)\.ts$/ },
  { id: 'cli.router', label: 'CLI Router', layer: 'cli', match: /^src\/cli\/(commands|routerParts)\// },
  { id: 'cli.daemon.protocol', label: 'Daemon Protocol', layer: 'cli', match: /^src\/cli\/daemonProtocol/ },
  { id: 'cli.daemon.client', label: 'Daemon Client', layer: 'cli', match: /^src\/cli\/daemonClient\// },
  { id: 'cli.daemon.server.methods', label: 'Daemon Methods', layer: 'cli', match: /^src\/cli\/daemonServer\/(methods|methodInstallers)\// },
  { id: 'cli.daemon.server.isolation', label: 'Isolation Backend', layer: 'cli', match: /^src\/cli\/daemonServer\/isolation\// },
  { id: 'cli.daemon.server', label: 'Daemon Server', layer: 'cli', match: /^src\/cli\/daemonServer\// },
  { id: 'cli.other', label: 'CLI Other', layer: 'cli', match: /^src\/cli\// },

  { id: 'core.app.runtime', label: 'Core Runtime', layer: 'core', match: /^src\/core\/app\/runtime\// },
  { id: 'core.app.config', label: 'Core Config', layer: 'core', match: /^src\/core\/app\/config\// },
  { id: 'core.processes.autonomous', label: 'Autonomous Core', layer: 'core', match: /^src\/core\/processes\/autonomous\// },
  { id: 'core.entities.chat', label: 'Chat Repository', layer: 'core', match: /^src\/core\/entities\/chat\// },
  { id: 'core.entities.run', label: 'Run Repository', layer: 'core', match: /^src\/core\/entities\/run\// },
  { id: 'core.entities.storage', label: 'Storage Policy', layer: 'core', match: /^src\/core\/entities\/storage\// },
  { id: 'core.entities.model', label: 'Model Transports', layer: 'core', match: /^src\/core\/entities\/model\// },
  { id: 'core.entities.memory', label: 'Memory Store', layer: 'core', match: /^src\/core\/entities\/memory\// },
  { id: 'core.entities.subagent', label: 'Subagent Repository', layer: 'core', match: /^src\/core\/entities\/subagent\// },
  { id: 'core.features.approval', label: 'Approval Protocol', layer: 'core', match: /^src\/core\/features\/approval\// },
  { id: 'core.features.context', label: 'Context Governance', layer: 'core', match: /^src\/core\/features\/context\// },
  { id: 'core.features.tools', label: 'Tool Execution', layer: 'core', match: /^src\/core\/features\/tool-execution\// },
  { id: 'core.features.memory', label: 'Memory Subagent', layer: 'core', match: /^src\/core\/features\/memory-subagent\// },
  { id: 'core.features.systemPrompt', label: 'System Prompt', layer: 'core', match: /^src\/core\/features\/system-prompt\// },
  { id: 'core.features.other', label: 'Core Features Other', layer: 'core', match: /^src\/core\/features\// },
  { id: 'core.tools.fs', label: 'Filesystem Tools', layer: 'core', match: /^src\/core\/tools\/fs\// },
  { id: 'core.tools.scripts', label: 'Script Tools', layer: 'core', match: /^src\/core\/tools\/scripts\// },
  { id: 'core.shared', label: 'Core Shared Contracts', layer: 'core', match: /^src\/core\/shared\// },
  { id: 'core.facade', label: 'Core Facade', layer: 'core', match: /^src\/core\/[^/]+\.ts$/ },
  { id: 'core.other', label: 'Core Other', layer: 'core', match: /^src\/core\// },
  { id: 'webview.other', label: 'Webview Other', layer: 'webview', match: /^src\/webview\// },
  { id: 'misc.other', label: 'Unclassified Source', layer: 'core', match: /^src\// }
];

const layerOrder = ['webview', 'extension', 'cli', 'core'];
const layerMeta = {
  webview: { label: 'Webview UI', color: '#38bdf8' },
  extension: { label: 'VS Code Extension', color: '#a78bfa' },
  cli: { label: 'CLI / Daemon', color: '#f59e0b' },
  core: { label: 'Core Runtime', color: '#22c55e' }
};

function main() {
  const files = listSourceFiles(SRC_ROOT).map(toProjectPath).sort();
  const fileSet = new Set(files);
  const modules = buildModules(files);
  const edges = buildEdges(files, fileSet, modules);
  const graph = buildGraph({ files, modules, edges });
  fs.writeFileSync(OUT_FILE, renderHtml(graph), 'utf8');
  console.log(`Generated ${toProjectPath(OUT_FILE)} with ${graph.nodes.length} modules and ${graph.edges.length} edges.`);
}

function listSourceFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    if (entry.isFile() && SOURCE_EXTENSIONS.includes(path.extname(entry.name))) return [entryPath];
    return [];
  });
}

function buildModules(files) {
  const modules = new Map();
  for (const spec of moduleSpecs) {
    modules.set(spec.id, {
      id: spec.id,
      label: spec.label,
      layer: spec.layer,
      files: [],
      loc: 0,
      incoming: 0,
      outgoing: 0
    });
  }

  for (const file of files) {
    const moduleId = getModuleId(file);
    const module = modules.get(moduleId);
    module.files.push(file);
    module.loc += countLines(path.join(ROOT, file));
  }

  for (const [id, module] of modules) {
    if (!module.files.length) modules.delete(id);
  }

  return modules;
}

function buildEdges(files, fileSet, modules) {
  const edgeMap = new Map();
  for (const file of files) {
    const fromModule = getModuleId(file);
    const imports = collectImportSpecifiers(readProjectFile(file));
    for (const specifier of imports) {
      if (!specifier.startsWith('.')) continue;
      const targetFile = resolveLocalImport(file, specifier, fileSet);
      if (!targetFile) continue;
      const toModule = getModuleId(targetFile);
      if (fromModule === toModule) continue;
      const edgeId = `${fromModule}->${toModule}`;
      const edge = edgeMap.get(edgeId) ?? {
        id: edgeId,
        from: fromModule,
        to: toModule,
        count: 0,
        samples: []
      };
      edge.count += 1;
      if (edge.samples.length < 5) edge.samples.push(`${file} -> ${targetFile}`);
      edgeMap.set(edgeId, edge);
    }
  }

  const edges = [...edgeMap.values()].filter((edge) => modules.has(edge.from) && modules.has(edge.to));
  for (const edge of edges) {
    modules.get(edge.from).outgoing += edge.count;
    modules.get(edge.to).incoming += edge.count;
  }
  return edges.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

function buildGraph({ files, modules, edges }) {
  const nodes = [...modules.values()]
    .sort((a, b) => layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer) || a.label.localeCompare(b.label))
    .map((module) => ({
      ...module,
      publicApiFiles: module.files.filter((file) => /(^|\/)index\.tsx?$/.test(file) || /Protocol\.ts$/.test(file) || /agentActions\.ts$/.test(file))
    }));

  const externalImports = countExternalImports(files);
  const topConnected = [...nodes]
    .map((node) => ({ ...node, total: node.incoming + node.outgoing }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  return {
    generatedAt: new Date().toISOString(),
    sourceFileCount: files.length,
    nodes,
    edges,
    topConnected,
    externalImports,
    layers: layerMeta
  };
}

function getModuleId(file) {
  const spec = moduleSpecs.find((candidate) => candidate.match.test(file));
  return spec ? spec.id : 'unknown';
}

function collectImportSpecifiers(content) {
  const specifiers = [];
  const patterns = [
    /import\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
    /export\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function resolveLocalImport(fromFile, specifier, fileSet) {
  const fromDir = path.posix.dirname(fromFile);
  const base = path.posix.normalize(path.posix.join(fromDir, specifier));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.posix.join(base, 'index.ts'),
    path.posix.join(base, 'index.tsx')
  ];
  return candidates.find((candidate) => fileSet.has(candidate));
}

function countExternalImports(files) {
  const counts = new Map();
  for (const file of files) {
    for (const specifier of collectImportSpecifiers(readProjectFile(file))) {
      if (specifier.startsWith('.')) continue;
      const root = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
      counts.set(root, (counts.get(root) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 12);
}

function readProjectFile(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function countLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n').filter((line) => line.trim()).length;
}

function toProjectPath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(graph) {
  const graphJson = JSON.stringify(graph).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AIST Project Map</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #05070a;
      --panel: #0d1117;
      --panel-2: #121821;
      --text: #e5edf6;
      --muted: #8b98a8;
      --line: rgba(148, 163, 184, 0.22);
      --hot: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: radial-gradient(circle at 20% 0%, #111827 0, var(--bg) 34rem);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main { max-width: 1520px; margin: 0 auto; padding: 28px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0; }
    p { margin: 0; color: var(--muted); line-height: 1.5; }
    .stats { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
    .stat { min-width: 132px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; background: rgba(13, 17, 23, 0.82); }
    .stat strong { display: block; font-size: 20px; }
    .stat span { color: var(--muted); font-size: 12px; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
    .card { border: 1px solid var(--line); border-radius: 8px; background: rgba(13, 17, 23, 0.9); box-shadow: 0 16px 50px rgba(0,0,0,.25); }
    .map-card { overflow: hidden; min-height: 760px; }
    .toolbar { display: flex; gap: 8px; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--line); }
    .toolbar input {
      width: 280px; max-width: 100%; background: #070b11; border: 1px solid var(--line); color: var(--text);
      border-radius: 7px; padding: 9px 10px; outline: none;
    }
    .legend { display: flex; flex-wrap: wrap; gap: 10px; color: var(--muted); font-size: 12px; }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    svg { width: 100%; height: 720px; display: block; background: linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,0)); }
    .lane-label { fill: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .lane-line { stroke: rgba(148, 163, 184, 0.14); stroke-width: 1; }
    .edge { stroke: rgba(148, 163, 184, 0.34); fill: none; transition: opacity .15s, stroke .15s; }
    .edge.hot { stroke: rgba(248, 113, 113, 0.78); }
    .node rect { fill: #070b11; stroke-width: 1.5; rx: 8; }
    .node text { pointer-events: none; }
    .node .title { fill: var(--text); font-size: 12px; font-weight: 700; }
    .node .meta { fill: var(--muted); font-size: 10px; }
    .node:hover rect, .node.selected rect { stroke-width: 3; }
    .muted { opacity: .12; }
    .panel { padding: 16px; position: sticky; top: 16px; }
    .panel h2 { font-size: 18px; margin: 0 0 8px; }
    .panel h3 { font-size: 13px; margin: 18px 0 8px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
    .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
    .kv div { padding: 10px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 7px; }
    .kv strong { display: block; font-size: 18px; }
    .kv span { color: var(--muted); font-size: 12px; }
    ul { padding-left: 18px; margin: 8px 0 0; color: var(--muted); }
    li { margin: 5px 0; }
    code { color: #cbd5e1; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    td { border-top: 1px solid var(--line); padding: 8px 0; color: var(--muted); vertical-align: top; }
    td:first-child { color: var(--text); padding-right: 10px; }
    .note { margin-top: 12px; padding: 12px; border: 1px solid rgba(245,158,11,.28); border-radius: 7px; background: rgba(245,158,11,.08); color: #f8d391; font-size: 12px; line-height: 1.45; }
    @media (max-width: 1050px) {
      main { padding: 18px; }
      header { display: block; }
      .stats { justify-content: start; margin-top: 16px; }
      .layout { grid-template-columns: 1fr; }
      .panel { position: static; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>AIST Project Map</h1>
        <p>Generated from TypeScript imports. Boxes are architecture modules; edges are real local import dependencies.</p>
      </div>
      <div class="stats">
        <div class="stat"><strong id="fileCount">0</strong><span>source files</span></div>
        <div class="stat"><strong id="moduleCount">0</strong><span>modules</span></div>
        <div class="stat"><strong id="edgeCount">0</strong><span>module edges</span></div>
      </div>
    </header>

    <section class="layout">
      <div class="card map-card">
        <div class="toolbar">
          <input id="search" placeholder="Filter modules, e.g. daemon, runtime, webview">
          <div class="legend" id="legend"></div>
        </div>
        <svg id="map" role="img" aria-label="AIST architecture dependency map"></svg>
      </div>
      <aside class="card panel">
        <h2 id="detailTitle">Select a module</h2>
        <p id="detailText">Click a box to inspect public API candidates, fan-in, fan-out and strongest dependency links.</p>
        <div class="kv">
          <div><strong id="detailFiles">-</strong><span>files</span></div>
          <div><strong id="detailLoc">-</strong><span>non-empty lines</span></div>
          <div><strong id="detailIncoming">-</strong><span>incoming imports</span></div>
          <div><strong id="detailOutgoing">-</strong><span>outgoing imports</span></div>
        </div>
        <h3>Public API candidates</h3>
        <ul id="publicApi"><li>Click a module first.</li></ul>
        <h3>Strongest links</h3>
        <ul id="links"><li>Click a module first.</li></ul>
        <h3>Most connected modules</h3>
        <table id="topConnected"></table>
        <h3>External imports</h3>
        <table id="externalImports"></table>
        <div class="note">This is a fast static import map, not a runtime trace. It shows physical coupling. Product flows like webview IPC and daemon JSON-RPC still need a curated architecture view.</div>
      </aside>
    </section>
  </main>

  <script>
    const graph = ${graphJson};
    const svg = document.getElementById('map');
    const search = document.getElementById('search');
    const width = 1120;
    const height = 720;
    const margin = { left: 42, right: 38, top: 46, bottom: 34 };
    const layerY = { webview: 94, extension: 260, cli: 430, core: 604 };
    const selected = { id: null };
    const nodes = layoutNodes(graph.nodes);
    positionNodes(nodes);
    const edges = graph.edges.map(edge => ({ ...edge, fromNode: nodes.find(n => n.id === edge.from), toNode: nodes.find(n => n.id === edge.to) })).filter(edge => edge.fromNode && edge.toNode && Number.isFinite(edge.fromNode.x) && Number.isFinite(edge.toNode.x));

    document.getElementById('fileCount').textContent = graph.sourceFileCount;
    document.getElementById('moduleCount').textContent = graph.nodes.length;
    document.getElementById('edgeCount').textContent = graph.edges.length;
    renderLegend();
    renderTables();
    render();

    search.addEventListener('input', () => render());

    function layoutNodes(inputNodes) {
      return inputNodes.map(node => ({ ...node })).sort((a, b) => a.layer.localeCompare(b.layer) || a.label.localeCompare(b.label)).map(node => node);
    }

    function positionNodes(nodes) {
      for (const layer of Object.keys(layerY)) {
        const layerNodes = nodes.filter(node => node.layer === layer);
        const gap = (width - margin.left - margin.right) / Math.max(layerNodes.length, 1);
        layerNodes.forEach((node, index) => {
          node.x = margin.left + gap * index + gap / 2;
          node.y = layerY[layer];
          node.w = Math.min(142, Math.max(102, 78 + Math.sqrt(node.files.length) * 11));
          node.h = 58;
        });
      }
    }

    function renderLegend() {
      document.getElementById('legend').innerHTML = Object.entries(graph.layers).map(([id, layer]) =>
        '<span><i class="dot" style="background:' + layer.color + '"></i>' + escapeHtml(layer.label) + '</span>'
      ).join('');
    }

    function renderTables() {
      document.getElementById('topConnected').innerHTML = graph.topConnected.map(node =>
        '<tr><td>' + escapeHtml(node.label) + '</td><td>' + node.total + '</td></tr>'
      ).join('');
      document.getElementById('externalImports').innerHTML = graph.externalImports.map(item =>
        '<tr><td>' + escapeHtml(item.name) + '</td><td>' + item.count + '</td></tr>'
      ).join('');
    }

    function render() {
      const query = search.value.trim().toLowerCase();
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.innerHTML = [
        '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="rgba(148,163,184,.55)"/></marker></defs>',
        renderLanes(),
        renderEdges(query),
        renderNodes(query)
      ].join('');
      bindNodeEvents();
    }

    function renderLanes() {
      return Object.entries(layerY).map(([layer, y]) => {
        const label = graph.layers[layer].label;
        return '<line class="lane-line" x1="28" y1="' + (y + 48) + '" x2="' + (width - 28) + '" y2="' + (y + 48) + '"></line>' +
          '<text class="lane-label" x="30" y="' + (y - 48) + '">' + escapeHtml(label) + '</text>';
      }).join('');
    }

    function renderEdges(query) {
      return edges.map(edge => {
        const active = isEdgeActive(edge, query);
        const muted = !active ? ' muted' : '';
        const hot = edge.count >= 10 ? ' hot' : '';
        const x1 = edge.fromNode.x;
        const y1 = edge.fromNode.y + edge.fromNode.h / 2;
        const x2 = edge.toNode.x;
        const y2 = edge.toNode.y - edge.toNode.h / 2;
        const midY = (y1 + y2) / 2;
        const width = Math.min(8, Math.max(1.2, Math.sqrt(edge.count)));
        return '<path class="edge' + hot + muted + '" data-from="' + edge.from + '" data-to="' + edge.to + '" stroke-width="' + width.toFixed(1) + '" marker-end="url(#arrow)" d="M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' C ' + x1.toFixed(1) + ' ' + midY.toFixed(1) + ', ' + x2.toFixed(1) + ' ' + midY.toFixed(1) + ', ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '"><title>' + escapeHtml(edge.from + ' -> ' + edge.to + ': ' + edge.count) + '</title></path>';
      }).join('');
    }

    function renderNodes(query) {
      return nodes.map(node => {
        const color = graph.layers[node.layer].color;
        const active = isNodeActive(node, query);
        const isSelected = selected.id === node.id;
        const classes = 'node' + (!active ? ' muted' : '') + (isSelected ? ' selected' : '');
        const x = node.x - node.w / 2;
        const y = node.y - node.h / 2;
        const title = fitLabel(node.label, 18);
        const meta = node.files.length + ' files | in ' + node.incoming + ' | out ' + node.outgoing;
        return '<g class="' + classes + '" data-id="' + node.id + '" tabindex="0">' +
          '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + node.w.toFixed(1) + '" height="' + node.h + '" stroke="' + color + '"><title>' + escapeHtml(node.label) + '</title></rect>' +
          '<text class="title" x="' + node.x.toFixed(1) + '" y="' + (node.y - 6).toFixed(1) + '" text-anchor="middle">' + escapeHtml(title) + '</text>' +
          '<text class="meta" x="' + node.x.toFixed(1) + '" y="' + (node.y + 14).toFixed(1) + '" text-anchor="middle">' + escapeHtml(meta) + '</text>' +
        '</g>';
      }).join('');
    }

    function bindNodeEvents() {
      svg.querySelectorAll('.node').forEach(element => {
        element.addEventListener('click', () => {
          selected.id = element.dataset.id;
          showDetails(nodes.find(node => node.id === selected.id));
          render();
        });
      });
    }

    function showDetails(node) {
      document.getElementById('detailTitle').textContent = node.label;
      document.getElementById('detailText').textContent = node.id + ' / ' + graph.layers[node.layer].label;
      document.getElementById('detailFiles').textContent = node.files.length;
      document.getElementById('detailLoc').textContent = node.loc;
      document.getElementById('detailIncoming').textContent = node.incoming;
      document.getElementById('detailOutgoing').textContent = node.outgoing;
      const publicApi = node.publicApiFiles.length ? node.publicApiFiles : node.files.slice(0, 6);
      document.getElementById('publicApi').innerHTML = publicApi.map(file => '<li><code>' + escapeHtml(file) + '</code></li>').join('');
      const related = edges.filter(edge => edge.from === node.id || edge.to === node.id).sort((a, b) => b.count - a.count).slice(0, 8);
      document.getElementById('links').innerHTML = related.length ? related.map(edge => {
        const direction = edge.from === node.id ? 'to ' + edge.toNode.label : 'from ' + edge.fromNode.label;
        return '<li>' + escapeHtml(direction) + ' <strong>(' + edge.count + ')</strong></li>';
      }).join('') : '<li>No cross-module imports.</li>';
    }

    function isNodeActive(node, query) {
      if (selected.id && node.id !== selected.id) {
        return edges.some(edge => (edge.from === selected.id && edge.to === node.id) || (edge.to === selected.id && edge.from === node.id));
      }
      if (!query) return true;
      return node.id.toLowerCase().includes(query) || node.label.toLowerCase().includes(query) || node.layer.toLowerCase().includes(query);
    }

    function isEdgeActive(edge, query) {
      if (selected.id) return edge.from === selected.id || edge.to === selected.id;
      if (!query) return true;
      return isNodeActive(edge.fromNode, query) || isNodeActive(edge.toNode, query);
    }

    function fitLabel(label, max) {
      return label.length <= max ? label : label.slice(0, max - 1) + '...';
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }
  </script>
</body>
</html>
`;
}

main();
