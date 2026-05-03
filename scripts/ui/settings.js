/**
 * GG — Settings Registration
 */

import { MODULE_ID, SETTINGS } from '../utils/constants.js';
import { AVATAR_PACKS }         from './avatar-config.js';

export class GGSettings {

  static register() {

    // ── Snapshot storage (world-scoped, hidden from UI) ──────────────
    game.settings.register(MODULE_ID, 'gg-snapshots', {
      scope:   'world',
      config:  false,
      type:    Array,
      default: [],
    });

    // ── Warning threshold ────────────────────────────────────────────
    game.settings.register(MODULE_ID, SETTINGS.WARN_THRESHOLD, {
      name:    'GG.Settings.WarnThreshold.Name',
      hint:    'GG.Settings.WarnThreshold.Hint',
      scope:   'world',
      config:  true,
      type:    Number,
      range:   { min: 0, max: 100, step: 5 },
      default: 70,
    });

    // ── Avatar choice ────────────────────────────────────────────────
    game.settings.register(MODULE_ID, SETTINGS.AVATAR_ID, {
      name:    'GG.Settings.AvatarId.Name',
      hint:    'GG.Settings.AvatarId.Hint',
      scope:   'client',
      config:  true,
      type:    String,
      choices: Object.fromEntries(AVATAR_PACKS.map(p => [p.id, p.label])),
      default: 'default',
    });

    // ── Monitor console.error ────────────────────────────────────────
    game.settings.register(MODULE_ID, SETTINGS.MONITOR_CONSOLE, {
      name:    'GG.Settings.MonitorConsole.Name',
      hint:    'GG.Settings.MonitorConsole.Hint',
      scope:   'client',
      config:  true,
      type:    Boolean,
      default: false,
    });

    // ── Scan on scene load ───────────────────────────────────────────
    game.settings.register(MODULE_ID, SETTINGS.SCAN_ON_SCENE, {
      name:    'GG.Settings.ScanOnScene.Name',
      hint:    'GG.Settings.ScanOnScene.Hint',
      scope:   'world',
      config:  true,
      type:    Boolean,
      default: true,
    });

    // ── Top bar visibility ───────────────────────────────────────────
    game.settings.register(MODULE_ID, SETTINGS.TOPBAR_ENABLED, {
      name:    'GG.Settings.TopbarEnabled.Name',
      hint:    'GG.Settings.TopbarEnabled.Hint',
      scope:   'client',
      config:  true,
      type:    Boolean,
      default: true,
    });

    // ── Top bar position ─────────────────────────────────────────────
    game.settings.register(MODULE_ID, SETTINGS.TOPBAR_POSITION, {
      name:    'GG.Settings.TopbarPosition.Name',
      hint:    'GG.Settings.TopbarPosition.Hint',
      scope:   'client',
      config:  true,
      type:    String,
      choices: {
        'top-right': 'GG.Settings.TopbarPosition.TopRight',
        'top-left':  'GG.Settings.TopbarPosition.TopLeft',
      },
      default: 'top-right',
    });
  }
}