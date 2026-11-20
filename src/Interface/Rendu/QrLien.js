/**
 * QrLien.js
 * QR code simple (noir sur blanc) qui ouvre une adresse web : utilisé pour
 * installer l'appli mobile (page du Configurateur et page d'installation sur PC).
 */

import { encoderTexteQr } from '../../Utilitaires/EncodeurQr.js';
import { creerQrSvgAutonome } from './RenduQrSvg.js';

/**
 * Crée le QR code d'une adresse.
 * @param {string} adresse - Adresse web (déjà validée).
 * @param {string} [description="QR code"] - Texte lu par les lecteurs d'écran.
 * @returns {SVGSVGElement} QR code en SVG, qui s'adapte à la taille de son conteneur.
 */
export function creerQrLien(adresse, description = 'QR code') {
  const svg = creerQrSvgAutonome(encoderTexteQr(adresse, 'M'), { couleur: '#000000', fond: '#ffffff', marge: 4 });
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', description);
  svg.classList.add('QrLien');
  return svg;
}
