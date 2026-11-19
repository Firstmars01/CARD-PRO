/**
 * PartageContact.js
 * Transmettre la fiche contact d'une carte à quelqu'un d'autre :
 *  - « Montrer le contact » : QR code de la vCard complète en plein écran,
 *    à scanner avec l'appareil photo de n'importe quel téléphone ;
 *  - « Envoyer le contact » : menu de partage du téléphone (Quick Share,
 *    AirDrop, WhatsApp, SMS, e-mail…) avec le fichier .vcf ;
 *  - « Ajouter à mes contacts » : enregistre la fiche sur ce téléphone.
 */

import { creerElement } from '../../../src/Utilitaires/Dom.js';
import { telechargerBlob } from '../../../src/Utilitaires/Telechargement.js';
import { nomFichierSur } from '../../../src/Utilitaires/Validation.js';
import { genererVCard } from '../../../src/Metier/GenerateurVCard.js';
import { creerQrSvgAutonome } from '../../../src/Interface/Rendu/RenduQrSvg.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { titreCarte } from '../Metier/Portefeuille.js';
import { qrContact } from './RenduCarte.js';

/**
 * Crée le fichier .vcf de la carte.
 * @param {object} carte - Carte du portefeuille.
 * @returns {File} Fichier contact.
 */
function fichierContact(carte) {
  const nom = `${nomFichierSur(titreCarte(carte), 'contact')}.vcf`;
  return new File([genererVCard(carte.personne)], nom, { type: 'text/vcard' });
}

/**
 * Ouvre le menu de partage du téléphone avec le fichier contact.
 * @param {object} carte - Carte du portefeuille.
 * @returns {Promise<"partage"|"annule"|"indisponible">} Résultat.
 */
async function partagerFichier(carte) {
  const fichier = fichierContact(carte);
  if (!navigator.canShare?.({ files: [fichier] })) return 'indisponible';
  try {
    await navigator.share({ files: [fichier], title: titreCarte(carte) });
    return 'partage';
  } catch (erreur) {
    return erreur.name === 'AbortError' ? 'annule' : 'indisponible';
  }
}

/**
 * Envoie le contact à quelqu'un (Quick Share, AirDrop, messagerie…).
 * @param {object} carte - Carte du portefeuille.
 */
export async function envoyerContact(carte) {
  if (await partagerFichier(carte) === 'indisponible') {
    notifier("Le partage n'est pas disponible sur ce téléphone : utilise « Montrer le contact ».", 'erreur');
  }
}

/**
 * Enregistre le contact sur ce téléphone (menu de partage → Contacts, sinon fichier .vcf).
 * @param {object} carte - Carte du portefeuille.
 */
export async function ajouterAuxContacts(carte) {
  if (await partagerFichier(carte) === 'indisponible') {
    const fichier = fichierContact(carte);
    telechargerBlob(fichier, fichier.name);
  }
}

/**
 * Garde l'écran allumé pendant l'affichage du QR (si le téléphone le permet).
 * @returns {Promise<{release:() => Promise<void>}|null>} Verrou, ou null.
 */
async function garderEcranAllume() {
  try {
    return await navigator.wakeLock?.request('screen');
  } catch {
    return null; // Refusé (batterie faible…) : l'écran s'éteindra normalement.
  }
}

/**
 * Affiche le QR code de la fiche contact en plein écran.
 * @param {object} carte - Carte du portefeuille.
 */
export async function montrerContact(carte) {
  const qr = qrContact(carte);
  if (!qr) {
    notifier('Contact trop long pour un QR code : utilise « Envoyer le contact ».', 'erreur');
    return;
  }
  const svg = creerQrSvgAutonome(qr, { couleur: '#000000', fond: '#ffffff', marge: 4 });
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `QR code du contact de ${titreCarte(carte)}`);
  svg.classList.add('PleinEcran-qr');

  const fermer = creerElement('button', { classe: 'PBouton', texte: 'Fermer', attributs: { type: 'button' } });
  const dialogue = creerElement('dialog', { classe: 'PleinEcran', attributs: { 'aria-label': 'Montrer le contact' } }, [
    creerElement('p', { classe: 'PleinEcran-nom', texte: titreCarte(carte) }),
    svg,
    creerElement('p', { classe: 'PleinEcran-aide', texte: "Scanne avec l'appareil photo pour ajouter le contact. Monte la luminosité si besoin." }),
    fermer,
  ]);

  const verrou = await garderEcranAllume();
  dialogue.addEventListener('close', () => {
    verrou?.release().catch(() => {});
    dialogue.remove();
  });
  fermer.addEventListener('click', () => dialogue.close());
  document.body.append(dialogue);
  dialogue.showModal();
}
