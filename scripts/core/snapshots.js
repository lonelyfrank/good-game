/**
 * GG — Snapshot System
 *
 * Saves the current health state (score + problems) to
 * game settings (world-scoped) and allows before/after diffing.
 */

import { MODULE_ID, STORAGE_KEY, log } from '../utils/constants.js';
const MAX_SNAPSHOTS = 10;

export class GGSnapshots {

  /**
   * Save a snapshot of the current session state.
   * @param {ScoreResult} scoreResult
   * @param {ScanResult}  scanResult
   * @param {string}      [label]  Optional human label
   */
  static async save(scoreResult, scanResult, label = null) {
    const snapshots = this._load();

    const snap = {
      id:       foundry.utils.randomID(),
      label:    label ?? this._autoLabel(),
      savedAt:  Date.now(),
      score:    scoreResult.value,
      tier:     scoreResult.tier.key,
      stats:    scoreResult.stats,
      problems: scoreResult.breakdown.map(p => ({
        source:   p.source,
        type:     p.type,
        severity: p.severity,
        penalty:  p.penalty,
        message:  p.message,
      })),
      modules: {
        total:  scanResult.totalActive,
        system: scanResult.systemId,
        foundry: scanResult.foundryVersion,
      },
    };

    snapshots.unshift(snap);
    if (snapshots.length > MAX_SNAPSHOTS) snapshots.length = MAX_SNAPSHOTS;

    await this._persist(snapshots);
    log(`Snapshot saved: "${snap.label}" — score ${snap.score}`);

    ui.notifications.info(
      game.i18n.format('GG.Snapshots.Saved', { label: snap.label, score: snap.score })
    );

    return snap;
  }

  static list() {
    return this._load();
  }

  static get(id) {
    return this._load().find(s => s.id === id) ?? null;
  }

  static async delete(id) {
    const snapshots = this._load().filter(s => s.id !== id);
    await this._persist(snapshots);
  }

  /**
   * Diff two snapshots and return a structured delta.
   * @param {string} beforeId
   * @param {string} afterId
   */
  static diff(beforeId, afterId) {
    const before = this.get(beforeId);
    const after  = this.get(afterId);
    if (!before || !after) return null;

    const scoreDelta = after.score - before.score;

    // Problems that appeared or disappeared
    const beforeKeys = new Set(before.problems.map(p => `${p.source}::${p.type}`));
    const afterKeys  = new Set(after.problems.map(p  => `${p.source}::${p.type}`));

    const resolved = before.problems.filter(p => !afterKeys.has(`${p.source}::${p.type}`));
    const newProbs = after.problems.filter(p  => !beforeKeys.has(`${p.source}::${p.type}`));

    return {
      scoreDelta,
      improved:  scoreDelta > 0,
      before:    { score: before.score, tier: before.tier, label: before.label },
      after:     { score: after.score,  tier: after.tier,  label: after.label  },
      resolved,
      newProblems: newProbs,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Storage                                                           */
  /* ---------------------------------------------------------------- */

  static _load() {
    try {
      const raw = game.settings.get(MODULE_ID, STORAGE_KEY);
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  static async _persist(snapshots) {
    await game.settings.set(MODULE_ID, STORAGE_KEY, snapshots);
  }

  static _autoLabel() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
