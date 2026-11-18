/**
 * RenduFaceSvg.js
 * Dessine une face de carte (recto ou verso) en SVG à partir d'un modèle,
 * d'une personne et de son QR code. Format 85 × 55 mm (1 unité = 0,1 mm).
 * Le texte est inséré via le DOM (textContent) : aucune injection possible.
 */

import { creerSvg } from '../../Utilitaires/Dom.js';
import { decouperTexte } from '../../Utilitaires/MesureTexte.js';
import { POLICES } from '../../Metier/Polices.js';
import { valeurChamp, nomComplet, CHAMPS_AFFICHABLES } from '../../Metier/Personne.js';
import { qrPourElement } from '../../Metier/ContenuQr.js';
import { dessinerQr } from './RenduQrSvg.js';

export const LARGEUR = 850;
export const HAUTEUR = 550;
let compteurId = 0;

/**
 * Crée le SVG d'une face.
 * @param {object} modele - Modèle normalisé.
 * @param {"recto"|"verso"} cote - Face à dessiner.
 * @param {object} personne - Personne normalisée.
 * @param {object|null} qr - QR code de la personne.
 * @param {{edition?:boolean}} [options] - edition : affiche les éléments masqués et les textes vides.
 * @returns {SVGSVGElement} Face en SVG.
 */
export function rendreFaceSvg(modele, cote, personne, qr, options = {}) {
  compteurId += 1;
  const id = `f${compteurId}`;
  const face = modele[cote];
  const svg = creerSvg('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `0 0 ${LARGEUR} ${HAUTEUR}`,
    role: 'img',
    'aria-label': `${cote === 'recto' ? 'Recto' : 'Verso'} de la carte de ${nomComplet(personne) || 'visite'}`,
  });
  const defs = creerSvg('defs', {}, svg);
  creerSvg('rect', { width: LARGEUR, height: HAUTEUR, rx: modele.arrondi }, creerSvg('clipPath', { id: `${id}-clip` }, defs));
  const contenu = creerSvg('g', { 'clip-path': `url(#${id}-clip)` }, svg);

  dessinerFond(contenu, defs, face.fond, id);
  face.elements.forEach((element) => {
    if (!element.visible && !options.edition) return;
    const groupe = creerSvg('g', {
      'data-id': element.id,
      opacity: (element.visible ? element.opacite : element.opacite * 0.3) / 100,
    }, contenu);
    DESSINATEURS[element.type](groupe, element, { personne, qr, edition: options.edition });
    // En édition : zone cliquable couvrant tout l'élément.
    if (options.edition) {
      creerSvg('rect', { x: element.x, y: element.y, width: element.largeur, height: element.hauteur, fill: 'transparent', class: 'ZoneClic' }, groupe);
    }
  });
  return svg;
}

/**
 * Dessine le fond d'une face (uni, dégradé ou image).
 * @param {SVGElement} groupe - Groupe parent.
 * @param {SVGElement} defs - Définitions SVG.
 * @param {object} fond - Réglages du fond.
 * @param {string} id - Préfixe d'identifiants unique.
 */
function dessinerFond(groupe, defs, fond, id) {
  let remplissage = fond.couleur1;
  if (fond.type === 'degrade') {
    const degrade = creerSvg('linearGradient', { id: `${id}-fond`, gradientTransform: `rotate(${fond.angle} 0.5 0.5)` }, defs);
    creerSvg('stop', { offset: '0', 'stop-color': fond.couleur1 }, degrade);
    creerSvg('stop', { offset: '1', 'stop-color': fond.couleur2 }, degrade);
    remplissage = `url(#${id}-fond)`;
  }
  creerSvg('rect', { width: LARGEUR, height: HAUTEUR, fill: remplissage }, groupe);
  if (fond.type === 'image' && fond.image) {
    creerSvg('image', { width: LARGEUR, height: HAUTEUR, href: fond.image, preserveAspectRatio: 'xMidYMid slice' }, groupe);
  }
}

/**
 * Calcule le texte affiché par un élément texte.
 * @param {object} element - Élément texte.
 * @param {object} personne - Personne.
 * @param {boolean} edition - Mode édition (affiche un repère si vide).
 * @returns {string} Texte final ('' = rien à afficher).
 */
function texteElement(element, personne, edition) {
  let valeur = element.source === 'libre' ? element.texte : valeurChamp(personne, element.champ);
  if (valeur) valeur = `${element.prefixe}${valeur}`;
  else if (edition) valeur = element.source === 'libre' ? 'Texte' : `[${CHAMPS_AFFICHABLES.find(([c]) => c === element.champ)?.[1]}]`;
  return element.majuscules ? valeur.toLocaleUpperCase('fr') : valeur;
}

/**
 * Dessine un élément texte (multiligne, aligné, coupé si trop long).
 * @param {SVGElement} groupe - Groupe parent.
 * @param {object} el - Élément texte.
 * @param {object} contexte - { personne, edition }.
 */
function dessinerTexte(groupe, el, { personne, edition }) {
  const texte = texteElement(el, personne, edition);
  if (!texte) return;
  const police = POLICES[el.police];
  const pas = (el.taille * el.interligne) / 100;
  const lignesMax = Math.max(1, Math.floor((el.hauteur - el.taille) / pas) + 1);
  const style = { taille: el.taille, police, graisse: el.graisse, italique: el.italique, espacement: el.espacement };
  const x = { start: el.x, middle: el.x + el.largeur / 2, end: el.x + el.largeur }[el.alignement];

  decouperTexte(texte, el.largeur, lignesMax, style).forEach((ligne, i) => {
    const element = creerSvg('text', {
      x,
      y: el.y + el.taille * 0.82 + i * pas,
      'font-family': police,
      'font-size': el.taille,
      'font-weight': el.graisse,
      'font-style': el.italique ? 'italic' : undefined,
      'letter-spacing': el.espacement || undefined,
      'text-anchor': el.alignement,
      fill: el.couleur,
    }, groupe);
    element.textContent = ligne;
  });
}

/**
 * Dessine le QR code (carré centré dans la zone de l'élément) : contact
 * (vCard), site web ou lien. Si la personne n'a pas ce lien, rien n'est
 * dessiné sur la carte ; l'éditeur affiche un repère en pointillés.
 * @param {SVGElement} groupe - Groupe parent.
 * @param {object} el - Élément QR.
 * @param {object} contexte - { personne, qr, edition }.
 */
function dessinerElementQr(groupe, el, { personne, qr, edition }) {
  const taille = Math.min(el.largeur, el.hauteur);
  const x = el.x + (el.largeur - taille) / 2;
  const y = el.y + (el.hauteur - taille) / 2;
  const code = qrPourElement(personne, el, qr);
  if (code) {
    dessinerQr(groupe, code, { x, y, taille, couleur: el.couleur, fond: el.fond, marge: el.marge, arrondi: el.arrondi });
    return;
  }
  if (!edition && el.contenu !== 'vcard') return;
  creerSvg('rect', { x, y, width: taille, height: taille, fill: el.fond, stroke: el.couleur, 'stroke-dasharray': '8 6' }, groupe);
  const repere = creerSvg('text', { x: x + taille / 2, y: y + taille / 2 + 6, 'text-anchor': 'middle', 'font-size': Math.max(12, taille / 9), fill: el.couleur, 'font-family': POLICES.moderne }, groupe);
  repere.textContent = el.contenu === 'lien' ? `Lien ${el.numeroLien} absent` : 'QR indisponible';
}

/**
 * Dessine une image (logo, photo…).
 * @param {SVGElement} groupe - Groupe parent.
 * @param {object} el - Élément image.
 * @param {object} contexte - { edition }.
 */
function dessinerImage(groupe, el, { edition }) {
  if (el.image) {
    creerSvg('image', {
      x: el.x, y: el.y, width: el.largeur, height: el.hauteur, href: el.image,
      preserveAspectRatio: el.ajustement === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet',
    }, groupe);
  } else if (edition) {
    creerSvg('rect', { x: el.x, y: el.y, width: el.largeur, height: el.hauteur, fill: '#e5e7eb', stroke: '#9ca3af', 'stroke-dasharray': '6 5' }, groupe);
  }
}

/**
 * Dessine une forme (rectangle, ellipse ou ligne horizontale).
 * @param {SVGElement} groupe - Groupe parent.
 * @param {object} el - Élément forme.
 */
function dessinerForme(groupe, el) {
  const trait = el.epaisseurContour > 0 ? { stroke: el.contour, 'stroke-width': el.epaisseurContour } : {};
  const remplissage = el.sansRemplissage ? 'none' : el.remplissage;
  if (el.forme === 'ellipse') {
    creerSvg('ellipse', { cx: el.x + el.largeur / 2, cy: el.y + el.hauteur / 2, rx: el.largeur / 2, ry: el.hauteur / 2, fill: remplissage, ...trait }, groupe);
  } else if (el.forme === 'ligne') {
    const y = el.y + el.hauteur / 2;
    creerSvg('line', { x1: el.x, y1: y, x2: el.x + el.largeur, y2: y, stroke: el.contour, 'stroke-width': Math.max(1, el.epaisseurContour) }, groupe);
  } else {
    creerSvg('rect', { x: el.x, y: el.y, width: el.largeur, height: el.hauteur, rx: el.arrondi, fill: remplissage, ...trait }, groupe);
  }
}

// Fonction de dessin par type d'élément.
const DESSINATEURS = { texte: dessinerTexte, qr: dessinerElementQr, image: dessinerImage, forme: dessinerForme };
