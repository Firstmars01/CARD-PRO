/**
 * ContenuQr.js
 * Génère les QR codes d'une carte :
 * - le QR « contact » contient la vCard (ajout aux contacts, sans internet) ;
 * - un QR « lien » ou « site web » contient une seule adresse (LinkedIn,
 *   portfolio…) et ouvre directement la page quand on le scanne.
 */

import { encoderTexteQr } from '../Utilitaires/EncodeurQr.js';
import { genererVCard } from './GenerateurVCard.js';

// Au-delà de cette version, le QR devient difficile à scanner sur une carte.
const VERSION_CONFORTABLE = 15;
const CACHE_MAX = 100;
const cacheLiens = new Map();

/**
 * Génère le QR code (vCard) d'une personne, en niveau M (15 % de
 * correction), ou en niveau L si les données sont trop longues pour M.
 * @param {object} personne - Personne normalisée.
 * @returns {{qr:object|null, avertissements:string[]}} QR et éventuels avertissements.
 */
export function genererQrPersonne(personne) {
  const texte = genererVCard(personne);
  const avertissements = [];
  let qr = null;
  try {
    qr = encoderTexteQr(texte, 'M');
  } catch {
    try {
      qr = encoderTexteQr(texte, 'L');
    } catch {
      avertissements.push('Trop de données pour le QR code : raccourcis la note ou retire des liens.');
    }
  }
  if (qr && qr.version > VERSION_CONFORTABLE) {
    avertissements.push('QR code très dense : agrandis-le dans le modèle ou réduis les informations.');
  }
  return { qr, avertissements };
}

/**
 * Renvoie l'adresse qu'un QR code de lien doit contenir.
 * @param {object} personne - Personne normalisée.
 * @param {object} element - Élément QR.
 * @returns {string} URL ('' si la personne n'a pas ce lien).
 */
export function adresseQrElement(personne, element) {
  if (element.contenu === 'siteWeb') return personne.siteWeb;
  if (element.contenu === 'lien') return personne.liens[element.numeroLien - 1]?.url || '';
  return '';
}

/**
 * Renvoie le QR code à dessiner pour un élément QR.
 * Les QR de liens sont mis en cache (une même adresse n'est encodée qu'une fois).
 * @param {object} personne - Personne normalisée.
 * @param {object} element - Élément QR.
 * @param {object|null} qrContact - QR vCard déjà calculé pour la personne.
 * @returns {object|null} QR code, ou null si le contenu est absent.
 */
export function qrPourElement(personne, element, qrContact) {
  if (element.contenu === 'vcard') return qrContact;
  const adresse = adresseQrElement(personne, element);
  if (!adresse) return null;
  if (!cacheLiens.has(adresse)) {
    if (cacheLiens.size >= CACHE_MAX) cacheLiens.delete(cacheLiens.keys().next().value);
    cacheLiens.set(adresse, encoderTexteQr(adresse, 'M'));
  }
  return cacheLiens.get(adresse);
}
