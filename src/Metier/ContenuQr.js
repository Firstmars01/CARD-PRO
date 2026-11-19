/**
 * ContenuQr.js
 * Génère les QR codes d'une carte :
 * - le QR « contact » contient la vCard (ajout aux contacts, sans internet) ;
 * - un QR « lien » ou « site web » contient une seule adresse (LinkedIn,
 *   portfolio…) et ouvre directement la page quand on le scanne ;
 * - un QR avec logo est encodé au niveau de correction maximal (H).
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
 * Encode un texte au niveau de correction voulu (avec repli si trop long),
 * en gardant le résultat en cache.
 * @param {string} texte - Texte à encoder.
 * @param {string[]} niveaux - Niveaux à essayer dans l'ordre (ex. ["H", "Q", "M"]).
 * @returns {object|null} QR code (avec son niveau), ou null si trop long.
 */
function encoderAvecCache(texte, niveaux) {
  const cle = `${niveaux.join('')}|${texte}`;
  if (!cacheLiens.has(cle)) {
    if (cacheLiens.size >= CACHE_MAX) cacheLiens.delete(cacheLiens.keys().next().value);
    let qr = null;
    for (const niveau of niveaux) {
      try {
        qr = { ...encoderTexteQr(texte, niveau), niveau };
        break;
      } catch {
        // Trop long pour ce niveau : on essaie le suivant.
      }
    }
    cacheLiens.set(cle, qr);
  }
  return cacheLiens.get(cle);
}

/**
 * Renvoie le QR code à dessiner pour un élément QR. Avec un logo au
 * centre, le QR est encodé au niveau H (30 % de correction) pour rester
 * lisible malgré les points masqués.
 * @param {object} personne - Personne normalisée.
 * @param {object} element - Élément QR.
 * @param {object|null} qrContact - QR vCard déjà calculé pour la personne.
 * @returns {object|null} QR code, ou null si le contenu est absent.
 */
export function qrPourElement(personne, element, qrContact) {
  const texte = element.contenu === 'vcard' ? genererVCard(personne) : adresseQrElement(personne, element);
  if (!texte) return null;
  if (element.logo) return encoderAvecCache(texte, ['H', 'Q', 'M']);
  if (element.contenu === 'vcard') return qrContact;
  return encoderAvecCache(texte, ['M', 'L']);
}

/**
 * Liste les risques de lecture d'un QR code stylé (logo, coins ronds, densité).
 * @param {object|null} qr - QR code calculé.
 * @param {object} element - Élément QR.
 * @returns {string[]} Avertissements (vide si tout va bien).
 */
export function avertissementsQrElement(qr, element) {
  const avertissements = [];
  if (!qr) return avertissements;
  if (element.logo && qr.niveau !== 'H') avertissements.push('QR avec logo trop chargé : réduis le logo ou les informations pour garantir la lecture.');
  if (element.logo && qr.niveau === 'H' && qr.version > VERSION_CONFORTABLE) {
    avertissements.push('QR avec logo très dense : agrandis-le, ou mets un lien (site, LinkedIn…) plutôt que le contact complet.');
  }
  if (element.styleYeux !== 'carre') {
    avertissements.push("Coins du QR arrondis ou ronds : certains lecteurs anciens les lisent mal. Teste la lecture avec un téléphone avant d'imprimer.");
  }
  return avertissements;
}
