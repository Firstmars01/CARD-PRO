/**
 * ContenuQr.js
 * Génère le QR code d'une personne : il contient sa vCard, ce qui permet
 * de l'enregistrer dans les contacts en scannant la carte, sans internet.
 */

import { encoderTexteQr } from '../Utilitaires/EncodeurQr.js';
import { genererVCard } from './GenerateurVCard.js';

// Au-delà de cette version, le QR devient difficile à scanner sur une carte.
const VERSION_CONFORTABLE = 15;

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
