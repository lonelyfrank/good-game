/**
 * GG — Module Scanner
 *
 * Reads game.modules, parses manifests and produces a structured
 * ScanResult that the Scorer consumes to compute the health score.
 *
 * Compatible: Foundry v10–v14+
 */

import { SEVERITY, PENALTIES, log } from '../utils/constants.js';

export class GGScanner {

  /**
   * Run a full scan of all active modules.
   * @returns {Promise<ScanResult>}
   */
  static async scan() {
    log('Scanner: starting scan…');

    const foundryVersion = this._getFoundryVersion();
    const activeModules  = [...game.modules.values()].filter(m => this._isActive(m));

    const moduleReports = activeModules.map(mod =>
      this._analyzeModule(mod, foundryVersion, activeModules)
    );

    const heuristicConflicts = this._detectHeuristicConflicts(activeModules);

    const result = {
      timestamp:        Date.now(),
      foundryVersion,
      systemId:         game.system.id,
      systemVersion:    game.system.version,
      totalActive:      activeModules.length,
      modules:          moduleReports,
      heuristicConflicts,
      problems:         this._collectProblems(moduleReports, heuristicConflicts),
    };

    log(`Scanner: done — ${result.problems.length} problems found`);
    return result;
  }

  /* -------------------- private helpers ---------------------------- */

  // v11+ stores data directly on the module object; v10 uses mod.data
  static _getModuleData(mod) {
    return mod.data ?? mod;
  }

  static _isActive(mod) {
    return mod.active === true;
  }

  static _getFoundryVersion() {
    return game.version ?? game.data?.version ?? '0';
  }

  /**
   * Analyze a single module and produce a ModuleReport.
   */
  static _analyzeModule(mod, foundryVersion, allActive) {
    const data     = this._getModuleData(mod);
    const id       = data.id ?? mod.id;
    const title    = data.title ?? id;
    const compat   = data.compatibility ?? {};
    const rels     = data.relationships   ?? {};

    const problems = [];

    // 1. Compatibility check
    const compatStatus = this._checkCompatibility(compat, foundryVersion);
    if (compatStatus.incompatible) {
      problems.push({
        type:       'incompatible',
        severity:   SEVERITY.CRITICAL,
        penalty:    PENALTIES.INCOMPATIBLE_MODULE,
        message:    `Verified for v${compat.verified ?? '?'}, running v${foundryVersion}`,
        suggestion: 'GG.Suggestion.Incompatible',
        moduleId:   id,
      });
    }

    // 2. Unverified (no verified field, or verified is very old)
    if (!compat.verified) {
      problems.push({
        type:       'unverified',
        severity:   SEVERITY.INFO,
        penalty:    PENALTIES.UNVERIFIED_MODULE,
        message:    'No verified version declared in manifest',
        suggestion: 'GG.Suggestion.Unverified',
        moduleId:   id,
      });
    }

    // 3. Outdated check (last update > 180 days)
    const outdated = this._checkOutdated(data, foundryVersion);
    if (outdated.isOutdated) {
      problems.push({
        type:       'outdated',
        severity:   SEVERITY.WARNING,
        penalty:    PENALTIES.OUTDATED_MODULE,
        message:    outdated.daysAgo ? `Last update: ${outdated.daysAgo} days ago` : `Verified for v${outdated.verMajor}, running v${foundryVersion.split('.')[0]}`,
        suggestion: 'GG.Suggestion.Outdated',
        moduleId:   id,
      });
    }

    // 4. Missing dependencies
    const requiredDeps = (rels.requires ?? []);
    for (const dep of requiredDeps) {
      const depId     = dep.id ?? dep;
      const depMod    = game.modules.get(depId);
      const depActive = depMod && this._isActive(depMod);
      if (!depActive) {
        problems.push({
          type:       'missing-dependency',
          severity:   SEVERITY.CRITICAL,
          penalty:    PENALTIES.MISSING_DEPENDENCY,
          message:    `Requires "${depId}" — not found or inactive`,
          suggestion: 'GG.Suggestion.MissingDep',
          moduleId:   id,
          relatedId:  depId,
        });
      }
    }

    // 5. Declared conflicts
    const declaredConflicts = (rels.conflicts ?? []);
    for (const conflict of declaredConflicts) {
      const cId  = conflict.id ?? conflict;
      const cMod = game.modules.get(cId);
      if (cMod && this._isActive(cMod)) {
        problems.push({
          type:       'declared-conflict',
          severity:   SEVERITY.CRITICAL,
          penalty:    PENALTIES.DECLARED_CONFLICT,
          message:    `Declares conflict with "${cId}" which is active`,
          suggestion: 'GG.Suggestion.DeclaredConflict',
          moduleId:   id,
          relatedId:  cId,
        });
      }
    }

    return {
      id,
      title,
      version:   data.version ?? '?',
      compat,
      problems,
      requires:  (rels.requires  ?? []).map(r => r.id ?? r),
      conflicts: (rels.conflicts ?? []).map(r => r.id ?? r),
      status:    problems.length === 0                                      ? 'ok'
               : problems.some(p => p.severity === SEVERITY.CRITICAL) ? 'critical'
               : 'warning',
    };
  }

  /**
   * Checks whether a module is compatible with the running Foundry version.
   */
  static _checkCompatibility(compat, foundryVersion) {
    try {
      const runMajor = parseInt(foundryVersion.split(".")[0]);
      if (compat.maximum) {
        const maxMajor = parseInt(String(compat.maximum).split(".")[0]);
        if (runMajor > maxMajor) return { incompatible: true, reason: "maximum" };
      }
      if (compat.verified) {
        const verMajor = parseInt(String(compat.verified).split(".")[0]);
        if (runMajor - verMajor >= 2) return { incompatible: true, reason: "verified", verMajor, runMajor };
      }
      return { incompatible: false };
    } catch {
      return { incompatible: false };
    }
  }

  /**
   * Rough heuristic: if manifest has a lastUpdate/date field older than 180 days.
   * Many modules don't expose this, so we degrade gracefully.
   */
  static _checkOutdated(data, foundryVersion) {
    const raw = data.lastUpdate ?? data.date ?? null;
    if (raw) {
      try {
        const ms = Date.parse(raw);
        const daysAgo = Math.floor((Date.now() - ms) / 86_400_000);
        if (daysAgo > 180) return { isOutdated: true, daysAgo };
      } catch { /* ignore */ }
    }
    try {
      const compat = data.compatibility ?? {};
      if (compat.verified && foundryVersion) {
        const runMajor = parseInt(foundryVersion.split(".")[0]);
        const verMajor = parseInt(String(compat.verified).split(".")[0]);
        if (runMajor - verMajor === 1) return { isOutdated: true, daysAgo: null, verMajor };
      }
    } catch { /* ignore */ }
    return { isOutdated: false };
  }

  /**
   * Heuristic conflict detection:
   * Finds hooks/classes that multiple modules override simultaneously.
   */
  static _detectHeuristicConflicts(activeModules) {
    const conflicts = [];

    const KNOWN_COLLISIONS = [
      ['renderChatMessage',   ['midi-qol', 'dnd5e-helpers', 'betterrolls5e']],
      ['preCreateChatMessage',['midi-qol', 'ready-set-roll-5e']],
      ['CanvasVisibility',    ['perfect-vision', 'levels']],
      ['Token._draw',         ['token-magic', 'levels']],
      ['lightingRefresh',     ['perfect-vision', 'fxmaster']],
    ];

    const activeIds = new Set(activeModules.map(m => this._getModuleData(m).id ?? m.id));

    for (const [hook, patterns] of KNOWN_COLLISIONS) {
      const matching = patterns.filter(p => activeIds.has(p));
      if (matching.length >= 2) {
        conflicts.push({
          type:       'heuristic-conflict',
          severity:   SEVERITY.WARNING,
          penalty:    PENALTIES.HEURISTIC_CONFLICT,
          hook,
          modules:    matching,
          message:    `${matching.join(' + ')} both override ${hook}`,
          suggestion: 'GG.Suggestion.HeuristicConflict',
        });
      }
    }

    return conflicts;
  }

  static _collectProblems(moduleReports, heuristicConflicts) {
    const fromModules = moduleReports.flatMap(r => r.problems);
    return [...fromModules, ...heuristicConflicts];
  }
}
