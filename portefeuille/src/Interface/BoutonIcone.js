/**
 * BoutonIcone.js
 * Bouton du portefeuille avec une icône du Configurateur (tracé SVG, pas
 * d'emoji) devant son libellé.
 */

import { creerElement } from '../../../src/Utilitaires/Dom.js';
import { icone } from '../../../src/Interface/Icones.js';

/**
 * Crée un bouton avec icône.
 * @param {string} nomIcone - Nom de l'icône (Icones.js).
 * @param {string} texte - Libellé ('' : icône seule, avec aideLecture).
 * @param {object} [options] - { classe, pleine, aideLecture, surClic, attributs }.
 * @returns {HTMLButtonElement} Bouton.
 */
export function boutonIcone(nomIcone, texte, options = {}) {
  const { classe = 'PBouton', pleine = false, aideLecture, surClic, attributs = {} } = options;
  return creerElement('button', {
    classe, surClic, attributs: { type: 'button', 'aria-label': aideLecture, ...attributs },
  }, [icone(nomIcone, pleine), texte ? creerElement('span', { texte }) : null]);
}
