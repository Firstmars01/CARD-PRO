/**
 * GenerateurVCard.js
 * Construit une vCard 3.0 (format le mieux reconnu par iPhone et Android)
 * à partir d'une personne normalisée. C'est ce texte qui est mis dans le
 * QR code de la carte et dans le fichier .vcf.
 */

import { nomComplet } from './Personne.js';

/**
 * Échappe un texte selon la norme vCard (\ ; , et sauts de ligne).
 * Empêche aussi l'injection de nouvelles propriétés.
 * @param {string} texte - Texte à échapper.
 * @returns {string} Texte échappé.
 */
export function echapperVCard(texte) {
  return String(texte)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Supprime les sauts de ligne d'une URL (protection d'injection).
 * @param {string} url - URL déjà validée.
 * @returns {string} URL sur une seule ligne.
 */
function urlSurUneLigne(url) {
  return String(url).replace(/[\r\n]/g, '');
}

/**
 * Génère le texte vCard d'une personne.
 * @param {object} carte - Personne normalisée.
 * @returns {string} vCard (lignes séparées par CRLF).
 */
export function genererVCard(carte) {
  const e = echapperVCard;
  const lignes = ['BEGIN:VCARD', 'VERSION:3.0'];
  lignes.push(`N:${e(carte.nom)};${e(carte.prenom)};;;`);
  lignes.push(`FN:${e(nomComplet(carte) || carte.entreprise || 'Contact')}`);
  if (carte.entreprise) lignes.push(`ORG:${e(carte.entreprise)}`);
  if (carte.poste) lignes.push(`TITLE:${e(carte.poste)}`);
  if (carte.telephoneMobile) lignes.push(`TEL;TYPE=CELL:${e(carte.telephoneMobile)}`);
  if (carte.telephonePro) lignes.push(`TEL;TYPE=WORK,VOICE:${e(carte.telephonePro)}`);
  if (carte.email) lignes.push(`EMAIL;TYPE=INTERNET:${e(carte.email)}`);
  if (carte.siteWeb) lignes.push(`URL:${urlSurUneLigne(carte.siteWeb)}`);
  if (carte.rue || carte.ville || carte.codePostal || carte.pays) {
    lignes.push(`ADR;TYPE=WORK:;;${e(carte.rue)};${e(carte.ville)};;${e(carte.codePostal)};${e(carte.pays)}`);
  }
  // Liens personnalisés : le libellé est reconnu par iPhone (X-ABLabel).
  carte.liens.forEach((lien, i) => {
    lignes.push(`item${i + 1}.URL:${urlSurUneLigne(lien.url)}`);
    lignes.push(`item${i + 1}.X-ABLabel:${e(lien.libelle)}`);
  });
  if (carte.note) lignes.push(`NOTE:${e(carte.note)}`);
  lignes.push('END:VCARD');
  return lignes.join('\r\n');
}
