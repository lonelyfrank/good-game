/**
 * GG — Dependency Graph
 *
 * Renders a force-directed SVG graph of module dependencies and conflicts.
 * No external libraries — plain JS physics simulation + SVG DOM.
 */

const W      = 560;
const H      = 330;
const R_BASE = 9;
const R_MAX  = 16;
const PAD    = R_MAX + 8;

const COLOR = {
  ok:       '#639922',
  warning:  '#EF9F27',
  critical: '#E24B4A',
  edge_req: 'rgba(255,255,255,0.22)',
  edge_con: 'rgba(226,75,74,0.65)',
};

export class GGGraph {

  /**
   * Build and inject the graph into `container`.
   * @param {HTMLElement} container
   * @param {ScanResult}  scanResult
   */
  static render(container, scanResult) {
    container.innerHTML = '';

    const mods = scanResult?.modules ?? [];
    if (!mods.length) {
      container.innerHTML = '<div class="gg-empty">Nessun modulo attivo da visualizzare.</div>';
      return;
    }

    // ── Build nodes ───────────────────────────────────────────────────
    const idxOf = {};
    mods.forEach((m, i) => { idxOf[m.id] = i; });

    const nodes = mods.map(m => ({
      id:       m.id,
      label:    m.title,
      status:   m.status,
      version:  m.version,
      problems: m.problems ?? [],
      penalty:  (m.problems ?? []).reduce((s, p) => s + (p.penalty ?? 0), 0),
      requires: m.requires  ?? [],
      conflicts:m.conflicts ?? [],
      x: 0, y: 0, vx: 0, vy: 0,
    }));

    // ── Build edges ───────────────────────────────────────────────────
    const edges = [];
    for (const n of nodes) {
      const si = idxOf[n.id];
      for (const req of n.requires) {
        const ti = idxOf[req];
        if (ti !== undefined) edges.push({ si, ti, kind: 'requires' });
      }
      for (const con of n.conflicts) {
        const ti = idxOf[con];
        // Deduplicate: only add once per pair
        if (ti !== undefined && ti > si) edges.push({ si, ti, kind: 'conflict' });
      }
    }

    // ── Simulate ──────────────────────────────────────────────────────
    _simulate(nodes, edges);

    // ── Most problematic node ─────────────────────────────────────────
    const worstIdx = nodes.reduce(
      (wi, n, i) => n.penalty > nodes[wi].penalty ? i : wi, 0
    );

    // ── SVG ───────────────────────────────────────────────────────────
    const svg = _el('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class:   'gg-graph-svg',
    });

    // Arrowhead for 'requires' edges
    const defs   = _el('defs');
    const marker = _el('marker', {
      id: 'gg-arr', markerWidth: '7', markerHeight: '7',
      refX: R_BASE + 7, refY: '3', orient: 'auto',
    });
    marker.appendChild(_el('path', { d: 'M0,0 L0,6 L7,3 z', fill: COLOR.edge_req }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Edges
    const edgeG = _el('g');
    for (const e of edges) {
      const a = nodes[e.si], b = nodes[e.ti];
      const isConflict = e.kind === 'conflict';
      edgeG.appendChild(_el('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke:             isConflict ? COLOR.edge_con : COLOR.edge_req,
        'stroke-width':     isConflict ? '2' : '1.5',
        'stroke-dasharray': isConflict ? '5,3' : 'none',
        'marker-end':       isConflict ? '' : 'url(#gg-arr)',
      }));
    }
    svg.appendChild(edgeG);

    // Nodes
    const nodeG = _el('g');
    nodes.forEach((n, i) => {
      // Scale radius by penalty: heavier nodes appear bigger
      const nodeR = n.penalty > 0
        ? Math.min(R_BASE + Math.floor(n.penalty / 7), R_MAX)
        : R_BASE;

      const g = _el('g', {
        class:     'gg-graph-node',
        transform: `translate(${n.x},${n.y})`,
        'data-id': n.id,
      });

      // Pulse ring on worst node
      if (i === worstIdx && n.penalty > 0) {
        g.appendChild(_el('circle', {
          r: nodeR + 6, fill: 'none',
          stroke: COLOR[n.status] ?? COLOR.critical,
          'stroke-width': '2',
          class: 'gg-graph-pulse',
        }));
      }

      g.appendChild(_el('circle', {
        r:              nodeR,
        fill:           COLOR[n.status] ?? COLOR.ok,
        stroke:         'rgba(0,0,0,0.35)',
        'stroke-width': '1.5',
        class:          'gg-graph-circle',
      }));

      // Penalty badge inside node
      if (n.penalty > 0) {
        const badge = _el('text', {
          y: '3.5', 'text-anchor': 'middle',
          'font-size': Math.max(6, nodeR - 3).toString(),
          'font-weight': '700', fill: 'rgba(255,255,255,0.92)',
          'pointer-events': 'none',
        });
        badge.textContent = `-${n.penalty}`;
        g.appendChild(badge);
      }

      const shortLabel = n.label.length > 13 ? n.label.slice(0, 12) + '…' : n.label;
      const txt = _el('text', {
        y: nodeR + 11, 'text-anchor': 'middle',
        'font-size': '7.5', fill: 'rgba(255,255,255,0.65)',
        'pointer-events': 'none',
      });
      txt.textContent = shortLabel;
      g.appendChild(txt);

      // Full title tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${n.label} (${n.id})`;
      g.appendChild(title);

      nodeG.appendChild(g);
    });
    svg.appendChild(nodeG);

    // ── Assemble layout: SVG left + detail right ──────────────────────
    const wrap = document.createElement('div');
    wrap.className = 'gg-graph-wrap';

    const detail = document.createElement('div');
    detail.className = 'gg-graph-detail';
    detail.innerHTML = `<div class="gg-graph-detail-placeholder">${
      game.i18n?.localize('GG.Graph.ClickHint') ?? 'Clicca un nodo per i dettagli.'
    }</div>`;

    wrap.appendChild(svg);
    wrap.appendChild(detail);
    container.appendChild(wrap);

    // ── Legend ────────────────────────────────────────────────────────
    const legend = document.createElement('div');
    legend.className = 'gg-graph-legend';
    legend.innerHTML = `
      <span class="gg-graph-legend-item" style="--c:${COLOR.ok}">ok</span>
      <span class="gg-graph-legend-item" style="--c:${COLOR.warning}">warning</span>
      <span class="gg-graph-legend-item" style="--c:${COLOR.critical}">critical</span>
      <span class="gg-graph-legend-sep"></span>
      <span class="gg-graph-legend-edge requires">── requires</span>
      <span class="gg-graph-legend-edge conflict">╌ conflict</span>
    `;
    container.appendChild(legend);

    // ── Click handlers ────────────────────────────────────────────────
    nodeG.querySelectorAll('.gg-graph-node').forEach(g => {
      g.addEventListener('click', () => {
        // Reset all selections
        nodeG.querySelectorAll('.gg-graph-circle').forEach(c => {
          c.setAttribute('stroke', 'rgba(0,0,0,0.35)');
          c.setAttribute('stroke-width', '1.5');
        });
        // Highlight selected
        g.querySelector('.gg-graph-circle').setAttribute('stroke', '#fff');
        g.querySelector('.gg-graph-circle').setAttribute('stroke-width', '2.5');

        const node = nodes.find(n => n.id === g.dataset.id);
        if (node) _renderDetail(detail, node);
      });
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Detail panel                                                        */
/* ------------------------------------------------------------------ */

function _renderDetail(el, node) {
  const color = COLOR[node.status] ?? '#aaa';
  const problemsHtml = node.problems.length
    ? node.problems.map(p => `
        <div class="gg-graph-detail-problem">
          <span class="gg-badge gg-badge--${p.severity}">${p.severity}</span>
          <span class="gg-graph-detail-pmsg">${p.message}</span>
        </div>`).join('')
    : '<div class="gg-graph-detail-ok">Nessun problema rilevato.</div>';

  el.innerHTML = `
    <div class="gg-graph-detail-header" style="border-left:3px solid ${color}">
      <div class="gg-graph-detail-name">${node.label}</div>
      <div class="gg-graph-detail-meta">${node.id} · v${node.version}</div>
    </div>
    <div class="gg-graph-detail-problems">${problemsHtml}</div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Force-directed simulation                                           */
/* ------------------------------------------------------------------ */

function _simulate(nodes, edges) {
  const REPULSION = 3500;
  const SPRING    = 0.045;
  const IDEAL     = 120;
  const GRAVITY   = 0.018;
  const DAMPING   = 0.82;

  // Init: circular placement for stable start
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const r     = Math.min(W, H) * 0.32;
    n.x = W / 2 + Math.cos(angle) * r;
    n.y = H / 2 + Math.sin(angle) * r;
  });

  for (let iter = 0; iter < 320; iter++) {
    // Node–node repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = (nodes[j].x - nodes[i].x) || 0.1;
        const dy = (nodes[j].y - nodes[i].y) || 0.1;
        const d  = Math.sqrt(dx * dx + dy * dy);
        const f  = REPULSION / (d * d);
        const ux = dx / d, uy = dy / d;
        nodes[i].vx -= f * ux; nodes[i].vy -= f * uy;
        nodes[j].vx += f * ux; nodes[j].vy += f * uy;
      }
    }

    // Edge spring attraction
    for (const e of edges) {
      const a = nodes[e.si], b = nodes[e.ti];
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const f  = (d - IDEAL) * SPRING;
      const ux = dx / d, uy = dy / d;
      a.vx += f * ux; a.vy += f * uy;
      b.vx -= f * ux; b.vy -= f * uy;
    }

    // Center gravity
    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * GRAVITY;
      n.vy += (H / 2 - n.y) * GRAVITY;
      n.x = Math.max(PAD, Math.min(W - PAD, n.x + n.vx));
      n.y = Math.max(PAD, Math.min(H - PAD, n.y + n.vy));
      n.vx *= DAMPING;
      n.vy *= DAMPING;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  SVG element helper                                                  */
/* ------------------------------------------------------------------ */

function _el(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
