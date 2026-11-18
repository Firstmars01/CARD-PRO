/**
 * RenduQrSvg.js
 * Dessine un QR code en SVG (vectoriel, net à toutes les tailles),
 * soit à l'intérieur de la carte, soit comme fichier autonome.
 */

import { creerSvg } from '../../Utilitaires/Dom.js';

/**
 * Construit le tracé SVG des modules sombres (suites fusionnées par ligne).
 * @param {{taille:number, modules:boolean[][]}} qr - QR code encodé.
 * @param {number} marge - Marge en modules.
 * @returns {string} Attribut « d » du chemin.
 */
function cheminModules(qr, marge) {
  const morceaux = [];
  qr.modules.forEach((ligne, y) => {
    for (let x = 0; x < qr.taille; x++) {
      if (!ligne[x]) continue;
      let fin = x;
      while (fin + 1 < qr.taille && ligne[fin + 1]) fin++;
      morceaux.push(`M${x + marge} ${y + marge}h${fin - x + 1}v1h-${fin - x + 1}z`);
      x = fin;
    }
  });
  return morceaux.join('');
}

/**
 * Dessine un QR code dans un élément SVG parent.
 * @param {SVGElement} parent - Groupe ou SVG parent.
 * @param {object} qr - QR code encodé.
 * @param {object} options - { x, y, taille, couleur, fond, marge, arrondi }.
 */
export function dessinerQr(parent, qr, { x, y, taille, couleur, fond, marge, arrondi = 0 }) {
  const groupe = creerSvg('g', { transform: `translate(${x} ${y})` }, parent);
  creerSvg('rect', { width: taille, height: taille, rx: arrondi, fill: fond }, groupe);
  const echelle = taille / (qr.taille + marge * 2);
  creerSvg('path', {
    d: cheminModules(qr, marge),
    fill: couleur,
    transform: `scale(${echelle})`,
    'shape-rendering': 'crispEdges',
  }, groupe);
}

/**
 * Crée un SVG autonome contenant uniquement le QR code (pour l'export).
 * @param {object} qr - QR code encodé.
 * @param {object} options - { couleur, fond, marge }.
 * @returns {SVGSVGElement} Élément SVG.
 */
export function creerQrSvgAutonome(qr, { couleur, fond, marge }) {
  const total = qr.taille + marge * 2;
  const svg = creerSvg('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${total} ${total}`, width: 1024, height: 1024 });
  dessinerQr(svg, qr, { x: 0, y: 0, taille: total, couleur, fond, marge });
  return svg;
}
