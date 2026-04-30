/**
 * Good Game (GG) — Game Health Meter
 * Main entry point — bootstraps all subsystems
 */

import { GGScanner }      from './core/scanner.js';
import { GGScorer }       from './core/scorer.js';
import { GGErrorMonitor } from './core/error-monitor.js';
import { GGSnapshots }    from './core/snapshots.js';
import { GGHealthPanel }  from './ui/health-panel.js';
import { GGTopBar }       from './ui/topbar.js';
import { GGSettings }     from './ui/settings.js';
import { GGAvatarConfig } from './ui/avatar-config.js';
import { MODULE_ID, SETTINGS, log } from './utils/constants.js';

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                           */
/* ------------------------------------------------------------------ */

Hooks.once('init', () => {
  log('Initializing Good Game…');
  GGSettings.register();
});

Hooks.once('ready', async () => {
  log('Foundry ready — starting GG systems');

  // 1. Error monitor starts first — catches everything from here on
  GGErrorMonitor.start();

  // 2. Scan modules and compute initial health score
  const scanResult = await GGScanner.scan();
  const score      = GGScorer.compute(scanResult);

  // Store results globally for other UI components
  game.goodGame = {
    scanner:      GGScanner,
    scorer:       GGScorer,
    errorMonitor: GGErrorMonitor,
    snapshots:    GGSnapshots,
    lastScan:     scanResult,
    lastScore:    score,
    version:      game.modules.get(MODULE_ID)?.version ?? '?',

    /** Re-run a full scan and refresh the UI */
    async refresh() {
      this.lastScan  = await GGScanner.scan();
      this.lastScore = GGScorer.compute(this.lastScan);
      GGTopBar.update(this.lastScore);
      if (GGHealthPanel.instance?.rendered) {
        GGHealthPanel.instance.render(true);
      }
    }
  };

  // 3. Render the persistent top-bar indicator (if enabled)
  const topbarEnabled = game.settings.get(MODULE_ID, SETTINGS.TOPBAR_ENABLED);
  if (topbarEnabled) GGTopBar.inject(score);

  // 4. If score is below warning threshold, warn the GM
  const threshold = game.settings.get(MODULE_ID, SETTINGS.WARN_THRESHOLD);
  if (game.user.isGM && score.value < threshold) {
    ui.notifications.warn(
      game.i18n.format('GG.Notifications.LowScore', { score: score.value }),
      { permanent: false }
    );
  }

  log(`Initial health score: ${score.value}`);
});

/* ------------------------------------------------------------------ */
/*  Scene load hook — re-scan after loading a scene (modules may       */
/*  register new hooks that affect stability)                           */
/* ------------------------------------------------------------------ */
Hooks.on('canvasReady', () => {
  if (!game.user.isGM) return;
  // Debounce: wait 2 s after canvas ready to let modules settle
  setTimeout(() => game.goodGame?.refresh(), 2000);
});

/* ------------------------------------------------------------------ */
/*  Register the panel opener in the sidebar / controls                */
/* ------------------------------------------------------------------ */
/* Scene control button — v10/v11/v12 only (array-based API) */
Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return;
  if (!Array.isArray(controls)) return; // v13+ handled via renderSceneControls

  controls.push({
    name:    MODULE_ID,
    title:   game.i18n.localize('GG.Controls.OpenPanel'),
    icon:    'fas fa-heartbeat',
    layer:   'controls',
    visible: true,
    tools:   [{
      name:    'open-panel',
      title:   game.i18n.localize('GG.Controls.OpenPanel'),
      icon:    'fas fa-heartbeat',
      button:  true,
      onClick: () => GGHealthPanel.open()
    }]
  });
});

/* Scene control button — v13+ (DOM injection after render) */
Hooks.on('renderSceneControls', (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root) return;

  // Avoid duplicate injection
  if (root.querySelector('#gg-control-btn')) return;

  // Clone style from an existing control button for perfect v13 compatibility
  const existing = root.querySelector('li[data-control], .scene-control');
  const btn = document.createElement('li');
  btn.id = 'gg-control-btn';
  btn.className = existing ? existing.className.replace('active','') : 'scene-control';
  btn.dataset.control = MODULE_ID;
  btn.setAttribute('title', game.i18n.localize('GG.Controls.OpenPanel'));
  btn.setAttribute('aria-label', game.i18n.localize('GG.Controls.OpenPanel'));
  btn.innerHTML = '<i class="fas fa-heartbeat"></i>';
  btn.addEventListener('click', (e) => { e.stopPropagation(); GGHealthPanel.open(); });

  // Insert after the first control (token layer)
  const list = root.querySelector('ol.main-controls') ?? root.querySelector('ol') ?? root;
  const first = list.querySelector('li');
  if (first?.nextSibling) {
    list.insertBefore(btn, first.nextSibling);
  } else {
    list.appendChild(btn);
  }
});