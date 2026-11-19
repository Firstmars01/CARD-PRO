/**
 * RenduQrSvg.js
 * Dessine un QR code en SVG (vectoriel, net à toutes les tailles) avec
 * un style au choix : points carrés, arrondis ou ronds, coins (« yeux »)
 * carrés, arrondis ou ronds d'une autre couleur, et logo au centre.
 */

import { creerSvg } from '../../Utilitaires/Dom.js';
import { rectangleArrondi } from '../../Utilitaires/Formes.js';

const TAILLE_OEIL = 7;
// Les tracés des points sont longs à calculer : cache par QR et par style.
const cacheTraces = new WeakMap();

/**
 * Indique si un module fait partie d'un des trois « yeux » (coins).
 * @param {number} x - Colonne.
 * @param {number} y - Ligne.
 * @param {number} taille - Côté du QR en modules.
 * @returns {boolean} true si le module appartient à un œil.
 */
function dansOeil(x, y, taille) {
  const haut = y < TAILLE_OEIL;
  const gauche = x < TAILLE_OEIL;
  return (haut && gauche) || (haut && x >= taille - TAILLE_OEIL) || (gauche && y >= taille - TAILLE_OEIL);
}

/**
 * Construit le tracé des modules (hors yeux) selon le style.
 * @param {{taille:number, modules:boolean[][]}} qr - QR code encodé.
 * @param {"carre"|"arrondi"|"rond"} style - Forme des points.
 * @returns {string} Attribut « d » (coordonnées en modules, sans marge).
 */
function traceModules(qr, style) {
  if (!cacheTraces.has(qr)) cacheTraces.set(qr, new Map());
  const cache = cacheTraces.get(qr);
  if (cache.has(style)) return cache.get(style);

  const morceaux = [];
  qr.modules.forEach((ligne, y) => {
    for (let x = 0; x < qr.taille; x++) {
      if (!ligne[x] || dansOeil(x, y, qr.taille)) continue;
      if (style === 'rond') {
        morceaux.push(`M${x + 0.05} ${y + 0.5}a0.45 0.45 0 1 0 0.9 0a0.45 0.45 0 1 0-0.9 0`);
      } else if (style === 'arrondi') {
        morceaux.push(rectangleArrondi(x + 0.04, y + 0.04, 0.92, 0.92, [0.3, 0.3, 0.3, 0.3]));
      } else {
        // Carrés : suites de modules fusionnées sur la ligne (tracé plus léger).
        let fin = x;
        while (fin + 1 < qr.taille && ligne[fin + 1] && !dansOeil(fin + 1, y, qr.taille)) fin++;
        morceaux.push(`M${x} ${y}h${fin - x + 1}v1h-${fin - x + 1}z`);
        x = fin;
      }
    }
  });
  const trace = morceaux.join('');
  cache.set(style, trace);
  return trace;
}

/**
 * Tracé d'un œil (cadre extérieur 7 × 7 évidé + carré central 3 × 3).
 * @param {number} ox - Colonne du coin de l'œil.
 * @param {number} oy - Ligne du coin de l'œil.
 * @param {"carre"|"arrondi"|"rond"} style - Forme des yeux.
 * @returns {string} Tracé (règle de remplissage evenodd).
 */
function traceOeil(ox, oy, style) {
  if (style === 'rond') {
    const cercle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
    return cercle(ox + 3.5, oy + 3.5, 3.5) + cercle(ox + 3.5, oy + 3.5, 2.5) + cercle(ox + 3.5, oy + 3.5, 1.5);
  }
  const [r1, r2, r3] = style === 'arrondi' ? [2, 1.3, 0.9] : [0, 0, 0];
  return rectangleArrondi(ox, oy, 7, 7, [r1, r1, r1, r1])
    + rectangleArrondi(ox + 1, oy + 1, 5, 5, [r2, r2, r2, r2])
    + rectangleArrondi(ox + 2, oy + 2, 3, 3, [r3, r3, r3, r3]);
}

/**
 * Dessine un QR code dans un élément SVG parent.
 * @param {SVGElement} parent - Groupe ou SVG parent.
 * @param {object} qr - QR code encodé.
 * @param {object} options - { x, y, taille, couleur, fond, marge, arrondi, styleModules, styleYeux, couleurYeux, logo, tailleLogo }.
 */
export function dessinerQr(parent, qr, options) {
  const {
    x, y, taille, couleur, fond, marge, arrondi = 0, styleModules = 'carre', styleYeux = 'carre', couleurYeux = couleur, logo = '', tailleLogo = 22,
  } = options;
  const groupe = creerSvg('g', { transform: `translate(${x} ${y})` }, parent);
  creerSvg('rect', { width: taille, height: taille, rx: arrondi, fill: fond }, groupe);
  const total = qr.taille + marge * 2;
  const echelle = creerSvg('g', { transform: `scale(${taille / total}) translate(${marge} ${marge})` }, groupe);

  creerSvg('path', { d: traceModules(qr, styleModules), fill: couleur, 'shape-rendering': styleModules === 'carre' ? 'crispEdges' : undefined }, echelle);
  const yeux = [[0, 0], [qr.taille - TAILLE_OEIL, 0], [0, qr.taille - TAILLE_OEIL]].map(([ox, oy]) => traceOeil(ox, oy, styleYeux)).join('');
  creerSvg('path', { d: yeux, fill: couleurYeux, 'fill-rule': 'evenodd' }, echelle);

  if (logo) {
    // Logo centré sur un fond de la couleur du QR (le niveau H compense les points masqués).
    const cote = (qr.taille * tailleLogo) / 100;
    const debut = (qr.taille - cote) / 2;
    creerSvg('rect', { x: debut - 0.6, y: debut - 0.6, width: cote + 1.2, height: cote + 1.2, rx: 1, fill: fond }, echelle);
    creerSvg('image', { x: debut, y: debut, width: cote, height: cote, href: logo, preserveAspectRatio: 'xMidYMid meet' }, echelle);
  }
}

/**
 * Crée un SVG autonome contenant uniquement le QR code (pour l'export).
 * @param {object} qr - QR code encodé.
 * @param {object} options - Mêmes options que dessinerQr (sans x, y, taille).
 * @returns {SVGSVGElement} Élément SVG.
 */
export function creerQrSvgAutonome(qr, options) {
  const total = qr.taille + options.marge * 2;
  const svg = creerSvg('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${total} ${total}`, width: 1024, height: 1024 });
  dessinerQr(svg, qr, { ...options, x: 0, y: 0, taille: total });
  return svg;
}
