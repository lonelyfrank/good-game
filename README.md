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

### 🎭 Session Mascot
A visual companion that reacts to the session state in three moods — healthy, worried, and broken. The GM can choose a mascot that fits their campaign from the **Mascot** tab inside the panel.

To add a custom mascot pack, create `assets/avatars/<your-id>/` with `good.svg`, `risky.svg`, `broken.svg` and register it in `avatar-config.js`.

### 🔍 Module Scanner
Reads every active module's manifest and checks:
- `compatibility.verified` vs running Foundry version
- `compatibility.maximum` if declared
- `relationships.requires` — missing dependencies
- `relationships.conflicts` — declared conflicts
- Known heuristic hook collisions between popular modules

### ⚠️ Runtime Error Monitor
Intercepts errors silently in the background:
- `window.onerror` — global JS errors
- `unhandledrejection` — unhandled Promises
- Optional `console.error` override
- Stack trace attribution with **high / medium / low** confidence
- Duplicate aggregation

### 📸 Session Snapshots
Save the health state before updating modules and compare before/after.

### 🌐 i18n Ready
Ships with English and Italian. Add more by contributing a JSON file to `lang/`.

---

## Compatibility

| Foundry Version | Status |
|----------------|--------|
| v10 / v11 | 🟡 Legacy path (Application fallback — untested) |
| v12 / v13 | 🟡 ApplicationV2 path — untested |
| v14 | ✅ Verified |

---

## Installation

```
https://raw.githubusercontent.com/lonelyfrank/good-game/main/module.json
```

---

## File Structure

```
good-game/
├── module.json
├── scripts/
│   ├── good-game.js
│   ├── core/
│   │   ├── scanner.js
│   │   ├── scorer.js
│   │   ├── error-monitor.js
│   │   └── snapshots.js
│   ├── ui/
│   │   ├── health-panel.js
│   │   ├── topbar.js
│   │   ├── settings.js
│   │   └── avatar-config.js
│   └── utils/
│       └── constants.js
├── templates/
│   └── health-panel.hbs
├── styles/
│   └── good-game.css
├── lang/
│   ├── en.json
│   └── it.json
└── assets/
    └── avatars/
        ├── boblin/    ← good.svg, risky.svg, broken.svg
        ├── otto/
        └── borbok/
```

---

## Adding a Mascot Pack

```js
{
  id:     'my-mascot',
  label:  'My Mascot',
  system: null,
  states: {
    good:   'assets/avatars/my-mascot/good.svg',
    risky:  'assets/avatars/my-mascot/risky.svg',
    broken: 'assets/avatars/my-mascot/broken.svg',
  },
}
```

---

## Tuning the Score Formula

All penalty weights live in `scripts/utils/constants.js` under `PENALTIES`.

---

## Roadmap

- [x] v0.1 — Dependency Graph (SVG, force-directed)
- [x] v0.1 — Suggest Fix per problem
- [x] v0.1 — Snapshot diff UI
- [x] v0.1 — Runtime error click-to-expand
- [ ] v0.2 — Performance Monitor
- [ ] v0.3 — Community Blacklist
- [ ] v0.4 — Pre-session GO/NO-GO checklist

---
