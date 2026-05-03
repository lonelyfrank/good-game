/**
 * Good Game (GG) — Game Health Meter
 * Main entry point — bootstraps all subsystems
 */

import { GGApp }          from './core/app.js';
import { GGErrorMonitor } from './core/error-monitor.js';
import { GGHealthPanel }  from './ui/health-panel.js';
import { GGTopBar }       from './ui/topbar.js';
import { GGSettings }     from './ui/settings.js';
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

  // 2. Initial scan + score (runtime errors are empty at this point, that's fine)
  const app = new GGApp();
  await app.refresh();
  game.goodGame = app;

  // 3. Render the persistent top-bar indicator (if enabled)
  if (game.settings.get(MODULE_ID, SETTINGS.TOPBAR_ENABLED)) {
    GGTopBar.inject(app.lastScore);
  }

  // 4. Warn the GM if score is below threshold
  const threshold = game.settings.get(MODULE_ID, SETTINGS.WARN_THRESHOLD);
  if (game.user.isGM && app.lastScore.value < threshold) {
    ui.notifications.warn(
      game.i18n.format('GG.Notifications.LowScore', { score: app.lastScore.value }),
      { permanent: false }
    );
  }

  log(`Initial health score: ${app.lastScore.value}`);
});

/* ------------------------------------------------------------------ */
/*  UI refresh — fired by GGApp.refresh() via Hooks.callAll            */
/* ------------------------------------------------------------------ */

Hooks.on('gg:refresh', (score) => {
  GGTopBar.update(score);
  if (GGHealthPanel.instance?.rendered) {
    GGHealthPanel.instance.render(true);
  }
});

/* ------------------------------------------------------------------ */
/*  Scene load hook — re-scan after loading a scene                    */
/* ------------------------------------------------------------------ */

Hooks.on('canvasReady', () => {
  if (!game.user.isGM) return;
  if (!game.settings.get(MODULE_ID, SETTINGS.SCAN_ON_SCENE)) return;
  // Debounce: wait 2 s after canvas ready to let modules settle
  setTimeout(() => game.goodGame?.refresh(), 2000);
});

/* ------------------------------------------------------------------ */
/*  Scene control button — v10/v11/v12 only (array-based API)          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Scene control button — v13+ (DOM injection after render)           */
/* ------------------------------------------------------------------ */

Hooks.on('renderSceneControls', (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root) return;

  if (root.querySelector('#gg-control-btn')) return;

  const menu = root.querySelector('menu[data-application-part="layers"]');
  if (!menu) return;

  const li  = document.createElement('li');
  const btn = document.createElement('button');
  btn.id        = 'gg-control-btn';
  btn.type      = 'button';
  btn.className = 'control ui-control layer icon fa-solid fa-heart-pulse';
  btn.setAttribute('data-tooltip', game.i18n.localize('GG.Controls.OpenPanel'));
  btn.setAttribute('aria-label',   game.i18n.localize('GG.Controls.OpenPanel'));
  btn.addEventListener('click', (e) => { e.stopPropagation(); GGHealthPanel.open(); });

  li.appendChild(btn);
  menu.appendChild(li);
});
