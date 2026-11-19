/**
 * Elements.js
 * Éléments qu'on peut placer sur une face de carte : texte (lié à un champ
 * ou libre), QR code, image, forme et icône. Chaque type a un schéma de
 * réglages qui sert à la validation et à la génération du panneau de
 * propriétés. Unités de position et de taille : 0,1 mm.
 */

import { normaliserObjet, nouvelId, idValide } from '../Utilitaires/Schema.js';
import { CHAMPS_AFFICHABLES } from './Personne.js';
import { OPTIONS_POLICES } from './Polices.js';
import { OPTIONS_ICONES } from './IconesCarte.js';

export const TYPES_ELEMENT = { texte: 'Texte', qr: 'QR code', image: 'Image', forme: 'Forme', icone: 'Icône' };

// Réglages communs à tous les éléments (position, rotation, verrouillage).
const COMMUN = [
  { cle: 'x', type: 'mm', libelle: 'Position X (mm)', min: -1000, max: 2000, groupe: 'Position' },
  { cle: 'y', type: 'mm', libelle: 'Position Y (mm)', min: -1000, max: 2000, groupe: 'Position' },
  { cle: 'largeur', type: 'mm', libelle: 'Largeur (mm)', min: 10, max: 3000, groupe: 'Position' },
  { cle: 'hauteur', type: 'mm', libelle: 'Hauteur (mm)', min: 5, max: 3000, groupe: 'Position' },
  { cle: 'rotation', type: 'plage', libelle: 'Rotation (°)', min: -180, max: 180, groupe: 'Position' },
  { cle: 'opacite', type: 'plage', libelle: 'Opacité (%)', min: 0, max: 100, groupe: 'Position' },
  { cle: 'visible', type: 'booleen', libelle: 'Visible', groupe: 'Position' },
  { cle: 'verrouille', type: 'booleen', libelle: 'Verrouillé (ne bouge plus)', groupe: 'Position' },
];

// Ombre portée (texte, forme, QR, image, icône).
const OMBRE = [
  { cle: 'ombre', type: 'booleen', libelle: 'Ombre portée', groupe: 'Ombre' },
  { cle: 'ombreCouleur', type: 'couleur', libelle: "Couleur de l'ombre", groupe: 'Ombre', visibleSi: (e) => e.ombre },
  { cle: 'ombreOpacite', type: 'plage', libelle: 'Opacité (%)', groupe: 'Ombre', min: 0, max: 100, visibleSi: (e) => e.ombre },
  { cle: 'ombreFlou', type: 'plage', libelle: 'Flou', groupe: 'Ombre', min: 0, max: 40, visibleSi: (e) => e.ombre },
  { cle: 'ombreX', type: 'plage', libelle: 'Décalage X', groupe: 'Ombre', min: -40, max: 40, visibleSi: (e) => e.ombre },
  { cle: 'ombreY', type: 'plage', libelle: 'Décalage Y', groupe: 'Ombre', min: -40, max: 40, visibleSi: (e) => e.ombre },
];

const estDegrade = (cle) => (e) => e[cle] !== 'uni';
const RECTANGLE = (e) => e.forme === 'rectangle';
const AVEC_COTES = ['etoile', 'polygone', 'vague'];

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
    { cle: 'alignement', type: 'choix', libelle: 'Alignement', groupe: 'Style', options: [['start', 'Gauche'], ['middle', 'Centre'], ['end', 'Droite']] },
    { cle: 'italique', type: 'booleen', libelle: 'Italique', groupe: 'Style' },
    { cle: 'majuscules', type: 'booleen', libelle: 'Majuscules', groupe: 'Style' },
    { cle: 'souligne', type: 'booleen', libelle: 'Souligné', groupe: 'Style' },
    { cle: 'barre', type: 'booleen', libelle: 'Barré', groupe: 'Style' },
    { cle: 'vertical', type: 'booleen', libelle: 'Lettres empilées (vertical)', groupe: 'Style' },
    { cle: 'espacement', type: 'plage', libelle: 'Espacement des lettres', groupe: 'Style', min: -2, max: 30 },
    { cle: 'interligne', type: 'plage', libelle: 'Interligne (%)', groupe: 'Style', min: 90, max: 220 },
    { cle: 'typeCouleur', type: 'choix', libelle: 'Couleur du texte', groupe: 'Couleur', options: [['uni', 'Unie'], ['degrade', 'Dégradé']] },
    { cle: 'couleur', type: 'couleur', libelle: 'Couleur', groupe: 'Couleur' },
    { cle: 'couleur2', type: 'couleur', libelle: 'Seconde couleur', groupe: 'Couleur', visibleSi: estDegrade('typeCouleur') },
    { cle: 'angleDegrade', type: 'plage', libelle: 'Angle du dégradé', groupe: 'Couleur', min: 0, max: 360, visibleSi: estDegrade('typeCouleur') },
    { cle: 'epaisseurContourTexte', type: 'plage', libelle: 'Contour des lettres', groupe: 'Couleur', min: 0, max: 20 },
    { cle: 'contourTexte', type: 'couleur', libelle: 'Couleur du contour', groupe: 'Couleur', visibleSi: (e) => e.epaisseurContourTexte > 0 },
    { cle: 'fondTexte', type: 'booleen', libelle: 'Fond derrière le texte (étiquette)', groupe: 'Couleur' },
    { cle: 'fondCouleur', type: 'couleur', libelle: 'Couleur du fond', groupe: 'Couleur', visibleSi: (e) => e.fondTexte },
    { cle: 'fondArrondi', type: 'plage', libelle: 'Arrondi du fond', groupe: 'Couleur', min: 0, max: 100, visibleSi: (e) => e.fondTexte },
    ...OMBRE,
  ],
  qr: [
    { cle: 'contenu', type: 'choix', libelle: 'Contenu du QR code', groupe: 'QR code', options: [['vcard', 'Contact (vCard)'], ['lien', 'Un lien de la personne'], ['siteWeb', 'Site web']] },
    { cle: 'numeroLien', type: 'plage', libelle: 'Numéro du lien (ordre dans la fiche)', groupe: 'QR code', min: 1, max: 8, visibleSi: (e) => e.contenu === 'lien' },
    { cle: 'styleModules', type: 'choix', libelle: 'Forme des points', groupe: 'Style du QR', options: [['carre', 'Carrés'], ['arrondi', 'Carrés arrondis'], ['rond', 'Ronds']] },
    { cle: 'styleYeux', type: 'choix', libelle: 'Forme des coins (yeux)', groupe: 'Style du QR', options: [['carre', 'Carrés'], ['arrondi', 'Arrondis'], ['rond', 'Ronds']] },
    { cle: 'couleur', type: 'couleur', libelle: 'Couleur des points', groupe: 'Style du QR' },
    { cle: 'couleurYeux', type: 'couleur', libelle: 'Couleur des coins', groupe: 'Style du QR' },
    { cle: 'fond', type: 'couleur', libelle: 'Couleur du fond', groupe: 'Style du QR' },
    { cle: 'marge', type: 'plage', libelle: 'Marge (modules)', groupe: 'Style du QR', min: 0, max: 4 },
    { cle: 'arrondi', type: 'plage', libelle: 'Arrondi du fond', groupe: 'Style du QR', min: 0, max: 60 },
    { cle: 'logo', type: 'image', libelle: 'Logo au centre (facultatif)', groupe: 'Logo au centre' },
    { cle: 'tailleLogo', type: 'plage', libelle: 'Taille du logo (%)', groupe: 'Logo au centre', min: 10, max: 30, visibleSi: (e) => Boolean(e.logo) },
    ...OMBRE,
  ],
  image: [
    { cle: 'image', type: 'image', libelle: 'Image (PNG, JPEG, WebP)', groupe: 'Image' },
    { cle: 'ajustement', type: 'choix', libelle: 'Ajustement', groupe: 'Image', options: [['contain', 'Entière'], ['cover', 'Remplir (recadrée)']] },
    { cle: 'cadrage', type: 'choix', libelle: 'Forme', groupe: 'Image', options: [['rectangle', 'Rectangle'], ['arrondi', 'Coins arrondis'], ['cercle', 'Rond (photo de profil)']] },
    { cle: 'arrondiImage', type: 'plage', libelle: 'Arrondi des coins', groupe: 'Image', min: 0, max: 200, visibleSi: (e) => e.cadrage === 'arrondi' },
    { cle: 'bordure', type: 'plage', libelle: 'Épaisseur de la bordure', groupe: 'Image', min: 0, max: 30 },
    { cle: 'bordureCouleur', type: 'couleur', libelle: 'Couleur de la bordure', groupe: 'Image', visibleSi: (e) => e.bordure > 0 },
    { cle: 'noirEtBlanc', type: 'booleen', libelle: 'Noir et blanc', groupe: 'Image' },
    ...OMBRE,
  ],
  forme: [
    { cle: 'forme', type: 'choix', libelle: 'Forme', groupe: 'Forme', options: [['rectangle', 'Rectangle'], ['ellipse', 'Ellipse'], ['ligne', 'Ligne'], ['triangle', 'Triangle'], ['losange', 'Losange'], ['etoile', 'Étoile'], ['polygone', 'Polygone'], ['vague', 'Vague'], ['fleche', 'Flèche']] },
    { cle: 'cotes', type: 'plage', libelle: 'Côtés / branches / vagues', groupe: 'Forme', min: 1, max: 12, visibleSi: (e) => AVEC_COTES.includes(e.forme) },
    { cle: 'arrondi', type: 'plage', libelle: 'Arrondi des coins', groupe: 'Forme', min: 0, max: 200, visibleSi: (e) => RECTANGLE(e) && !e.arrondiParCoin },
    { cle: 'arrondiParCoin', type: 'booleen', libelle: 'Arrondi différent par coin', groupe: 'Forme', visibleSi: RECTANGLE },
    { cle: 'arrondiHG', type: 'plage', libelle: 'Coin haut gauche', groupe: 'Forme', min: 0, max: 200, visibleSi: (e) => RECTANGLE(e) && e.arrondiParCoin },
    { cle: 'arrondiHD', type: 'plage', libelle: 'Coin haut droit', groupe: 'Forme', min: 0, max: 200, visibleSi: (e) => RECTANGLE(e) && e.arrondiParCoin },
    { cle: 'arrondiBD', type: 'plage', libelle: 'Coin bas droit', groupe: 'Forme', min: 0, max: 200, visibleSi: (e) => RECTANGLE(e) && e.arrondiParCoin },
    { cle: 'arrondiBG', type: 'plage', libelle: 'Coin bas gauche', groupe: 'Forme', min: 0, max: 200, visibleSi: (e) => RECTANGLE(e) && e.arrondiParCoin },
    { cle: 'typeRemplissage', type: 'choix', libelle: 'Remplissage', groupe: 'Couleur', options: [['uni', 'Couleur unie'], ['degrade', 'Dégradé linéaire'], ['radial', 'Dégradé circulaire'], ['aucun', 'Aucun (contour seul)']], visibleSi: (e) => e.forme !== 'ligne' },
    { cle: 'remplissage', type: 'couleur', libelle: 'Couleur', groupe: 'Couleur', visibleSi: (e) => e.forme !== 'ligne' && e.typeRemplissage !== 'aucun' },
    { cle: 'remplissage2', type: 'couleur', libelle: 'Seconde couleur', groupe: 'Couleur', visibleSi: (e) => e.forme !== 'ligne' && ['degrade', 'radial'].includes(e.typeRemplissage) },
    { cle: 'angleDegrade', type: 'plage', libelle: 'Angle du dégradé', groupe: 'Couleur', min: 0, max: 360, visibleSi: (e) => e.forme !== 'ligne' && e.typeRemplissage === 'degrade' },
    { cle: 'contour', type: 'couleur', libelle: 'Couleur du contour / de la ligne', groupe: 'Couleur' },
    { cle: 'epaisseurContour', type: 'plage', libelle: 'Épaisseur du contour', groupe: 'Couleur', min: 0, max: 40 },
    ...OMBRE,
  ],
  icone: [
    { cle: 'icone', type: 'choix', libelle: 'Icône', groupe: 'Icône', options: OPTIONS_ICONES },
    { cle: 'couleur', type: 'couleur', libelle: 'Couleur', groupe: 'Icône' },
    { cle: 'epaisseurTrait', type: 'plage', libelle: 'Épaisseur du trait', groupe: 'Icône', min: 1, max: 4 },
    { cle: 'pleine', type: 'booleen', libelle: 'Icône pleine', groupe: 'Icône' },
    ...OMBRE,
  ],
};

// Valeurs par défaut de chaque type.
const DEFAUTS_OMBRE = { ombre: false, ombreCouleur: '#000000', ombreOpacite: 35, ombreFlou: 8, ombreX: 4, ombreY: 6 };
const DEFAUTS = {
  commun: { x: 60, y: 60, largeur: 300, hauteur: 60, rotation: 0, opacite: 100, visible: true, verrouille: false, ...DEFAUTS_OMBRE },
  texte: {
    largeur: 420, hauteur: 50, source: 'champ', champ: 'nomComplet', texte: 'Texte', prefixe: '', police: 'moderne',
    taille: 36, graisse: '400', alignement: 'start', italique: false, majuscules: false, souligne: false, barre: false, vertical: false,
    espacement: 0, interligne: 120, typeCouleur: 'uni', couleur: '#1d2430', couleur2: '#2563eb', angleDegrade: 0,
    epaisseurContourTexte: 0, contourTexte: '#ffffff', fondTexte: false, fondCouleur: '#eef2ff', fondArrondi: 12,
  },
  qr: {
    largeur: 300, hauteur: 300, contenu: 'vcard', numeroLien: 1, styleModules: 'carre', styleYeux: 'carre', couleur: '#000000',
    couleurYeux: '#000000', fond: '#ffffff', marge: 2, arrondi: 14, logo: '', tailleLogo: 22,
  },
  image: { largeur: 200, hauteur: 100, image: '', ajustement: 'contain', cadrage: 'rectangle', arrondiImage: 20, bordure: 0, bordureCouleur: '#ffffff', noirEtBlanc: false },
  forme: {
    largeur: 200, hauteur: 120, forme: 'rectangle', cotes: 5, arrondi: 0, arrondiParCoin: false, arrondiHG: 0, arrondiHD: 0, arrondiBD: 0, arrondiBG: 0,
    typeRemplissage: 'uni', remplissage: '#2563eb', remplissage2: '#1aa3a3', angleDegrade: 90, contour: '#1d2430', epaisseurContour: 0,
  },
  icone: { largeur: 50, hauteur: 50, icone: 'telephone', couleur: '#2563eb', epaisseurTrait: 2, pleine: false },
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
  // Anciens modèles : l'option « sans remplissage » devient le remplissage « aucun ».
  const source = brut.type === 'forme' && brut.sansRemplissage === true && !brut.typeRemplissage ? { ...brut, typeRemplissage: 'aucun' } : brut;
  return {
    id: idValide(brut.id) ? brut.id : nouvelId('e'),
    type: brut.type,
    groupe: idValide(brut.groupe) ? brut.groupe : '',
    ...normaliserObjet(schemaElement(brut.type), source, defauts),
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
  if (element.type === 'icone') return `Icône : ${OPTIONS_ICONES.find(([c]) => c === element.icone)?.[1]}`;
  if (element.type === 'qr' && element.contenu === 'lien') return `QR code : lien ${element.numeroLien}`;
  if (element.type === 'qr' && element.contenu === 'siteWeb') return 'QR code : site web';
  return TYPES_ELEMENT[element.type];
}

// Réglages de contenu ou de position : jamais copiés avec le style.
const CLES_HORS_STYLE = [
  'x', 'y', 'largeur', 'hauteur', 'rotation', 'visible', 'verrouille', 'source', 'champ', 'texte', 'prefixe', 'image', 'forme',
  'cotes', 'contenu', 'numeroLien', 'logo', 'icone',
];

/**
 * Liste les réglages de style d'un type d'élément (couleurs, police…).
 * @param {string} type - Type d'élément.
 * @returns {string[]} Clés de style.
 */
export function clesStyle(type) {
  return schemaElement(type).map((r) => r.cle).filter((cle) => !CLES_HORS_STYLE.includes(cle));
}

/**
 * Extrait le style d'un élément (pour « Copier le style »).
 * @param {object} element - Élément source.
 * @returns {object} Valeurs de style.
 */
export function extraireStyle(element) {
  return Object.fromEntries(clesStyle(element.type).map((cle) => [cle, element[cle]]));
}

/**
 * Applique un style copié : seuls les réglages existant sur l'élément
 * cible sont repris (ex. : une forme ne reçoit pas la police d'un texte).
 * @param {object} element - Élément cible.
 * @param {object} style - Style copié.
 * @returns {object} Élément modifié et validé.
 */
export function appliquerStyle(element, style) {
  const changements = Object.fromEntries(clesStyle(element.type).filter((cle) => Object.hasOwn(style, cle)).map((cle) => [cle, style[cle]]));
  return normaliserElement({ ...element, ...changements, id: element.id, type: element.type, groupe: element.groupe });
}
