/**
 * Coordonnees.js
 * Liste des coordonnées cliquables d'une personne (appel, e-mail, site,
 * liens, adresse). Partagée par l'écran d'une carte et la page « contact ».
 * Les adresses viennent de données déjà validées (liens http/https,
 * téléphone et e-mail nettoyés).
 */

import { creerElement } from '../../../src/Utilitaires/Dom.js';
import { valeurChamp, urlLisible } from '../../../src/Metier/Personne.js';

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
  if (personne.email) lignes.push(ligneLien('E-mail', personne.email, `mailto:${personne.email}`));
  if (personne.siteWeb) lignes.push(ligneLien('Site', urlLisible(personne.siteWeb), personne.siteWeb));
  personne.liens.forEach((lien) => lignes.push(ligneLien(lien.libelle || 'Lien', urlLisible(lien.url), lien.url)));
  const adresse = valeurChamp(personne, 'adresse');
  if (adresse) {
    lignes.push(creerElement('li', { classe: 'Coordonnee' }, [
      creerElement('span', { classe: 'Coordonnee-libelle', texte: 'Adresse' }),
      creerElement('span', { classe: 'Coordonnee-valeur', texte: adresse }),
    ]));
  }
  const liste = creerElement('ul', { classe: 'Coordonnees' }, lignes);
  liste.hidden = lignes.length === 0;
  return liste;
}
