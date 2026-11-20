/**
 * RenduFaceSvg.js
 * Dessine une face de carte (recto ou verso) en SVG à partir d'un modèle,
 * d'une personne et de son QR code. La taille dépend du format du modèle
 * (1 unité = 0,1 mm). Option « fond perdu » : 3 mm de fond en plus autour
 * de la carte, pour les imprimeurs.
 * Le texte est inséré via le DOM (textContent) : aucune injection possible.
 */

import { creerSvg } from '../../Utilitaires/Dom.js';
import { ajusterTexte, lignesPossibles } from '../../Utilitaires/MesureTexte.js';
import { cheminForme } from '../../Utilitaires/Formes.js';
import { POLICES, familleCss } from '../../Metier/Polices.js';
import { TRACES_ICONES } from '../../Metier/IconesCarte.js';
import { dimensionsModele, FOND_PERDU } from '../../Metier/Formats.js';
import { nomComplet } from '../../Metier/Personne.js';
import { texteElement } from '../../Metier/Elements.js';
import { qrPourElement } from '../../Metier/ContenuQr.js';
import { creerDegrade, creerFiltre, creerMotif } from './Peintures.js';
import { dessinerQr } from './RenduQrSvg.js';

let compteurId = 0;

/**
 * Crée le SVG d'une face.
 * @param {object} modele - Modèle normalisé.
 * @param {"recto"|"verso"} cote - Face à dessiner.
 * @param {object} personne - Personne normalisée.
 * @param {object|null} qr - QR code vCard de la personne.
 * @param {{edition?:boolean, fondPerdu?:boolean}} [options] - edition : éléments masqués et repères visibles ;
 *   fondPerdu : ajoute 3 mm de fond autour de la carte (sans coins arrondis).
 * @returns {SVGSVGElement} Face en SVG.
 */
export function rendreFaceSvg(modele, cote, personne, qr, options = {}) {
  compteurId += 1;
  const prefixe = `f${compteurId}`;
  let numero = 0;
  const nouvelIdSvg = () => { numero += 1; return `${prefixe}-${numero}`; };

  const { largeur, hauteur } = dimensionsModele(modele);
  const m = options.fondPerdu ? FOND_PERDU : 0;
  const zone = { x: -m, y: -m, largeur: largeur + 2 * m, hauteur: hauteur + 2 * m };
  const face = modele[cote];
  const svg = creerSvg('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `${zone.x} ${zone.y} ${zone.largeur} ${zone.hauteur}`,
    role: 'img',
    'aria-label': `${cote === 'recto' ? 'Recto' : 'Verso'} de la carte de ${nomComplet(personne) || 'visite'}`,
  });
  const defs = creerSvg('defs', {}, svg);
  const clip = nouvelIdSvg();
  creerSvg('rect', { ...rect(zone), rx: m ? 0 : modele.arrondi }, creerSvg('clipPath', { id: clip }, defs));
  const contenu = creerSvg('g', { 'clip-path': `url(#${clip})` }, svg);

  dessinerFond(contenu, defs, face.fond, zone, nouvelIdSvg);
  const ctx = { personne, qr, edition: options.edition, defs, nouvelIdSvg };
  face.elements.forEach((element) => {
    if (!element.visible && !options.edition) return;
    // Groupe extérieur : opacité et effets (l'ombre garde sa direction) ; intérieur : rotation.
    const exterieur = creerSvg('g', {
      'data-id': element.id,
      opacity: (element.visible ? element.opacite : element.opacite * 0.3) / 100,
      filter: creerFiltre(defs, nouvelIdSvg(), element),
    }, contenu);
    const cx = element.x + element.largeur / 2;
    const cy = element.y + element.hauteur / 2;
    const groupe = element.rotation ? creerSvg('g', { transform: `rotate(${element.rotation} ${cx} ${cy})` }, exterieur) : exterieur;
    DESSINATEURS[element.type](groupe, element, ctx);
    // En édition : zone cliquable couvrant tout l'élément.
    if (options.edition) creerSvg('rect', { ...rect(element), fill: 'transparent', class: 'ZoneClic' }, groupe);
  });
  return svg;
}

/**
 * Attributs x, y, width, height d'une boîte.
 * @param {{x:number, y:number, largeur:number, hauteur:number}} b - Boîte.
 * @returns {object} Attributs SVG.
 */
function rect(b) {
  return { x: b.x, y: b.y, width: b.largeur, height: b.hauteur };
}

/**
 * Dessine le fond d'une face : couleur, dégradé ou image, puis motif et voile.
 * @param {SVGElement} groupe - Groupe parent.
 * @param {SVGElement} defs - Définitions SVG.
 * @param {object} fond - Réglages du fond.
 * @param {object} zone - Zone à couvrir (carte + fond perdu éventuel).
 * @param {Function} nouvelIdSvg - Générateur d'identifiants.
 */
function dessinerFond(groupe, defs, fond, zone, nouvelIdSvg) {
  const remplissage = fond.type === 'degrade' || fond.type === 'radial'
    ? creerDegrade(defs, nouvelIdSvg(), { type: fond.type, couleur1: fond.couleur1, couleur2: fond.couleur2, angle: fond.angle, boite: zone })
    : fond.couleur1;
  creerSvg('rect', { ...rect(zone), fill: remplissage }, groupe);
  if (fond.type === 'image' && fond.image) {
    creerSvg('image', { ...rect(zone), href: fond.image, preserveAspectRatio: 'xMidYMid slice' }, groupe);
  }
  const motif = creerMotif(defs, nouvelIdSvg(), fond);
  if (motif) creerSvg('rect', { ...rect(zone), fill: motif, opacity: fond.motifOpacite / 100 }, groupe);
  if (fond.voileOpacite > 0) creerSvg('rect', { ...rect(zone), fill: fond.voileCouleur, opacity: fond.voileOpacite / 100 }, groupe);
}

/**
 * Dessine un élément texte : lignes ou lettres empilées, couleur unie ou
 * dégradée, contour, soulignement, fond « étiquette ». Un texte trop long
 * est rétréci pour tenir dans sa zone (centré sur la position prévue).
 * @param {SVGElement} groupe - Groupe parent.
 * @param {object} el - Élément texte.
 * @param {object} ctx - Contexte de rendu.
 */
function dessinerTexte(groupe, el, ctx) {
  const texte = texteElement(el, ctx.personne, ctx.edition);
  if (!texte) return;
  if (el.fondTexte) creerSvg('rect', { ...rect(el), rx: el.fondArrondi, fill: el.fondCouleur }, groupe);

  const police = familleCss(el.police);
  const style = { taille: el.taille, police, graisse: el.graisse, italique: el.italique, espacement: el.espacement, interligne: el.interligne };
  const { lignes, taille } = el.vertical
    ? { lignes: Array.from(texte.replace(/\s+/g, '')).slice(0, lignesPossibles(el.hauteur, el.taille, el.interligne)), taille: el.taille }
    : ajusterTexte(texte, el, style);
  const pas = (taille * el.interligne) / 100;
  const decalage = (el.taille - taille) / 2; // Texte rétréci : centré sur la ligne prévue.
  const x = { start: el.x, middle: el.x + el.largeur / 2, end: el.x + el.largeur }[el.alignement];
  const couleur = el.typeCouleur === 'degrade'
    ? creerDegrade(ctx.defs, ctx.nouvelIdSvg(), { type: 'degrade', couleur1: el.couleur, couleur2: el.couleur2, angle: el.angleDegrade, boite: el })
    : el.couleur;
  const decoration = [el.souligne && 'underline', el.barre && 'line-through'].filter(Boolean).join(' ');
  const contour = el.epaisseurContourTexte > 0
    ? { stroke: el.contourTexte, 'stroke-width': el.epaisseurContourTexte, 'stroke-linejoin': 'round', 'paint-order': 'stroke' }
    : {};

  lignes.forEach((ligne, i) => {
    const element = creerSvg('text', {
      x,
      y: el.y + decalage + taille * 0.82 + i * pas,
      'font-family': police,
      'font-size': taille,
      'font-weight': el.graisse,
      'font-style': el.italique ? 'italic' : undefined,
      'letter-spacing': el.espacement || undefined,
      'text-decoration': decoration || undefined,
      'text-anchor': el.alignement,
      fill: couleur,
      ...contour,
    }, groupe);
    element.textContent = ligne;
  });
}

/**
 * Dessine un QR code (contact, site ou lien), carré et centré dans sa zone.
 * Si la personne n'a pas ce lien, rien n'est dessiné sur la carte ;
 * l'éditeur affiche un repère en pointillés.
 * @param {SVGElement} groupe - Groupe parent.
 * @param {object} el - Élément QR.
 * @param {object} ctx - Contexte de rendu.
 */
function dessinerElementQr(groupe, el, ctx) {
  const taille = Math.min(el.largeur, el.hauteur);
  const x = el.x + (el.largeur - taille) / 2;
  const y = el.y + (el.hauteur - taille) / 2;
  const code = qrPourElement(ctx.personne, el, ctx.qr);
  if (code) {
    dessinerQr(groupe, code, {
      x, y, taille, couleur: el.couleur, fond: el.fond, marge: el.marge, arrondi: el.arrondi,
      styleModules: el.styleModules, styleYeux: el.styleYeux, couleurYeux: el.couleurYeux, logo: el.logo, tailleLogo: el.tailleLogo,
    });
    return;
  }
  if (!ctx.edition && el.contenu !== 'vcard') return;
  creerSvg('rect', { x, y, width: taille, height: taille, fill: el.fond, stroke: el.couleur, 'stroke-dasharray': '8 6' }, groupe);
  const repere = creerSvg('text', { x: x + taille / 2, y: y + taille / 2 + 6, 'text-anchor': 'middle', 'font-size': Math.max(12, taille / 9), fill: el.couleur, 'font-family': POLICES.moderne }, groupe);
  repere.textContent = el.contenu === 'lien' ? `Lien ${el.numeroLien} absent` : 'QR indisponible';
}

/**
 * Dessine une image : rectangle, coins arrondis ou rond, avec bordure.
 * @param {SVGElement} groupe - Groupe parent.
 * @param {object} el - Élément image.
 * @param {object} ctx - Contexte de rendu.
 */
function dessinerImage(groupe, el, ctx) {
  // Photo de la personne à la place de l'image choisie, si elle en a une.
  const image = el.origine === 'photo' && ctx.personne.photo ? ctx.personne.photo : el.image;
  if (!image) {
    if (ctx.edition) creerSvg('rect', { ...rect(el), fill: '#e5e7eb', stroke: '#9ca3af', 'stroke-dasharray': '6 5' }, groupe);
    return;
  }
  // Contour de la forme de l'image (sert au recadrage et à la bordure).
  let forme;
  if (el.cadrage === 'cercle') {
    const r = Math.min(el.largeur, el.hauteur) / 2;
    forme = { balise: 'circle', attributs: { cx: el.x + el.largeur / 2, cy: el.y + el.hauteur / 2, r } };
  } else {
    forme = { balise: 'rect', attributs: { ...rect(el), rx: el.cadrage === 'arrondi' ? el.arrondiImage : 0 } };
  }
  let clip;
  if (el.cadrage !== 'rectangle') {
    clip = ctx.nouvelIdSvg();
    creerSvg(forme.balise, forme.attributs, creerSvg('clipPath', { id: clip }, ctx.defs));
  }
  creerSvg('image', {
    ...rect(el), href: image, 'clip-path': clip ? `url(#${clip})` : undefined,
    preserveAspectRatio: el.ajustement === 'cover' || el.cadrage === 'cercle' ? 'xMidYMid slice' : 'xMidYMid meet',
  }, groupe);
  if (el.bordure > 0) creerSvg(forme.balise, { ...forme.attributs, fill: 'none', stroke: el.bordureCouleur, 'stroke-width': el.bordure }, groupe);
}

/**
 * Dessine une forme (rectangle, ellipse, ligne, triangle, losange, étoile,
 * polygone, vague, flèche) avec couleur unie ou dégradée.
 * @param {SVGElement} groupe - Groupe parent.
 * @param {object} el - Élément forme.
 * @param {object} ctx - Contexte de rendu.
 */
function dessinerForme(groupe, el, ctx) {
  const trait = el.epaisseurContour > 0 ? { stroke: el.contour, 'stroke-width': el.epaisseurContour, 'stroke-linejoin': 'round' } : {};
  if (el.forme === 'ligne') {
    const y = el.y + el.hauteur / 2;
    creerSvg('line', { x1: el.x, y1: y, x2: el.x + el.largeur, y2: y, stroke: el.contour, 'stroke-width': Math.max(1, el.epaisseurContour), 'stroke-linecap': 'round' }, groupe);
    return;
  }
  let remplissage = el.remplissage;
  if (el.typeRemplissage === 'aucun') remplissage = 'none';
  else if (el.typeRemplissage !== 'uni') {
    remplissage = creerDegrade(ctx.defs, ctx.nouvelIdSvg(), { type: el.typeRemplissage, couleur1: el.remplissage, couleur2: el.remplissage2, angle: el.angleDegrade, boite: el });
  }
  if (el.forme === 'ellipse') {
    creerSvg('ellipse', { cx: el.x + el.largeur / 2, cy: el.y + el.hauteur / 2, rx: el.largeur / 2, ry: el.hauteur / 2, fill: remplissage, ...trait }, groupe);
  } else if (el.forme === 'rectangle' && !el.arrondiParCoin) {
    creerSvg('rect', { ...rect(el), rx: el.arrondi, fill: remplissage, ...trait }, groupe);
  } else {
    creerSvg('path', { d: cheminForme(el), fill: remplissage, ...trait }, groupe);
  }
}

/**
 * Dessine une icône (tracé 24 × 24 mis à l'échelle et centré).
 * @param {SVGElement} groupe - Groupe parent.
 * @param {object} el - Élément icône.
 */
function dessinerIcone(groupe, el) {
  const cote = Math.min(el.largeur, el.hauteur);
  const x = el.x + (el.largeur - cote) / 2;
  const y = el.y + (el.hauteur - cote) / 2;
  const conteneur = creerSvg('g', { transform: `translate(${x} ${y}) scale(${cote / 24})` }, groupe);
  creerSvg('path', {
    d: TRACES_ICONES[el.icone], fill: el.pleine ? el.couleur : 'none', stroke: el.couleur,
    'stroke-width': el.epaisseurTrait, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }, conteneur);
}

// Fonction de dessin par type d'élément.
const DESSINATEURS = { texte: dessinerTexte, qr: dessinerElementQr, image: dessinerImage, forme: dessinerForme, icone: dessinerIcone };
