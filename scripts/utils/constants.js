/**
 * GG — Shared constants and utilities
 */

export const MODULE_ID = 'good-game';

export const SETTINGS = {
  WARN_THRESHOLD:  'warnThreshold',
  AVATAR_ID:       'avatarId',
  MONITOR_CONSOLE: 'monitorConsole',
  TOPBAR_ENABLED:  'topbarEnabled',
  TOPBAR_POSITION: 'topbarPosition',
  SCAN_ON_READY:   'scanOnReady',
  SCAN_ON_SCENE:   'scanOnScene',
};

/** Score tier boundaries */
export const TIERS = {
  GOOD:   { min: 80,  max: 100, key: 'good',   color: '#639922', textColor: '#3B6D11' },
  RISKY:  { min: 50,  max: 79,  key: 'risky',  color: '#EF9F27', textColor: '#854F0B' },
  BROKEN: { min: 0,   max: 49,  key: 'broken', color: '#E24B4A', textColor: '#A32D2D' },
};

/** Penalty weights — tweak here to tune the scoring formula */
export const PENALTIES = {
  INCOMPATIBLE_MODULE:     20,   // module declares max version < current Foundry
  MISSING_DEPENDENCY:      15,   // required relationship not found in active modules
  DECLARED_CONFLICT:       12,   // manifest explicitly lists a conflict
  HEURISTIC_CONFLICT:       7,   // same hook/class overridden by 2+ modules
  OUTDATED_MODULE:          5,   // last update > 180 days, not verified for current ver
  UNVERIFIED_MODULE:        3,   // no verified field in manifest
  RUNTIME_ERROR_HIGH:      10,   // error attributed with high confidence to a module
  RUNTIME_ERROR_MED:        5,
  RUNTIME_ERROR_LOW:        2,
  UNHANDLED_PROMISE:        4,
};

/** Severity levels for problems */
export const SEVERITY = {
  CRITICAL: 'critical',
  WARNING:  'warning',
  INFO:     'info',
};

/**
 * Returns the tier object for a given numeric score.
 * @param {number} score
 * @returns {object} tier
 */
export function getTier(score) {
  if (score >= TIERS.GOOD.min)  return TIERS.GOOD;
  if (score >= TIERS.RISKY.min) return TIERS.RISKY;
  return TIERS.BROKEN;
}

/**
 * Clamped score helper.
 * @param {number} n
 */
export function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Module-namespaced console logger.
 * Only logs when Foundry CONFIG.debug.hooks is true or in dev mode.
 */
export function log(...args) {
  if (CONFIG?.debug?.hooks || globalThis.__GG_DEV__) {
    console.log('%c[GoodGame]', 'color:#3B6D11;font-weight:bold', ...args);
  }
}

export function warn(...args) {
  console.warn('%c[GoodGame]', 'color:#854F0B;font-weight:bold', ...args);
}

export function err(...args) {
  console.error('%c[GoodGame]', 'color:#A32D2D;font-weight:bold', ...args);
}