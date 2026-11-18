/**
 * Elements.js
 * Éléments qu'on peut placer sur une face de carte : texte (lié à un champ
 * ou libre), QR code, image et forme. Chaque type a un schéma de réglages
 * qui sert à la validation et à la génération du panneau de propriétés.
 * Unités de position et de taille : 0,1 mm (carte = 850 × 550).
 */

import { normaliserObjet, nouvelId, idValide } from '../Utilitaires/Schema.js';
import { CHAMPS_AFFICHABLES } from './Personne.js';
import { OPTIONS_POLICES } from './Polices.js';

export const TYPES_ELEMENT = { texte: 'Texte', qr: 'QR code', image: 'Image', forme: 'Forme' };

// Réglages communs à tous les éléments.
const COMMUN = [
  { cle: 'x', type: 'mm', libelle: 'Position X (mm)', min: -425, max: 850, groupe: 'Position' },
  { cle: 'y', type: 'mm', libelle: 'Position Y (mm)', min: -275, max: 550, groupe: 'Position' },
  { cle: 'largeur', type: 'mm', libelle: 'Largeur (mm)', min: 10, max: 1700, groupe: 'Position' },
  { cle: 'hauteur', type: 'mm', libelle: 'Hauteur (mm)', min: 5, max: 1100, groupe: 'Position' },
  { cle: 'opacite', type: 'plage', libelle: 'Opacité (%)', min: 0, max: 100, groupe: 'Position' },
  { cle: 'visible', type: 'booleen', libelle: 'Visible', groupe: 'Position' },
];

// Réglages propres à chaque type d'élément.
const SPECIFIQUES = {
  texte: [
    { cle: 'source', type: 'choix', libelle: 'Contenu', groupe: 'Texte', options: [['champ', 'Information de la personne'], ['libre', 'Texte fixe']] },
    { cle: 'champ', type: 'choix', libelle: 'Information', groupe: 'Texte', options: CHAMPS_AFFICHABLES, visibleSi: (e) => e.source === 'champ' },
    { cle: 'texte', type: 'texte', libelle: 'Texte', groupe: 'Texte', max: 200, multiligne: true, visibleSi: (e) => e.source === 'libre' },
    { cle: 'prefixe', type: 'texte', libelle: 'Préfixe (ex. « Tél. »)', groupe: 'Texte', max: 30, espaces: true },
    { cle: 'police', type: 'choix', libelle: 'Police', groupe: 'Style', options: OPTIONS_POLICES },
    { cle: 'taille', type: 'plage', libelle: 'Taille', groupe: 'Style', min: 8, max: 140 },
    { cle: 'graisse', type: 'choix', libelle: 'Graisse', groupe: 'Style', options: [['300', 'Fine'], ['400', 'Normale'], ['600', 'Semi-grasse'], ['700', 'Grasse'], ['800', 'Très grasse']] },
    { cle: 'italique', type: 'booleen', libelle: 'Italique', groupe: 'Style' },
    { cle: 'majuscules', type: 'booleen', libelle: 'Majuscules', groupe: 'Style' },
    { cle: 'couleur', type: 'couleur', libelle: 'Couleur', groupe: 'Style' },
    { cle: 'alignement', type: 'choix', libelle: 'Alignement', groupe: 'Style', options: [['start', 'Gauche'], ['middle', 'Centre'], ['end', 'Droite']] },
    { cle: 'espacement', type: 'plage', libelle: 'Espacement des lettres', groupe: 'Style', min: -2, max: 30 },
    { cle: 'interligne', type: 'plage', libelle: 'Interligne (%)', groupe: 'Style', min: 90, max: 220 },
  ],
  qr: [
    { cle: 'couleur', type: 'couleur', libelle: 'Couleur des modules', groupe: 'QR code' },
    { cle: 'fond', type: 'couleur', libelle: 'Couleur du fond', groupe: 'QR code' },
    { cle: 'marge', type: 'plage', libelle: 'Marge (modules)', groupe: 'QR code', min: 0, max: 4 },
    { cle: 'arrondi', type: 'plage', libelle: 'Arrondi du fond', groupe: 'QR code', min: 0, max: 60 },
  ],
  image: [
    { cle: 'image', type: 'image', libelle: 'Image (PNG, JPEG, WebP)', groupe: 'Image' },
    { cle: 'ajustement', type: 'choix', libelle: 'Ajustement', groupe: 'Image', options: [['contain', 'Entière'], ['cover', 'Remplir (recadrée)']] },
  ],
  forme: [
    { cle: 'forme', type: 'choix', libelle: 'Forme', groupe: 'Forme', options: [['rectangle', 'Rectangle'], ['ellipse', 'Ellipse'], ['ligne', 'Ligne']] },
    { cle: 'remplissage', type: 'couleur', libelle: 'Couleur de remplissage', groupe: 'Forme', visibleSi: (e) => e.forme !== 'ligne' },
    { cle: 'sansRemplissage', type: 'booleen', libelle: 'Sans remplissage', groupe: 'Forme', visibleSi: (e) => e.forme !== 'ligne' },
    { cle: 'contour', type: 'couleur', libelle: 'Couleur du contour / de la ligne', groupe: 'Forme' },
    { cle: 'epaisseurContour', type: 'plage', libelle: 'Épaisseur du contour', groupe: 'Forme', min: 0, max: 40 },
    { cle: 'arrondi', type: 'plage', libelle: 'Arrondi des coins', groupe: 'Forme', min: 0, max: 200, visibleSi: (e) => e.forme === 'rectangle' },
  ],
};

// Valeurs par défaut de chaque type.
const DEFAUTS = {
  commun: { x: 60, y: 60, largeur: 300, hauteur: 60, opacite: 100, visible: true },
  texte: {
    largeur: 420, hauteur: 50, source: 'champ', champ: 'nomComplet', texte: 'Texte', prefixe: '', police: 'moderne',
    taille: 36, graisse: '400', italique: false, majuscules: false, couleur: '#1d2430', alignement: 'start', espacement: 0, interligne: 120,
  },
  qr: { largeur: 300, hauteur: 300, couleur: '#000000', fond: '#ffffff', marge: 2, arrondi: 14 },
  image: { largeur: 200, hauteur: 100, image: '', ajustement: 'contain' },
  forme: { largeur: 200, hauteur: 120, forme: 'rectangle', remplissage: '#2563eb', sansRemplissage: false, contour: '#1d2430', epaisseurContour: 0, arrondi: 0 },
};

/**
 * Renvoie la liste des réglages d'un type d'élément.
 * @param {string} type - Type d'élément.
 * @returns {object[]} Réglages (communs + spécifiques).
 */
export function schemaElement(type) {
  return [...SPECIFIQUES[type], ...COMMUN];
}

/**
 * Valide un élément brut.
 * @param {unknown} brut - Élément non fiable.
 * @returns {object|null} Élément propre, ou null si le type est inconnu.
 */
export function normaliserElement(brut) {
  if (!brut || typeof brut !== 'object' || !Object.hasOwn(SPECIFIQUES, brut.type)) return null;
  const defauts = { ...DEFAUTS.commun, ...DEFAUTS[brut.type] };
  return {
    id: idValide(brut.id) ? brut.id : nouvelId('e'),
    type: brut.type,
    ...normaliserObjet(schemaElement(brut.type), brut, defauts),
  };
}

/**
 * Crée un nouvel élément avec ses valeurs par défaut.
 * @param {string} type - Type d'élément.
 * @param {object} [valeurs] - Valeurs initiales à appliquer.
 * @returns {object} Élément valide avec un nouvel identifiant.
 */
export function creerElementCarte(type, valeurs = {}) {
  return normaliserElement({ ...DEFAUTS.commun, ...DEFAUTS[type], ...valeurs, type, id: nouvelId('e') });
}

/**
 * Résume un élément en une ligne (liste des calques).
 * @param {object} element - Élément.
 * @returns {string} Description courte.
 */
export function decrireElement(element) {
  if (element.type === 'texte') {
    const libelle = element.source === 'libre' ? `« ${element.texte.slice(0, 20)} »` : CHAMPS_AFFICHABLES.find(([c]) => c === element.champ)?.[1];
    return `Texte : ${libelle}`;
  }
  if (element.type === 'forme') return `Forme : ${element.forme}`;
  return TYPES_ELEMENT[element.type];
}
