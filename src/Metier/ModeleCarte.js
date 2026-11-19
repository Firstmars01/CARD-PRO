/**
 * ModeleCarte.js
 * Modèle de carte (le design) : un nom, un format (taille + orientation),
 * une palette de couleurs, un arrondi d'aperçu et deux faces (recto et
 * verso). Chaque face a un fond (couleur, dégradé, image, motif, voile)
 * et une liste d'éléments.
 */

import { normaliserObjet, nouvelId, idValide } from '../Utilitaires/Schema.js';
import { nettoyerTexte } from '../Utilitaires/Validation.js';
import { normaliserElement } from './Elements.js';
import { OPTIONS_FORMATS } from './Formats.js';
import { TAILLE_PALETTE } from './Palette.js';

export const ELEMENTS_MAX = 40;
export const COTES = { recto: 'Recto', verso: 'Verso' };

// Réglages du fond d'une face.
export const SCHEMA_FOND = [
  { cle: 'type', type: 'choix', libelle: 'Type de fond', groupe: 'Fond', options: [['uni', 'Uni'], ['degrade', 'Dégradé linéaire'], ['radial', 'Dégradé circulaire'], ['image', 'Image']] },
  { cle: 'couleur1', type: 'couleur', libelle: 'Couleur principale', groupe: 'Fond' },
  { cle: 'couleur2', type: 'couleur', libelle: 'Seconde couleur', groupe: 'Fond', visibleSi: (f) => f.type === 'degrade' || f.type === 'radial' },
  { cle: 'angle', type: 'plage', libelle: 'Angle du dégradé', groupe: 'Fond', min: 0, max: 360, visibleSi: (f) => f.type === 'degrade' },
  { cle: 'image', type: 'image', libelle: 'Image de fond', groupe: 'Fond', visibleSi: (f) => f.type === 'image' },
  { cle: 'motif', type: 'choix', libelle: 'Motif', groupe: 'Motif', options: [['aucun', 'Aucun'], ['points', 'Points'], ['lignes', 'Lignes'], ['diagonales', 'Diagonales'], ['grille', 'Grille'], ['cercles', 'Cercles'], ['vagues', 'Vagues']] },
  { cle: 'motifCouleur', type: 'couleur', libelle: 'Couleur du motif', groupe: 'Motif', visibleSi: (f) => f.motif !== 'aucun' },
  { cle: 'motifOpacite', type: 'plage', libelle: 'Opacité du motif (%)', groupe: 'Motif', min: 0, max: 100, visibleSi: (f) => f.motif !== 'aucun' },
  { cle: 'motifTaille', type: 'plage', libelle: 'Espacement du motif', groupe: 'Motif', min: 10, max: 120, visibleSi: (f) => f.motif !== 'aucun' },
  { cle: 'voileOpacite', type: 'plage', libelle: 'Voile de couleur (%) — rend le texte lisible sur une image', groupe: 'Voile', min: 0, max: 90 },
  { cle: 'voileCouleur', type: 'couleur', libelle: 'Couleur du voile', groupe: 'Voile', visibleSi: (f) => f.voileOpacite > 0 },
];
const FOND_DEFAUT = {
  type: 'uni', couleur1: '#ffffff', couleur2: '#e8eef5', angle: 135, image: '',
  motif: 'aucun', motifCouleur: '#2563eb', motifOpacite: 20, motifTaille: 30, voileOpacite: 0, voileCouleur: '#000000',
};

// Réglages globaux du modèle : format, palette, arrondi d'aperçu.
export const SCHEMA_MODELE = [
  { cle: 'format', type: 'choix', libelle: 'Format de la carte', groupe: 'Format', options: OPTIONS_FORMATS },
  { cle: 'orientation', type: 'choix', libelle: 'Orientation', groupe: 'Format', options: [['paysage', 'Paysage (horizontale)'], ['portrait', 'Portrait (verticale)']] },
  { cle: 'arrondi', type: 'plage', libelle: 'Arrondi des coins (aperçu et images)', groupe: 'Format', min: 0, max: 40 },
  ...Array.from({ length: TAILLE_PALETTE }, (_, i) => ({ cle: `palette${i + 1}`, type: 'couleur', libelle: `Couleur ${i + 1}`, groupe: 'Palette' })),
];
const MODELE_DEFAUT = {
  format: 'standard', orientation: 'paysage', arrondi: 16,
  palette1: '#1d2430', palette2: '#2563eb', palette3: '#5b6575', palette4: '#ffffff', palette5: '#f5b942',
};

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
 * @returns {object} Modèle propre { id, nom, format, orientation, arrondi, palette1…5, recto, verso }.
 */
export function normaliserModele(brut) {
  const source = brut && typeof brut === 'object' ? brut : {};
  return {
    id: idValide(source.id) ? source.id : nouvelId('m'),
    nom: nettoyerTexte(source.nom, 50) || 'Modèle sans nom',
    ...normaliserObjet(SCHEMA_MODELE, source, MODELE_DEFAUT),
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
