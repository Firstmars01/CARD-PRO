/**
 * Formes.js
 * Calcule les tracés SVG (attribut « d ») des formes de la carte :
 * rectangle à coins arrondis indépendants, triangle, losange, étoile,
 * polygone, vague et flèche. Fonctions pures, sans accès au DOM.
 */

/**
 * Arrondit à 2 décimales (tracés plus courts).
 * @param {number} n - Nombre.
 * @returns {number} Nombre arrondi.
 */
const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Rectangle avec un rayon différent pour chaque coin.
 * @param {number} x - Gauche.
 * @param {number} y - Haut.
 * @param {number} l - Largeur.
 * @param {number} h - Hauteur.
 * @param {number[]} rayons - [haut-gauche, haut-droit, bas-droit, bas-gauche].
 * @returns {string} Tracé.
 */
export function rectangleArrondi(x, y, l, h, rayons) {
  const max = Math.min(l, h) / 2;
  const [hg, hd, bd, bg] = rayons.map((r) => Math.max(0, Math.min(r, max)));
  return [
    `M${r2(x + hg)} ${r2(y)}`, `H${r2(x + l - hd)}`, hd ? `A${hd} ${hd} 0 0 1 ${r2(x + l)} ${r2(y + hd)}` : '',
    `V${r2(y + h - bd)}`, bd ? `A${bd} ${bd} 0 0 1 ${r2(x + l - bd)} ${r2(y + h)}` : '',
    `H${r2(x + bg)}`, bg ? `A${bg} ${bg} 0 0 1 ${r2(x)} ${r2(y + h - bg)}` : '',
    `V${r2(y + hg)}`, hg ? `A${hg} ${hg} 0 0 1 ${r2(x + hg)} ${r2(y)}` : '', 'Z',
  ].join('');
}

/**
 * Polygone régulier ou étoile inscrit dans une boîte.
 * @param {number} x - Gauche.
 * @param {number} y - Haut.
 * @param {number} l - Largeur.
 * @param {number} h - Hauteur.
 * @param {number} cotes - Nombre de côtés (ou de branches pour l'étoile).
 * @param {boolean} etoile - true pour une étoile.
 * @returns {string} Tracé.
 */
function polygone(x, y, l, h, cotes, etoile) {
  const n = etoile ? cotes * 2 : cotes;
  const points = Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const rayon = etoile && i % 2 === 1 ? 0.45 : 1;
    return `${r2(x + l / 2 + (Math.cos(angle) * rayon * l) / 2)} ${r2(y + h / 2 + (Math.sin(angle) * rayon * h) / 2)}`;
  });
  return `M${points.join('L')}Z`;
}

/**
 * Bande ondulée : la partie haute ondule, le bas est plat.
 * @param {number} x - Gauche.
 * @param {number} y - Haut.
 * @param {number} l - Largeur.
 * @param {number} h - Hauteur.
 * @param {number} ondulations - Nombre de vagues.
 * @returns {string} Tracé.
 */
function vague(x, y, l, h, ondulations) {
  const amplitude = Math.min(h / 3, 40);
  const pas = l / ondulations;
  let d = `M${r2(x)} ${r2(y + amplitude)}`;
  for (let i = 0; i < ondulations; i++) {
    const debut = x + i * pas;
    d += `C${r2(debut + pas / 3)} ${r2(y - amplitude / 2)} ${r2(debut + (2 * pas) / 3)} ${r2(y + amplitude * 2.5)} ${r2(debut + pas)} ${r2(y + amplitude)}`;
  }
  return `${d}V${r2(y + h)}H${r2(x)}Z`;
}

/**
 * Flèche vers la droite (utiliser la rotation pour l'orienter).
 * @param {number} x - Gauche.
 * @param {number} y - Haut.
 * @param {number} l - Largeur.
 * @param {number} h - Hauteur.
 * @returns {string} Tracé.
 */
function fleche(x, y, l, h) {
  const tete = Math.min(l * 0.45, h);
  const corps = h * 0.4;
  const haut = y + (h - corps) / 2;
  return `M${r2(x)} ${r2(haut)}H${r2(x + l - tete)}V${r2(y)}L${r2(x + l)} ${r2(y + h / 2)}L${r2(x + l - tete)} ${r2(y + h)}V${r2(haut + corps)}H${r2(x)}Z`;
}

/**
 * Renvoie le tracé d'une forme (sauf rectangle simple, ellipse et ligne,
 * dessinés avec leurs balises SVG natives).
 * @param {object} el - Élément forme (x, y, largeur, hauteur, forme, cotes…).
 * @returns {string} Tracé SVG.
 */
export function cheminForme(el) {
  const { x, y, largeur: l, hauteur: h } = el;
  switch (el.forme) {
    case 'triangle': return `M${r2(x + l / 2)} ${r2(y)}L${r2(x + l)} ${r2(y + h)}L${r2(x)} ${r2(y + h)}Z`;
    case 'losange': return `M${r2(x + l / 2)} ${r2(y)}L${r2(x + l)} ${r2(y + h / 2)}L${r2(x + l / 2)} ${r2(y + h)}L${r2(x)} ${r2(y + h / 2)}Z`;
    case 'etoile': return polygone(x, y, l, h, el.cotes, true);
    case 'polygone': return polygone(x, y, l, h, el.cotes, false);
    case 'vague': return vague(x, y, l, h, el.cotes);
    case 'fleche': return fleche(x, y, l, h);
    default: return rectangleArrondi(x, y, l, h, [el.arrondiHG, el.arrondiHD, el.arrondiBD, el.arrondiBG]);
  }
}
