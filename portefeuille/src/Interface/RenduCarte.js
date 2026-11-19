/**
 * RenduCarte.js
 * Dessine une face de carte du portefeuille avec le même moteur que la page
 * web : la carte est identique à celle créée par les RH.
 */

import { rendreFaceSvg } from '../../../src/Interface/Rendu/RenduFaceSvg.js';
import { genererQrPersonne } from '../../../src/Metier/ContenuQr.js';

// Le QR code de contact d'une carte ne change pas : on le calcule une fois.
const cacheQr = new WeakMap();

/**
 * Crée le SVG d'une face (recto ou verso).
 * @param {{personne:object, modele:object}} carte - Carte du portefeuille.
 * @param {"recto"|"verso"} cote - Face.
 * @returns {SVGSVGElement} Face, qui s'adapte à la largeur disponible.
 */
export function dessinerFace(carte, cote) {
  if (!cacheQr.has(carte)) cacheQr.set(carte, genererQrPersonne(carte.personne).qr);
  const svg = rendreFaceSvg(carte.modele, cote, carte.personne, cacheQr.get(carte));
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.classList.add('Face');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', cote === 'recto' ? 'Recto de la carte' : 'Verso de la carte');
  return svg;
}
