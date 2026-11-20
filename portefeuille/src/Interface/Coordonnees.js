/**
 * Coordonnees.js
 * Liste des coordonnées cliquables d'une personne (appel, WhatsApp, e-mail,
 * site, LinkedIn, rendez-vous, liens, adresse avec itinéraire). Partagée par l'écran d'une carte et la page « contact ».
 * Les adresses viennent de données déjà validées (liens http/https,
 * téléphone et e-mail nettoyés).
 */

import { creerElement } from '../../../src/Utilitaires/Dom.js';
import { urlLisible, lienWhatsapp, lienItineraire, valeurChamp } from '../../../src/Metier/Personne.js';

/**
 * Crée une ligne de coordonnée (lien cliquable).
 * @param {string} libelle - Type d'information (ex. « Mobile »).
 * @param {string} texte - Texte affiché.
 * @param {string} href - Adresse du lien (tel:, mailto:, https:).
 * @returns {HTMLLIElement} Ligne.
 */
function ligneLien(libelle, texte, href) {
  const externe = href.startsWith('http');
  return creerElement('li', { classe: 'Coordonnee' }, [
    creerElement('span', { classe: 'Coordonnee-libelle', texte: libelle }),
    creerElement('a', {
      classe: 'Coordonnee-valeur',
      texte,
      attributs: { href, target: externe ? '_blank' : undefined, rel: externe ? 'noopener noreferrer' : undefined },
    }),
  ]);
}

/**
 * Liste les coordonnées de la personne (seules les adresses validées à l'import sont utilisées).
 * @param {object} personne - Personne normalisée.
 * @returns {HTMLUListElement} Liste.
 */
export function creerCoordonnees(personne) {
  const lignes = [];
  const telephone = (numero) => `tel:${numero.replace(/[^\d+]/g, '')}`;
  if (personne.telephoneMobile) lignes.push(ligneLien('Mobile', personne.telephoneMobile, telephone(personne.telephoneMobile)));
  if (personne.telephonePro) lignes.push(ligneLien('Fixe', personne.telephonePro, telephone(personne.telephonePro)));
  if (personne.telephoneStandard) lignes.push(ligneLien('Standard', personne.telephoneStandard, telephone(personne.telephoneStandard)));
  if (personne.whatsapp) lignes.push(ligneLien('WhatsApp', personne.whatsapp, lienWhatsapp(personne.whatsapp)));
  if (personne.email) lignes.push(ligneLien('E-mail', personne.email, `mailto:${personne.email}`));
  [['Site', 'siteWeb'], ['LinkedIn', 'linkedin'], ['LinkedIn entreprise', 'linkedinEntreprise'], ['Rendez-vous', 'rendezVous']]
    .filter(([, cle]) => personne[cle])
    .forEach(([libelle, cle]) => lignes.push(ligneLien(libelle, urlLisible(personne[cle]), personne[cle])));
  personne.liens.forEach((lien) => lignes.push(ligneLien(lien.libelle || 'Lien', urlLisible(lien.url), lien.url)));
  // Adresse : ouvre l'itinéraire (Google Maps, ou Plans sur iPhone).
  if (lienItineraire(personne)) lignes.push(ligneLien('Adresse', valeurChamp(personne, 'adresse'), lienItineraire(personne)));
  const liste = creerElement('ul', { classe: 'Coordonnees' }, lignes);
  liste.hidden = lignes.length === 0;
  return liste;
}
