/**
 * ChargementPolices.js
 * Charge les polices intégrées (assets/polices) avant d'afficher les cartes :
 *  - elles sont ajoutées au document, pour l'affichage et la mesure du texte ;
 *  - une copie en Base64 est gardée pour les exports (PNG, JPEG, PDF, SVG, GIF),
 *    car une image SVG ne peut pas utiliser les polices de la page.
 * Les fichiers viennent uniquement de l'appli (même origine), jamais d'Internet.
 */

import { FACES_POLICES } from '../Metier/Polices.js';
import { octetsVersBase64 } from './DataUrl.js';

const DOSSIER = new URL('../../assets/polices/', import.meta.url);
// Fichier → Base64, pour les exports.
const contenus = new Map();
let chargement = null;

/**
 * Télécharge et installe une face de police.
 * @param {string} famille - Nom de famille CSS.
 * @param {[string, string, string]} face - [fichier, graisse, style].
 * @returns {Promise<void>} Fin du chargement.
 */
async function chargerFace(famille, [fichier, graisse, style]) {
  const reponse = await fetch(new URL(`${fichier}.woff`, DOSSIER));
  if (!reponse.ok) throw new Error(`Police ${fichier} introuvable.`);
  const octets = new Uint8Array(await reponse.arrayBuffer());
  const police = new FontFace(famille, octets, { weight: graisse, style });
  await police.load();
  document.fonts.add(police);
  contenus.set(fichier, octetsVersBase64(octets));
}

/**
 * Charge toutes les polices intégrées (une seule fois).
 * @returns {Promise<void>} Fin du chargement.
 */
export function chargerPolices() {
  if (!chargement) {
    chargement = Promise.all(Object.entries(FACES_POLICES).flatMap(([famille, faces]) => faces.map((face) => chargerFace(famille, face))))
      .then(() => undefined)
      .catch((erreur) => {
        chargement = null; // Nouvel essai possible plus tard.
        throw erreur;
      });
  }
  return chargement;
}

/**
 * Règles @font-face (polices en Base64) des familles utilisées par un SVG,
 * à insérer dans le SVG exporté.
 * @param {string} texteSvg - Contenu du SVG (pour trouver les familles utilisées).
 * @returns {string} Règles CSS (vide si aucune police intégrée n'est utilisée).
 */
export function cssPolicesPourSvg(texteSvg) {
  return Object.entries(FACES_POLICES)
    .filter(([famille]) => texteSvg.includes(famille))
    .flatMap(([famille, faces]) => faces
      .filter(([fichier]) => contenus.has(fichier))
      .map(([fichier, graisse, style]) => `@font-face{font-family:"${famille}";font-weight:${graisse};font-style:${style};src:url(data:font/woff;base64,${contenus.get(fichier)}) format("woff");}`))
    .join('');
}
