# Good Game (GG) — Game Health Meter

> **"Know if your game is ready before it breaks."**

GG is a Foundry VTT module that analyzes, monitors and evaluates the technical stability of your session — before and during play. It introduces the **Game Health Meter**, a visual 0–100 score that tells you at a glance whether your session is ready to run.

---

## Features

### 🟢 Game Health Score
A 0–100 score computed from penalties for:
- Module incompatibilities with the running Foundry version
- Missing dependencies
- Declared and heuristic conflicts between modules
- Outdated or unverified modules
- Runtime JavaScript errors

| Score | State | Meaning |
|-------|-------|---------|
| 80–100 | **Good Game** | Session is stable. Play on! |
| 50–79 | **Risky Game** | Some issues — proceed with caution |
| 0–49 | **Broken Game** | Critical problems — fix before playing |

### 🤖 OTTO the Mascot
A visual companion that reacts to the session state:
- **Good**: smiling, green eyes, chest panel glowing
- **Risky**: neutral expression, sweat drop
- **Broken**: red eyes, inverted mouth, sparks, cracks

**Customizable avatars**: GMs can choose a mascot that fits their campaign:
- Otto (Robot) — default, system-agnostic
- Gremlin — PF2e default
- Beholder — D&D 5e default
- Investigator — Call of Cthulhu 7e
- Skeleton — generic
- *(Add your own by dropping images in `assets/avatars/<id>/`)*

### 🔍 Module Scanner
Reads every active module's manifest and checks:
- `compatibility.maximum` vs running Foundry version
- `relationships.requires` — missing dependencies
- `relationships.conflicts` — declared conflicts
- Last update date (>180 days = outdated warning)
- Known heuristic hook collisions between popular modules

### ⚠️ Runtime Error Monitor
Intercepts errors silently in the background:
- `window.onerror` — global JS errors
- `unhandledrejection` — unhandled Promises
- Optional `console.error` override
- Stack trace attribution with **high / medium / low** confidence
- Duplicate aggregation (counts repeats, doesn't spam)

### 📸 Session Snapshots
Save the health state before updating modules. Compare before/after to understand exactly what changed and what broke.

### 🌐 i18n Ready
Ships with English and Italian. Add more by contributing a JSON file to `lang/`.

---

## Compatibility

| Foundry Version | Status |
|----------------|--------|
| v10 | ✅ Supported |
| v11 | ✅ Supported |
| v12 | ✅ Supported |
| v13 | ✅ Supported |
| v14+ | ✅ Verified |

Uses `Application` on v10/v11 and `ApplicationV2` on v12+ automatically.

---

## Installation

Paste this URL in Foundry's module installer:
```
https://raw.githubusercontent.com/lonelyfrank/good-game/main/module.json
```

---

## File Structure

```
good-game/
├── module.json               # Manifest
├── scripts/
│   ├── good-game.js          # Entry point
│   ├── core/
│   │   ├── scanner.js        # Module manifest analysis
│   │   ├── scorer.js         # Health score computation
│   │   ├── error-monitor.js  # Runtime error interception
│   │   └── snapshots.js      # Session state snapshots
│   ├── ui/
│   │   ├── health-panel.js   # Main ApplicationV2/Application window
│   │   ├── topbar.js         # Persistent top bar indicator
│   │   ├── settings.js       # Settings registration
│   │   └── avatar-config.js  # Avatar pack management
│   └── utils/
│       └── constants.js      # Shared constants, penalties, tier thresholds
├── templates/
│   └── health-panel.hbs      # Handlebars template
├── styles/
│   └── good-game.css         # Full stylesheet
├── lang/
│   ├── en.json               # English
│   └── it.json               # Italiano
└── assets/
    └── avatars/              # Mascot image packs
        ├── otto/             # good.svg, risky.svg, broken.svg
        ├── goblin/           # good.png, risky.png, broken.png
        ├── beholder/
        ├── investigator/
        └── skeleton/
```

---

## Adding an Avatar Pack

1. Create `assets/avatars/<your-id>/` with `good.png`, `risky.png`, `broken.png`
2. Register the pack in `scripts/ui/avatar-config.js` inside `AVATAR_PACKS`
3. Set `system: 'yourSystemId'` or `null` for all systems
4. Done — no other changes needed

---

## Tuning the Score Formula

All penalty weights live in `scripts/utils/constants.js` under `PENALTIES`. Adjust them to taste:

```js
export const PENALTIES = {
  INCOMPATIBLE_MODULE:  20,
  MISSING_DEPENDENCY:   15,
  DECLARED_CONFLICT:    12,
  HEURISTIC_CONFLICT:    7,
  OUTDATED_MODULE:       5,
  // ...
};
```

---

## Roadmap

- [ ] v0.2 — Conflict Graph (visual dependency graph with D3/SVG)
- [ ] v0.2 — Performance Monitor (FPS, hook latency per module)
- [ ] v0.3 — Community Blacklist (crowd-sourced known bad combos)
- [ ] v0.3 — Auto-fix suggestions per problem
- [ ] v0.4 — Pre-session GO/NO-GO checklist
- [ ] v0.4 — Snapshot diff UI

---

## License

MIT — see LICENSE

## Credits

Built with love for the TTRPG community.  
OTTO the robot mascot © lonelyfrank.
