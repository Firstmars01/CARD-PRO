/**
 * AnimationNfc.js
 * Petite animation qui montre comment partager par NFC : ton téléphone
 * glisse sous celui de l'autre personne, dos contre dos, jusqu'à ce que les
 * antennes (en haut) se touchent ; des ondes apparaissent alors.
 * Dessinée en SVG (aucune image externe) ; figée si la personne a demandé
 * moins d'animations dans les réglages du téléphone.
 */

import { creerSvg, creerElement } from '../../../src/Utilitaires/Dom.js';

/**
 * Dessine un téléphone vu de face.
 * @param {SVGElement} parent - Groupe parent.
 * @param {string} classe - Classe CSS (couleur, animation).
 * @param {string} texte - Libellé affiché sur l'écran.
 * @returns {SVGGElement} Téléphone.
 */
function dessinerTelephone(parent, classe, texte) {
  const groupe = creerSvg('g', { class: classe }, parent);
  creerSvg('rect', { x: 0, y: 0, width: 70, height: 130, rx: 12, class: 'AnimationNfc-coque' }, groupe);
  creerSvg('rect', { x: 6, y: 12, width: 58, height: 104, rx: 4, class: 'AnimationNfc-ecran' }, groupe);
  creerSvg('circle', { cx: 35, cy: 6, r: 2, class: 'AnimationNfc-camera' }, groupe);
  const libelle = creerSvg('text', { x: 35, y: 68, 'text-anchor': 'middle', class: 'AnimationNfc-libelle' }, groupe);
  libelle.textContent = texte;
  return groupe;
}

/**
 * Crée l'animation explicative du partage NFC.
 * @returns {HTMLElement} Figure avec l'animation et sa légende.
 */
export function creerAnimationNfc() {
  const svg = creerSvg('svg', { viewBox: '0 0 200 190', class: 'AnimationNfc-dessin', role: 'img', 'aria-label': "Ton téléphone glisse sous celui de l'autre personne, dos contre dos" });
  // Ton téléphone est dessiné en premier : il passe DESSOUS l'autre, qui reste fixe.
  const tien = creerSvg('g', { class: 'AnimationNfc-tien' }, svg);
  dessinerTelephone(tien, 'AnimationNfc-tienTelephone', 'Toi');
  const autre = dessinerTelephone(svg, 'AnimationNfc-autre', 'Autre');
  autre.setAttribute('transform', 'translate(65 10)');
  // Ondes au niveau des antennes (haut des téléphones), quand ils se superposent.
  const ondes = creerSvg('g', { class: 'AnimationNfc-ondes', transform: 'translate(100 40)' }, svg);
  [14, 24, 34].forEach((rayon, i) => creerSvg('circle', { r: rayon, class: `AnimationNfc-onde AnimationNfc-onde--${i + 1}` }, ondes));

  return creerElement('figure', { classe: 'AnimationNfc' }, [
    svg,
    creerElement('figcaption', { classe: 'AnimationNfc-legende', texte: "Glisse ton téléphone sous celui de l'autre personne, dos contre dos, le haut des deux téléphones l'un sur l'autre. Ne bouge plus 1 à 2 secondes." }),
  ]);
}
