/**
 * ModelesDeBase.js
 * Modèles fournis avec l'application (recto + verso). Ils ne sont pas
 * modifiables : on les duplique dans l'éditeur pour créer ses propres modèles.
 */

import { normaliserModele } from './ModeleCarte.js';

/**
 * Élément texte lié à une information de la personne.
 * @param {string} champ - Champ affiché.
 * @param {number[]} boite - [x, y, largeur, hauteur].
 * @param {object} [style] - Réglages de style.
 * @returns {object} Élément brut.
 */
function champ(champ, [x, y, largeur, hauteur], style = {}) {
  return { type: 'texte', source: 'champ', champ, x, y, largeur, hauteur, ...style };
}

/**
 * Élément texte fixe.
 * @param {string} texte - Texte affiché.
 * @param {number[]} boite - [x, y, largeur, hauteur].
 * @param {object} [style] - Réglages de style.
 * @returns {object} Élément brut.
 */
function libre(texte, [x, y, largeur, hauteur], style = {}) {
  return { type: 'texte', source: 'libre', texte, x, y, largeur, hauteur, ...style };
}

/**
 * Élément QR code carré.
 * @param {number} x - Position X.
 * @param {number} y - Position Y.
 * @param {number} taille - Côté.
 * @param {object} [style] - Couleurs, marge, arrondi.
 * @returns {object} Élément brut.
 */
function qr(x, y, taille, style = {}) {
  return { type: 'qr', x, y, largeur: taille, hauteur: taille, ...style };
}

/**
 * Élément forme.
 * @param {string} forme - rectangle, ellipse ou ligne.
 * @param {number[]} boite - [x, y, largeur, hauteur].
 * @param {object} [style] - Couleurs, opacité, arrondi.
 * @returns {object} Élément brut.
 */
function forme(forme, [x, y, largeur, hauteur], style = {}) {
  return { type: 'forme', forme, x, y, largeur, hauteur, ...style };
}

/**
 * Bloc de coordonnées (mobile, fixe, e-mail, site) empilé verticalement.
 * @param {number} x - Position X.
 * @param {number} y - Position Y de la première ligne.
 * @param {number} largeur - Largeur des lignes.
 * @param {object} style - Style commun des lignes.
 * @returns {object[]} Éléments bruts.
 */
function coordonnees(x, y, largeur, style) {
  return [
    champ('telephoneMobile', [x, y, largeur, 30], { prefixe: 'M. ', ...style }),
    champ('telephonePro', [x, y + 32, largeur, 30], { prefixe: 'T. ', ...style }),
    champ('email', [x, y + 64, largeur, 30], style),
    champ('siteWeb', [x, y + 96, largeur, 30], style),
  ];
}

/**
 * Verso centré : nom de l'entreprise et site web.
 * @param {object} fond - Fond de la face.
 * @param {string} couleur - Couleur du nom.
 * @param {string} secondaire - Couleur du site.
 * @param {object} [style] - Style du nom (police, graisse…).
 * @returns {object} Face brute.
 */
function versoEntreprise(fond, couleur, secondaire, style = {}) {
  return {
    fond,
    elements: [
      champ('entreprise', [50, 215, 750, 70], { taille: 50, graisse: '700', couleur, alignement: 'middle', ...style }),
      forme('rectangle', [395, 300, 60, 4], { remplissage: couleur }),
      champ('siteWeb', [50, 330, 750, 36], { taille: 22, couleur: secondaire, alignement: 'middle', police: style.police }),
    ],
  };
}

const BRUTS = [
  {
    id: 'base-classique', nom: 'Classique', arrondi: 16,
    recto: {
      fond: { type: 'uni', couleur1: '#ffffff' },
      elements: [
        champ('nomComplet', [60, 64, 470, 60], { taille: 44, graisse: '700', couleur: '#1d2430' }),
        champ('poste', [60, 132, 470, 34], { taille: 24, graisse: '600', couleur: '#2563eb' }),
        champ('entreprise', [60, 170, 470, 32], { taille: 22, couleur: '#5b6575' }),
        forme('rectangle', [60, 220, 56, 4], { remplissage: '#2563eb' }),
        ...coordonnees(60, 360, 470, { taille: 19, couleur: '#5b6575' }),
        qr(570, 145, 260),
      ],
    },
    verso: versoEntreprise({ type: 'uni', couleur1: '#1d2430' }, '#ffffff', '#9aa5b1'),
  },
  {
    id: 'base-ardoise', nom: 'Ardoise', arrondi: 18,
    recto: {
      fond: { type: 'uni', couleur1: '#1f2933' },
      elements: [
        champ('nomComplet', [60, 64, 470, 60], { taille: 44, graisse: '700', couleur: '#f5f7fa' }),
        champ('poste', [60, 132, 470, 34], { taille: 24, graisse: '600', couleur: '#f5b942' }),
        champ('entreprise', [60, 170, 470, 32], { taille: 22, couleur: '#9aa5b1' }),
        forme('rectangle', [60, 220, 56, 4], { remplissage: '#f5b942' }),
        ...coordonnees(60, 360, 470, { taille: 19, couleur: '#c5ccd6' }),
        qr(570, 145, 260),
      ],
    },
    verso: versoEntreprise({ type: 'uni', couleur1: '#f5b942' }, '#1f2933', '#3d4752', { majuscules: true, espacement: 6 }),
  },
  {
    id: 'base-ocean', nom: 'Océan', arrondi: 24,
    recto: {
      fond: { type: 'degrade', couleur1: '#0f4c81', couleur2: '#1aa3a3', angle: 135 },
      elements: [
        forme('ellipse', [560, -180, 460, 460], { remplissage: '#ffffff', opacite: 10 }),
        forme('ellipse', [-120, 400, 300, 300], { remplissage: '#ffd166', opacite: 15 }),
        champ('nomComplet', [60, 64, 470, 60], { taille: 44, graisse: '700', couleur: '#ffffff', police: 'arrondie' }),
        champ('poste', [60, 132, 470, 34], { taille: 24, graisse: '600', couleur: '#ffd166', police: 'arrondie' }),
        champ('entreprise', [60, 170, 470, 32], { taille: 22, couleur: '#d6eef5', police: 'arrondie' }),
        ...coordonnees(60, 360, 470, { taille: 19, couleur: '#e6f4f8', police: 'arrondie' }),
        qr(570, 145, 260, { arrondi: 24 }),
      ],
    },
    verso: versoEntreprise({ type: 'degrade', couleur1: '#1aa3a3', couleur2: '#0f4c81', angle: 135 }, '#ffffff', '#ffd166', { police: 'arrondie' }),
  },
  {
    id: 'base-bandeau', nom: 'Bandeau corail', arrondi: 20,
    recto: {
      fond: { type: 'uni', couleur1: '#ffffff' },
      elements: [
        forme('rectangle', [550, 0, 300, 550], { remplissage: '#ff6b5b' }),
        qr(585, 140, 230, { arrondi: 18 }),
        champ('nomComplet', [55, 64, 460, 60], { taille: 42, graisse: '700', couleur: '#222222', police: 'arrondie' }),
        champ('poste', [55, 130, 460, 34], { taille: 23, graisse: '600', couleur: '#ff6b5b', police: 'arrondie' }),
        champ('entreprise', [55, 168, 460, 32], { taille: 21, couleur: '#666666', police: 'arrondie' }),
        ...coordonnees(55, 360, 460, { taille: 19, couleur: '#555555', police: 'arrondie' }),
      ],
    },
    verso: versoEntreprise({ type: 'uni', couleur1: '#ff6b5b' }, '#ffffff', '#ffe1dc', { police: 'arrondie' }),
  },
  {
    id: 'base-minimal', nom: 'Minimal (QR au verso)', arrondi: 0,
    recto: {
      fond: { type: 'uni', couleur1: '#ffffff' },
      elements: [
        champ('nomComplet', [50, 185, 750, 70], { taille: 52, graisse: '700', couleur: '#111111', alignement: 'middle', police: 'condensee', majuscules: true, espacement: 4 }),
        forme('ligne', [385, 268, 80, 6], { contour: '#111111', epaisseurContour: 3 }),
        champ('poste', [50, 290, 750, 36], { taille: 22, couleur: '#555555', alignement: 'middle', police: 'condensee', majuscules: true, espacement: 3 }),
        champ('entreprise', [50, 470, 750, 30], { taille: 18, couleur: '#888888', alignement: 'middle', police: 'condensee' }),
      ],
    },
    verso: {
      fond: { type: 'uni', couleur1: '#111111' },
      elements: [
        qr(285, 70, 280, { arrondi: 10 }),
        libre('Scannez pour enregistrer le contact', [50, 385, 750, 34], { taille: 20, couleur: '#ffffff', alignement: 'middle', police: 'condensee', espacement: 2 }),
        champ('email', [50, 440, 750, 30], { taille: 18, couleur: '#aaaaaa', alignement: 'middle', police: 'condensee' }),
      ],
    },
  },
  {
    id: 'base-neon', nom: 'Néon', arrondi: 14,
    recto: {
      fond: { type: 'degrade', couleur1: '#0b0b12', couleur2: '#24123a', angle: 160 },
      elements: [
        champ('nomComplet', [60, 70, 470, 60], { taille: 42, graisse: '700', couleur: '#ffffff', police: 'mono' }),
        champ('poste', [60, 136, 470, 34], { taille: 22, couleur: '#39ff88', police: 'mono' }),
        forme('rectangle', [60, 190, 470, 2], { remplissage: '#39ff88', opacite: 60 }),
        ...coordonnees(60, 360, 470, { taille: 18, couleur: '#b9a8d9', police: 'mono' }),
        qr(570, 145, 260, { couleur: '#0b0b12', fond: '#39ff88', arrondi: 16 }),
      ],
    },
    verso: versoEntreprise({ type: 'degrade', couleur1: '#24123a', couleur2: '#0b0b12', angle: 160 }, '#39ff88', '#b9a8d9', { police: 'mono' }),
  },
];

// Modèles complets et validés.
export const MODELES_DE_BASE = Object.freeze(BRUTS.map((m) => Object.freeze(normaliserModele(m))));
