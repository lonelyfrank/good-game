/**
 * GG — Avatar Config
 *
 * Manages the list of available mascot avatars and the GM's active choice.
 * Each avatar has three states: good / risky / broken.
 *
 * To add a new avatar pack:
 *   1. Drop images in assets/avatars/<pack-id>/
 *   2. Register the pack in AVATAR_PACKS below
 *   3. Done — no other changes needed
 */

import { MODULE_ID, SETTINGS } from '../utils/constants.js';

/** Built-in avatar packs */
export const AVATAR_PACKS = [
  {
    id:     'default',
    label:  game?.i18n?.localize('GG.Avatar.Boblin') ?? 'Boblin',
    system: null,
    states: {
      good:   'assets/avatars/boblin/good.svg',
      risky:  'assets/avatars/boblin/risky.svg',
      broken: 'assets/avatars/boblin/broken.svg',
    },
  },
  {
    id:     'otto',
    label:  game?.i18n?.localize('GG.Avatar.Otto') ?? 'Otto',
    system: null,
    states: {
      good:   'assets/avatars/otto/good.svg',
      risky:  'assets/avatars/otto/risky.svg',
      broken: 'assets/avatars/otto/broken.svg',
    },
  },
  {
    id:     'borbok',
    label:  game?.i18n?.localize('GG.Avatar.Borbok') ?? 'Borbok',
    system: null,
    states: {
      good:   'assets/avatars/borbok/good.svg',
      risky:  'assets/avatars/borbok/risky.svg',
      broken: 'assets/avatars/borbok/broken.svg',
    },
  },
];

export class GGAvatarConfig {

  /**
   * Return the list of packs available for the current game system,
   * plus all system-agnostic packs.
   */
  static getAvailable() {
    const sysId = game.system.id;
    return AVATAR_PACKS.filter(p => p.system === null || p.system === sysId);
  }

  /**
   * Return the active avatar pack, defaulting intelligently by system.
   */
  static getActive() {
    const saved = game.settings.get(MODULE_ID, SETTINGS.AVATAR_ID);
    const found = AVATAR_PACKS.find(p => p.id === saved);
    if (found) return found;

    // Auto-suggest by system
    const sysDefault = AVATAR_PACKS.find(p => p.system === game.system.id);
    return sysDefault ?? AVATAR_PACKS[0];
  }

  /**
   * Get the image path for a given tier state.
   * @param {'good'|'risky'|'broken'} tierKey
   */
  static getImage(tierKey) {
    const avatar = this.getActive();
    const path   = avatar.states[tierKey];
    // Prefix with module path so Foundry can find the asset
    return `modules/${MODULE_ID}/${path}`;
  }

  /**
   * Persist the GM's avatar choice.
   */
  static async set(avatarId) {
    await game.settings.set(MODULE_ID, SETTINGS.AVATAR_ID, avatarId);
  }

  /**
   * Return structured data for the avatar picker UI template.
   */
  static getPickerData() {
    const active    = this.getActive();
    const available = this.getAvailable();
    return {
      active,
      available: available.map(p => ({
        ...p,
        isActive:   p.id === active.id,
        previewSrc: `modules/${MODULE_ID}/${p.states.good}`,
      })),
    };
  }
}