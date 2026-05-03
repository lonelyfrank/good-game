/**
 * GG — Application State
 *
 * Owns the live scan/score state exposed as game.goodGame and orchestrates
 * the refresh cycle. UI updates are decoupled via the 'gg:refresh' hook so
 * this class has no dependency on ui/ modules.
 */

import { GGScanner }      from './scanner.js';
import { GGScorer }       from './scorer.js';
import { GGErrorMonitor } from './error-monitor.js';
import { GGSnapshots }    from './snapshots.js';
import { MODULE_ID }      from '../utils/constants.js';

export class GGApp {

  constructor() {
    this.scanner      = GGScanner;
    this.scorer       = GGScorer;
    this.errorMonitor = GGErrorMonitor;
    this.snapshots    = GGSnapshots;
    this.lastScan     = null;
    this.lastScore    = null;
    this.version      = game.modules.get(MODULE_ID)?.version ?? '?';
  }

  /**
   * Re-run a full scan, recompute the score (including live runtime errors),
   * and broadcast 'gg:refresh' so UI components can update themselves.
   * @returns {Promise<ScoreResult>}
   */
  async refresh() {
    this.lastScan  = await GGScanner.scan();
    this.lastScore = GGScorer.compute(this.lastScan, GGErrorMonitor.getErrorsForScorer());
    Hooks.callAll('gg:refresh', this.lastScore);
    return this.lastScore;
  }
}
