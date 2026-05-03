/**
 * GG — Health Panel
 *
 * The main GG window. Uses ApplicationV2 (Foundry v12+) with a
 * graceful fallback to Application (v10/v11).
 */

import { MODULE_ID, getTier } from '../utils/constants.js';
import { GGAvatarConfig }      from './avatar-config.js';
import { GGSnapshots }         from '../core/snapshots.js';
import { GGErrorMonitor }      from '../core/error-monitor.js';
import { GGGraph }             from './graph.js';

/* ------------------------------------------------------------------ */
/*  Detect API generation                                               */
/* ------------------------------------------------------------------ */
const USE_V2 = typeof foundry?.applications?.api?.ApplicationV2 !== 'undefined';

/* ------------------------------------------------------------------ */
/*  ApplicationV2 version (Foundry v12+)                               */
/* ------------------------------------------------------------------ */

class GGHealthPanelV2 extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id:       'gg-health-panel',
    classes:  ['good-game'],
    tag:      'div',
    window: {
      title:     'GG.Panel.Title',
      icon:      'fas fa-heartbeat',
      resizable: true,
    },
    position: { width: 620, height: 'auto' },
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/health-panel.hbs` },
  };

  async _prepareContext() {
    return _buildContext();
  }

  _onRender(context, options) {
    super._onRender(context, options);
    _bindEvents(this.element);
  }
}

/* ------------------------------------------------------------------ */
/*  Legacy Application version (Foundry v10/v11)                       */
/* ------------------------------------------------------------------ */

class GGHealthPanelLegacy extends Application {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        'gg-health-panel',
      classes:   ['good-game'],
      title:     game.i18n.localize('GG.Panel.Title'),
      template:  `modules/${MODULE_ID}/templates/health-panel.hbs`,
      width:     620,
      height:    'auto',
      resizable: true,
    });
  }

  getData() {
    return _buildContext();
  }

  activateListeners(html) {
    super.activateListeners(html);
    _bindEvents(html[0]);
  }
}

/* ------------------------------------------------------------------ */
/*  Shared context builder                                              */
/* ------------------------------------------------------------------ */

function _buildContext() {
  const gg     = game.goodGame;
  const scan   = gg?.lastScan   ?? {};
  const score  = gg?.lastScore  ?? { value: 0, tier: { key: 'broken' }, stats: {}, breakdown: [] };
  const errors = GGErrorMonitor.getErrorsForScorer();

  return {
    score:       score.value,
    tier:        score.tier.key,
    tierLabel:   game.i18n.localize(`GG.Tier.${score.tier.key}`),
    stats: {
      active:   scan.totalActive ?? 0,
      critical: score.stats?.critical ?? 0,
      warning:  score.stats?.warning  ?? 0,
      errors:   errors.length,
    },
    problems:    score.breakdown ?? [],
    modules:     scan.modules   ?? [],
    errors,
    snapshots:   GGSnapshots.list().slice(0, 5),
    avatarSrc:   GGAvatarConfig.getImage(score.tier.key),
    avatarPacks: GGAvatarConfig.getPickerData(),
    foundryVer:  scan.foundryVersion ?? game.version,
    systemId:    scan.systemId       ?? game.system.id,
    systemVer:   scan.systemVersion  ?? game.system.version,
    scanTime:    scan.timestamp ? new Date(scan.timestamp).toLocaleTimeString() : '—',
  };
}

/* ------------------------------------------------------------------ */
/*  Shared event binder                                                 */
/* ------------------------------------------------------------------ */

function _bindEvents(el) {
  // Tab switching
  el.querySelectorAll('.gg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.gg-tab').forEach(t => t.classList.remove('active'));
      el.querySelectorAll('.gg-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = el.querySelector(`#gg-tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');

      // Lazy-render the dependency graph on first open
      if (tab.dataset.tab === 'graph') {
        const container = el.querySelector('#gg-graph-container');
        if (container && !container.dataset.rendered) {
          GGGraph.render(container, game.goodGame?.lastScan ?? { modules: [] });
          container.dataset.rendered = 'true';
        }
      }
    });
  });

  // Severity filter chips
  el.querySelectorAll('.gg-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      el.querySelectorAll('.gg-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const sev = chip.dataset.filter;
      el.querySelectorAll('.gg-problem-row').forEach(row => {
        row.style.display = (sev === 'all' || row.dataset.severity === sev) ? '' : 'none';
      });
    });
  });

  // Scan button
  el.querySelector('#gg-scan-btn')?.addEventListener('click', async () => {
    const btn = el.querySelector('#gg-scan-btn');
    if (btn) { btn.disabled = true; btn.textContent = game.i18n.localize('GG.Panel.Scanning'); }
    await game.goodGame?.refresh();
    if (btn) { btn.disabled = false; btn.textContent = game.i18n.localize('GG.Panel.Scan'); }
  });

  // Snapshot
  el.querySelector('#gg-snapshot-btn')?.addEventListener('click', () => {
    const gg = game.goodGame;
    if (gg) GGSnapshots.save(gg.lastScore, gg.lastScan);
  });

  // Error row — click to expand suggestion + stack excerpt
  el.querySelectorAll('.gg-error-row').forEach(row => {
    row.addEventListener('click', () => {
      const existing = row.querySelector('.gg-error-detail');
      if (existing) { existing.remove(); return; }

      const key  = row.dataset.key;
      const err  = GGErrorMonitor.getErrors().find(e => e.key === key);

      // Fallback: build a minimal error object from data attributes if monitor was cleared
      const errData = err ?? {
        attributedModule: row.dataset.module || null,
        confidence:       row.dataset.confidence || 'low',
        stack:            '',
      };

      const suggestion = _errorSuggestion(errData);
      const stackLines = (errData.stack ?? '')
        .split('\n').map(l => l.trim()).filter(Boolean).slice(0, 4).join('\n');

      const detail = document.createElement('div');
      detail.className = 'gg-error-detail';
      detail.innerHTML = `<div class="gg-error-suggestion">→ ${suggestion}</div>${
        stackLines ? `<pre class="gg-error-stack">${stackLines}</pre>` : ''
      }`;
      row.appendChild(detail);
    });
  });

  // Avatar picker
  el.querySelectorAll('.gg-avatar-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      await GGAvatarConfig.set(opt.dataset.avatarId);
      game.goodGame?.refresh();
    });
  });

  // Snapshot diff
  el.querySelectorAll('.gg-diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = el.querySelector('#gg-diff-panel');
      if (!panel) return;

      const snapId = btn.dataset.id;

      // Toggle off if already open for this snapshot
      if (panel.dataset.activeId === snapId && panel.style.display !== 'none') {
        panel.style.display = 'none';
        panel.dataset.activeId = '';
        return;
      }

      const snap    = GGSnapshots.get(snapId);
      const current = game.goodGame?.lastScore;
      if (!snap || !current) return;

      const delta    = current.value - snap.score;
      const snapKeys = new Set(snap.problems.map(p => `${p.source}::${p.type}`));
      const currKeys = new Set(current.breakdown.map(p => `${p.source}::${p.type}`));
      const resolved = snap.problems.filter(p => !currKeys.has(`${p.source}::${p.type}`));
      const newProbs = current.breakdown.filter(p => !snapKeys.has(`${p.source}::${p.type}`));

      const labelEl = panel.querySelector('.gg-diff-label');
      const deltaEl = panel.querySelector('.gg-diff-delta');
      if (labelEl) labelEl.textContent = snap.label;
      if (deltaEl) {
        const sign = delta >= 0 ? '+' : '';
        deltaEl.textContent = `${snap.score} → ${current.value} (${sign}${delta})`;
        deltaEl.className   = `gg-diff-delta ${delta >= 0 ? 'gg-diff-improved' : 'gg-diff-worsened'}`;
      }

      const resolvedList = panel.querySelector('#gg-diff-resolved-list');
      if (resolvedList) {
        resolvedList.innerHTML = resolved.length
          ? resolved.map(p => `<div class="gg-diff-item gg-diff-item--resolved"><span>✓</span><span><strong>${p.source}</strong> — ${p.message}</span></div>`).join('')
          : `<div class="gg-diff-empty">${game.i18n.localize('GG.Diff.NoneResolved')}</div>`;
      }

      const newList = panel.querySelector('#gg-diff-new-list');
      if (newList) {
        newList.innerHTML = newProbs.length
          ? newProbs.map(p => `<div class="gg-diff-item gg-diff-item--new"><span>!</span><span><strong>${p.source}</strong> — ${p.message}</span></div>`).join('')
          : `<div class="gg-diff-empty">${game.i18n.localize('GG.Diff.NoneNew')}</div>`;
      }

      panel.dataset.activeId = snapId;
      panel.style.display    = 'block';
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Error suggestion helper                                             */
/* ------------------------------------------------------------------ */

function _errorSuggestion(err) {
  const mod = err.attributedModule;
  if (err.confidence === 'high' && mod) {
    return game.i18n.format('GG.ErrorSuggestion.High', { module: mod });
  }
  if (err.confidence === 'medium' && mod) {
    return game.i18n.format('GG.ErrorSuggestion.Medium', { module: mod });
  }
  return game.i18n.localize('GG.ErrorSuggestion.Low');
}

/* ------------------------------------------------------------------ */
/*  Public façade                                                       */
/* ------------------------------------------------------------------ */

const PanelClass = USE_V2 ? GGHealthPanelV2 : GGHealthPanelLegacy;

export class GGHealthPanel {
  static instance = null;

  static open() {
    if (!this.instance) this.instance = new PanelClass();
    this.instance.render(true);
  }
}