/**
 * IdentiteVisuelle.js
 * Couleurs et logo d'une carte, réutilisés hors de la carte (signature
 * e-mail, fond Teams / Zoom) pour garder la même identité visuelle.
 */

import { luminance } from '../Utilitaires/Couleurs.js';

const ACCENT_PAR_DEFAUT = '#2563eb';
// Champs dont la couleur sert d'accent, par ordre de préférence.
const CHAMPS_ACCENT = ['poste', 'entreprise', 'nomComplet'];

/**
 * Éléments visibles des deux faces (recto d'abord).
 * @param {object} modele - Modèle normalisé.
 * @returns {object[]} Éléments.
 */
function elementsVisibles(modele) {
  return [...modele.recto.elements, ...modele.verso.elements].filter((e) => e.visible);
}

/**
 * Couleur d'accent de la carte : couleur du poste (ou de l'entreprise, du nom)
 * si elle n'est ni trop claire ni trop sombre, sinon un bleu par défaut.
 * @param {object} modele - Modèle normalisé.
 * @returns {string} Couleur #rrggbb.
 */
export function couleurAccent(modele) {
  const textes = elementsVisibles(modele).filter((e) => e.type === 'texte' && e.source === 'champ');
  for (const champ of CHAMPS_ACCENT) {
    const element = textes.find((e) => e.champ === champ);
    const l = element ? luminance(element.couleur) : -1;
    if (l > 0.02 && l < 0.6) return element.couleur;
  }
  return ACCENT_PAR_DEFAUT;
}

/**
 * Logo de la carte : première image visible prévue pour le logo de
 * l'entreprise, sinon première image visible.
 * @param {object} modele - Modèle à afficher (logo d'entreprise déjà appliqué).
 * @returns {string} Data URL de l'image ('' si aucune).
 */
export function logoCarte(modele) {
  const images = elementsVisibles(modele).filter((e) => e.type === 'image' && e.image);
  return (images.find((e) => e.origine === 'logo') || images[0])?.image || '';
}

/**
 * Couleur de texte lisible sur un fond.
 * @param {string} fond - Couleur du fond (#rrggbb).
 * @returns {string} Blanc sur fond sombre, quasi noir sur fond clair.
 */
export function couleurTexteSur(fond) {
  return luminance(fond) < 0.35 ? '#ffffff' : '#14181f';
}
