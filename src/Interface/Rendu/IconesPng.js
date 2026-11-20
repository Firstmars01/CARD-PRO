/**
 * IconesPng.js
 * Convertit les icônes de la carte (tracés SVG) en petites images PNG
 * colorées : les logiciels de messagerie (Outlook) n'affichent pas le SVG.
 */

import { TRACES_ICONES } from '../../Metier/IconesCarte.js';

/**
 * Dessine une icône en PNG.
 * @param {string} cle - Clé de l'icône (IconesCarte.js).
 * @param {string} couleur - Couleur du trait (#rrggbb).
 * @param {number} taille - Côté en pixels (doublé pour les écrans haute densité).
 * @returns {Promise<string>} Data URL PNG ('' si l'icône ou la couleur est invalide).
 */
export async function iconePng(cle, couleur, taille) {
  const trace = TRACES_ICONES[cle];
  if (!trace || !/^#[0-9a-f]{6}$/i.test(couleur)) return '';
  // Tracé et couleur viennent du code et d'une couleur validée : aucun texte libre dans le SVG.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${taille}" height="${taille}">`
    + `<path d="${trace}" fill="none" stroke="${couleur}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = taille;
  canvas.height = taille;
  canvas.getContext('2d').drawImage(image, 0, 0, taille, taille);
  return canvas.toDataURL('image/png');
}

/**
 * Dessine plusieurs icônes d'un coup.
 * @param {string[]} cles - Clés des icônes.
 * @param {string} couleur - Couleur du trait.
 * @param {number} taille - Côté en pixels.
 * @returns {Promise<Object<string, string>>} Clé → data URL PNG.
 */
export async function iconesPng(cles, couleur, taille) {
  const images = await Promise.all(cles.map((cle) => iconePng(cle, couleur, taille)));
  return Object.fromEntries(cles.map((cle, i) => [cle, images[i]]));
}
