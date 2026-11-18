/**
 * SelectionCarte.js
 * Personne sélectionnée dans l'onglet « Cartes », partagée entre la
 * liste, le formulaire, l'aperçu et les exports.
 */

let selectionId = '';
const abonnes = new Set();

/**
 * Renvoie l'identifiant de la personne sélectionnée.
 * @returns {string} Identifiant ('' si aucune).
 */
export function personneSelectionnee() {
  return selectionId;
}

/**
 * Sélectionne une personne.
 * @param {string} id - Identifiant ('' pour aucune).
 */
export function selectionnerPersonne(id) {
  if (id === selectionId) return;
  selectionId = id;
  abonnes.forEach((rappel) => rappel(id));
}

/**
 * Abonne une fonction aux changements de sélection.
 * @param {Function} rappel - Reçoit l'identifiant sélectionné.
 */
export function abonnerSelection(rappel) {
  abonnes.add(rappel);
}
