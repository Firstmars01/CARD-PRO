/**
 * GenerateurVCard.js
 * Construit une vCard 3.0 (format le mieux reconnu par iPhone et Android)
 * à partir d'une personne normalisée. C'est ce texte qui est mis dans le
 * QR code de la carte et dans le fichier .vcf. La photo de profil n'est
 * ajoutée qu'au fichier .vcf (trop lourde pour un QR code ou une puce NFC).
 */

import { nomComplet, lienWhatsapp } from './Personne.js';

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
 * Coupe une longue ligne vCard en lignes de 75 caractères (suite précédée d'un espace).
 * @param {string} ligne - Ligne complète.
 * @returns {string} Ligne repliée.
 */
function replier(ligne) {
  const morceaux = [];
  for (let i = 0; i < ligne.length; i += 74) morceaux.push(ligne.slice(i, i + 74));
  return morceaux.join('\r\n ');
}

/**
 * Génère le texte vCard d'une personne.
 * @param {object} carte - Personne normalisée.
 * @param {{photoJpeg?:string}} [options] - photoJpeg : photo de profil en JPEG (Base64), pour le fichier .vcf.
 * @returns {string} vCard (lignes séparées par CRLF).
 */
export function genererVCard(carte, options = {}) {
  const e = echapperVCard;
  const lignes = ['BEGIN:VCARD', 'VERSION:3.0'];
  lignes.push(`N:${e(carte.nom)};${e(carte.prenom)};;;`);
  lignes.push(`FN:${e(nomComplet(carte) || carte.entreprise || 'Contact')}`);
  if (carte.entreprise) lignes.push(`ORG:${e(carte.entreprise)}`);
  if (carte.poste) lignes.push(`TITLE:${e(carte.poste)}`);
  if (carte.telephoneMobile) lignes.push(`TEL;TYPE=CELL:${e(carte.telephoneMobile)}`);
  if (carte.telephoneSupport) lignes.push(`TEL;TYPE=WORK,VOICE:${e(carte.telephoneSupport)}`);
  if (carte.email) lignes.push(`EMAIL;TYPE=INTERNET:${e(carte.email)}`);
  if (carte.siteWeb) lignes.push(`URL:${urlSurUneLigne(carte.siteWeb)}`);
  if (carte.rue || carte.ville || carte.codePostal || carte.pays) {
    lignes.push(`ADR;TYPE=WORK:;;${e(carte.rue)};${e(carte.ville)};;${e(carte.codePostal)};${e(carte.pays)}`);
  }
  // Liens avec un nom (reconnu par iPhone via X-ABLabel) : champs dédiés puis liens personnalisés.
  const liensNommes = [
    ['LinkedIn', carte.linkedin], ["LinkedIn de l'entreprise", carte.linkedinEntreprise],
    ['WhatsApp', lienWhatsapp(carte.whatsapp)], ['Rendez-vous', carte.rendezVous],
    ...carte.liens.map((lien) => [lien.libelle, lien.url]),
  ].filter(([, url]) => url);
  liensNommes.forEach(([libelle, url], i) => {
    lignes.push(`item${i + 1}.URL:${urlSurUneLigne(url)}`);
    lignes.push(`item${i + 1}.X-ABLabel:${e(libelle)}`);
  });
  if (carte.note) lignes.push(`NOTE:${e(carte.note)}`);
  if (options.photoJpeg && /^[A-Za-z0-9+/]+={0,2}$/.test(options.photoJpeg)) lignes.push(replier(`PHOTO;ENCODING=b;TYPE=JPEG:${options.photoJpeg}`));
  lignes.push('END:VCARD');
  return lignes.join('\r\n');
}
