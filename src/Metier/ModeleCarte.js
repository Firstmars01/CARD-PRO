/**
 * ModeleCarte.js
 * Modèle de carte (le design) : un nom, un arrondi d'aperçu et deux faces
 * (recto et verso). Chaque face a un fond et une liste d'éléments.
 */

import { normaliserObjet, nouvelId, idValide } from '../Utilitaires/Schema.js';
import { nettoyerTexte } from '../Utilitaires/Validation.js';
import { normaliserElement } from './Elements.js';

export const ELEMENTS_MAX = 40;
export const COTES = { recto: 'Recto', verso: 'Verso' };

// Réglages du fond d'une face.
export const SCHEMA_FOND = [
  { cle: 'type', type: 'choix', libelle: 'Type de fond', options: [['uni', 'Uni'], ['degrade', 'Dégradé'], ['image', 'Image']] },
  { cle: 'couleur1', type: 'couleur', libelle: 'Couleur principale' },
  { cle: 'couleur2', type: 'couleur', libelle: 'Seconde couleur', visibleSi: (f) => f.type === 'degrade' },
  { cle: 'angle', type: 'plage', libelle: 'Angle du dégradé', min: 0, max: 360, visibleSi: (f) => f.type === 'degrade' },
  { cle: 'image', type: 'image', libelle: 'Image de fond', visibleSi: (f) => f.type === 'image' },
];
const FOND_DEFAUT = { type: 'uni', couleur1: '#ffffff', couleur2: '#e8eef5', angle: 135, image: '' };

// Réglages globaux du modèle.
export const SCHEMA_MODELE = [
  { cle: 'arrondi', type: 'plage', libelle: "Arrondi des coins (aperçu et images)", min: 0, max: 40 },
];

/**
 * Crée une face vide.
 * @param {object} [fond] - Fond initial.
 * @returns {{fond:object, elements:object[]}} Face.
 */
export function faceVide(fond = {}) {
  return { fond: { ...FOND_DEFAUT, ...fond }, elements: [] };
}

/**
 * Valide une face.
 * @param {unknown} brut - Face non fiable.
 * @returns {{fond:object, elements:object[]}} Face propre.
 */
export function normaliserFace(brut) {
  const source = brut && typeof brut === 'object' ? brut : {};
  const elements = (Array.isArray(source.elements) ? source.elements : [])
    .slice(0, ELEMENTS_MAX)
    .map(normaliserElement)
    .filter(Boolean);
  // Identifiants uniques garantis (un doublon reçoit un nouvel id).
  const vus = new Set();
  elements.forEach((e) => {
    if (vus.has(e.id)) e.id = nouvelId('e');
    vus.add(e.id);
  });
  return { fond: normaliserObjet(SCHEMA_FOND, source.fond, FOND_DEFAUT), elements };
}

/**
 * Valide un modèle complet.
 * @param {unknown} brut - Modèle non fiable.
 * @returns {object} Modèle propre { id, nom, arrondi, recto, verso }.
 */
export function normaliserModele(brut) {
  const source = brut && typeof brut === 'object' ? brut : {};
  return {
    id: idValide(source.id) ? source.id : nouvelId('m'),
    nom: nettoyerTexte(source.nom, 50) || 'Modèle sans nom',
    ...normaliserObjet(SCHEMA_MODELE, source, { arrondi: 16 }),
    recto: normaliserFace(source.recto),
    verso: normaliserFace(source.verso),
  };
}

/**
 * Indique si un modèle est un modèle de base (fourni, non modifiable).
 * @param {object} modele - Modèle.
 * @returns {boolean} true pour un modèle de base.
 */
export function estModeleDeBase(modele) {
  return modele.id.startsWith('base-');
}
