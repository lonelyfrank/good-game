/**
 * GG — Top Bar Injector
 *
 * Injects a compact health indicator into the Foundry top navigation bar.
 * Clicking it opens the full Health Panel.
 *
 * Compatible: v10–v14+ (uses plain DOM manipulation, no Application API)
 */

import { MODULE_ID, getTier } from '../utils/constants.js';
import { GGHealthPanel }       from './health-panel.js';
import { GGAvatarConfig }      from './avatar-config.js';

export class GGTopBar {

  static _el = null;
  static _delegated = false;

  /**
   * Register a single document-level click delegate — called once.
   * This survives any DOM manipulation Foundry does after injection.
   */
  static _ensureDelegate() {
    if (this._delegated) return;
    document.addEventListener('pointerup', (e) => {
      if (e.target.closest('#gg-topbar')) GGHealthPanel.open();
    });
    this._delegated = true;
  }

  /**
   * Inject the indicator into #navigation or #controls depending on Foundry version.
   */
  static inject(scoreResult) {
    if (this._el) this._el.remove();

    const tier   = scoreResult.tier;
    const value  = scoreResult.value;
    const avatar = GGAvatarConfig.getImage(tier.key);

    // Build the element
    const el = document.createElement('div');
    el.id = 'gg-topbar';
    el.className = `gg-topbar gg-tier-${tier.key}`;
    el.setAttribute('title', game.i18n.format('GG.TopBar.Tooltip', { score: value, tier: game.i18n.localize(`GG.Tier.${tier.key}`) }));
    el.innerHTML = `
      <img class="gg-topbar__avatar" src="${avatar}" alt="GG avatar" />
      <div class="gg-topbar__bar-wrap">
        <div class="gg-topbar__bar-fill" style="width:${value}%"></div>
      </div>
      <span class="gg-topbar__score">${value}</span>
      <span class="gg-topbar__label">${game.i18n.localize(`GG.Tier.${tier.key}`)}</span>
    `;

    // Injection target differs slightly across Foundry versions
    // v12+ has #ui-top; v10/11 use #navigation
    const target =
      document.querySelector('#ui-top') ??
      document.querySelector('#navigation') ??
      document.body;

    target.appendChild(el);
    this._el = el;
    this._ensureDelegate();
  }

  /**
   * Update the indicator in-place without re-injecting.
   */
  static update(scoreResult) {
    if (!this._el) return;

    const { value, tier } = scoreResult;

    this._el.className = `gg-topbar gg-tier-${tier.key}`;
    this._el.setAttribute('title', game.i18n.format('GG.TopBar.Tooltip', { score: value, tier: game.i18n.localize(`GG.Tier.${tier.key}`) }));

    const fill   = this._el.querySelector('.gg-topbar__bar-fill');
    const score  = this._el.querySelector('.gg-topbar__score');
    const label  = this._el.querySelector('.gg-topbar__label');
    const avatar = this._el.querySelector('.gg-topbar__avatar');

    if (fill)   fill.style.width = `${value}%`;
    if (score)  score.textContent = value;
    if (label)  label.textContent = game.i18n.localize(`GG.Tier.${tier.key}`);
    if (avatar) avatar.src = GGAvatarConfig.getImage(tier.key);
  }

  static remove() {
    this._el?.remove();
    this._el = null;
  }
}