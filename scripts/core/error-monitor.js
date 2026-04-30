/**
 * GG — Error Monitor
 *
 * Intercepts global JS errors and unhandled promise rejections,
 * aggregates duplicates, attributes each error to a module via
 * stack trace analysis, and exposes the error list to the Scorer.
 */

import { PENALTIES, SEVERITY, MODULE_ID, log, warn } from '../utils/constants.js';

/** Maximum number of unique errors we track (memory guard) */
const MAX_ERRORS = 50;

/** If the same error fires more than this many times, stop counting */
const MAX_COUNT  = 99;

export class GGErrorMonitor {

  static _errors  = [];
  static _active  = false;
  static _origOnError = null;
  static _origOnUnhandled = null;

  /* ---------------------------------------------------------------- */
  /*  Public API                                                        */
  /* ---------------------------------------------------------------- */

  static start() {
    if (this._active) return;
    log('ErrorMonitor: starting');

    // Global JS errors
    this._origOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      this._handle({ type: 'error', message: String(message), stack: error?.stack ?? '', source });
      return this._origOnError
        ? this._origOnError(message, source, lineno, colno, error)
        : false;
    };

    // Unhandled promise rejections
    this._origOnUnhandled = window.onunhandledrejection;
    window.addEventListener('unhandledrejection', this._handleRejection.bind(this));

    // Optional: intercept console.error (behind a setting)
    if (game.settings.get(MODULE_ID, 'monitorConsole')) {
      this._patchConsoleError();
    }

    this._active = true;
  }

  static stop() {
    if (!this._active) return;
    window.onerror = this._origOnError;
    window.removeEventListener('unhandledrejection', this._handleRejection.bind(this));
    this._active = false;
    log('ErrorMonitor: stopped');
  }

  static getErrors() {
    return [...this._errors];
  }

  static getErrorsForScorer() {
    return this._errors.map(e => ({
      ...e,
      penalty: this._computePenalty(e),
    }));
  }

  static clear() {
    this._errors = [];
  }

  /* ---------------------------------------------------------------- */
  /*  Internal                                                          */
  /* ---------------------------------------------------------------- */

  static _handleRejection(event) {
    const reason = event.reason;
    const message = reason instanceof Error
      ? reason.message
      : String(reason);
    const stack = reason instanceof Error ? reason.stack ?? '' : '';
    this._handle({ type: 'unhandledrejection', message, stack, source: null });
  }

  /**
   * Core error handler: deduplicates, attributes, stores.
   */
  static _handle({ type, message, stack, source }) {
    // Ignore errors from GG itself
    if (stack.includes('/good-game/') || message.includes('[GoodGame]')) return;

    const key = `${type}::${message}`;
    const existing = this._errors.find(e => e.key === key);

    if (existing) {
      existing.count = Math.min(existing.count + 1, MAX_COUNT);
      existing.lastSeen = Date.now();
      return;
    }

    if (this._errors.length >= MAX_ERRORS) {
      warn('ErrorMonitor: max error slots reached — oldest dropped');
      this._errors.shift();
    }

    const attribution = this._attributeToModule(stack, source);

    this._errors.push({
      key,
      type,
      message,
      stack,
      source,
      count:            1,
      firstSeen:        Date.now(),
      lastSeen:         Date.now(),
      attributedModule: attribution.moduleId,
      confidence:       attribution.confidence,
    });

    // Trigger a reactive score refresh (debounced via the hook system)
    Hooks.callAll('gg:newError', { type, message, attribution });
  }

  /**
   * Stack trace analysis: tries to identify which module caused the error.
   *
   * Strategy:
   *  1. Look for known Foundry module path patterns  (/modules/<id>/)
   *  2. Match against active module IDs
   *  3. Assign confidence based on how specific the match is
   */
  static _attributeToModule(stack, source) {
    // Primary: explicit module path in stack
    const pathMatch = stack.match(/\/modules\/([^/]+)\//);
    if (pathMatch) {
      const moduleId = pathMatch[1];
      const mod = game.modules.get(moduleId);
      if (mod?.active) {
        return { moduleId, confidence: 'high' };
      }
    }

    // Secondary: source URL (for window.onerror)
    if (source) {
      const srcMatch = source.match(/\/modules\/([^/]+)\//);
      if (srcMatch) {
        return { moduleId: srcMatch[1], confidence: 'high' };
      }
    }

    // Tertiary: scan stack lines for module IDs
    const activeIds = [...game.modules.values()]
      .filter(m => m.active)
      .map(m => (m.data ?? m).id ?? m.id);

    for (const id of activeIds) {
      if (stack.includes(id)) {
        return { moduleId: id, confidence: 'medium' };
      }
    }

    return { moduleId: null, confidence: 'low' };
  }

  static _computePenalty(errorRecord) {
    if (errorRecord.confidence === 'high')   return PENALTIES.RUNTIME_ERROR_HIGH;
    if (errorRecord.confidence === 'medium') return PENALTIES.RUNTIME_ERROR_MED;
    return PENALTIES.RUNTIME_ERROR_LOW;
  }

  static _patchConsoleError() {
    const orig = console.error.bind(console);
    console.error = (...args) => {
      const message = args.map(a => String(a)).join(' ');
      this._handle({ type: 'console.error', message, stack: new Error().stack ?? '', source: null });
      orig(...args);
    };
  }
}
