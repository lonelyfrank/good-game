/**
 * GG — Scorer
 *
 * Takes a ScanResult from the Scanner and computes the Game Health Score.
 * The scoring model is additive-penalty: start at 100, subtract penalty
 * points for each problem found, clamp to [0, 100].
 *
 * The model is intentionally modular — penalties live in constants.js
 * so the community can tune them without touching core logic.
 */

import { SEVERITY, getTier, clamp, log } from '../utils/constants.js';

export class GGScorer {

  /**
   * Compute a ScoreResult from a ScanResult.
   * @param {object} scanResult  Output of GGScanner.scan()
   * @param {object} [runtimeErrors]  Live error data from GGErrorMonitor
   * @returns {ScoreResult}
   */
  static compute(scanResult, runtimeErrors = []) {
    let totalPenalty = 0;
    const breakdown  = [];

    // --- Module-level problems ---
    for (const problem of scanResult.problems) {
      const penalty = problem.penalty ?? 0;
      totalPenalty += penalty;
      breakdown.push({
        source:     problem.moduleId ?? 'system',
        type:       problem.type,
        severity:   problem.severity,
        penalty,
        message:    problem.message,
        suggestion: problem.suggestion,
      });
    }

    // --- Runtime errors from the Error Monitor ---
    for (const rErr of runtimeErrors) {
      const penalty = rErr.penalty ?? 2;
      totalPenalty += penalty;
      breakdown.push({
        source:   rErr.attributedModule ?? 'unknown',
        type:     'runtime-error',
        severity: SEVERITY.INFO,
        penalty,
        message:  `${rErr.type}: ${rErr.message} (×${rErr.count})`,
      });
    }

    const raw   = 100 - totalPenalty;
    const value = clamp(raw);
    const tier  = getTier(value);

    const stats = {
      critical: breakdown.filter(p => p.severity === SEVERITY.CRITICAL).length,
      warning:  breakdown.filter(p => p.severity === SEVERITY.WARNING).length,
      info:     breakdown.filter(p => p.severity === SEVERITY.INFO).length,
    };

    log(`Scorer: raw=${raw} clamped=${value} tier=${tier.key}`);

    return {
      value,
      tier,
      totalPenalty,
      breakdown,
      stats,
      timestamp: scanResult.timestamp,
    };
  }

  /**
   * Produce a human-readable summary string for notifications/tooltips.
   * Uses i18n keys so translations work automatically.
   */
  static summarize(scoreResult) {
    const { value, tier, stats } = scoreResult;
    return game.i18n.format('GG.Score.Summary', {
      score:    value,
      tier:     game.i18n.localize(`GG.Tier.${tier.key}`),
      critical: stats.critical,
      warning:  stats.warning,
    });
  }
}
