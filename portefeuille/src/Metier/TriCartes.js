/**
 * TriCartes.js
 * Ordre d'affichage des cartes du portefeuille : « ma carte » d'abord, puis
 * les favoris, puis les autres, chaque groupe trié selon le choix (plus
 * récentes, A → Z, ou par entreprise).
 */

import { nomComplet } from '../../../src/Metier/Personne.js';

export const ORDRES = [['recentes', 'Plus récentes'], ['az', 'A → Z'], ['entreprise', 'Par entreprise']];
export const ORDRE_PAR_DEFAUT = 'recentes';

/**
 * Compare deux textes en français (vides à la fin).
 * @param {string} a - Premier texte.
 * @param {string} b - Second texte.
 * @returns {number} Résultat de comparaison.
 */
function comparerTextes(a, b) {
  if (!a !== !b) return a ? -1 : 1;
  return a.localeCompare(b, 'fr', { sensitivity: 'base' });
}

// Comparaison de deux cartes pour chaque ordre.
const COMPARAISONS = {
  recentes: (a, b) => b.ajouteLe.localeCompare(a.ajouteLe),
  az: (a, b) => comparerTextes(nomComplet(a.personne), nomComplet(b.personne)),
  entreprise: (a, b) => comparerTextes(a.personne.entreprise, b.personne.entreprise) || comparerTextes(nomComplet(a.personne), nomComplet(b.personne)),
};

/**
 * Rang du groupe d'une carte (ma carte, favori, autre).
 * @param {object} carte - Carte.
 * @returns {number} 0, 1 ou 2.
 */
function groupe(carte) {
  if (carte.maCarte) return 0;
  return carte.favori ? 1 : 2;
}

/**
 * Trie les cartes (sans modifier la liste d'origine).
 * @param {object[]} cartes - Cartes du portefeuille.
 * @param {string} ordre - Clé de ORDRES (ordre par défaut si inconnue).
 * @returns {object[]} Cartes triées.
 */
export function trierCartes(cartes, ordre) {
  const comparer = COMPARAISONS[ordre] || COMPARAISONS[ORDRE_PAR_DEFAUT];
  return [...cartes].sort((a, b) => groupe(a) - groupe(b) || comparer(a, b));
}
