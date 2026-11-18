/**
 * Champs.js
 * Briques d'interface réutilisables pour les formulaires
 * (champ avec libellé et message d'erreur, section repliable).
 */

import { creerElement } from '../Utilitaires/Dom.js';

/**
 * Entoure un contrôle d'un libellé et d'une zone d'erreur.
 * @param {string} libelle - Texte du libellé.
 * @param {HTMLElement} controle - Input, select ou textarea (doit avoir un id).
 * @param {string} [classe=""] - Classe CSS supplémentaire.
 * @returns {{bloc:HTMLElement, erreur:HTMLElement}} Bloc complet et zone d'erreur.
 */
export function creerChamp(libelle, controle, classe = '') {
  const erreur = creerElement('p', { classe: 'Champ-erreur', attributs: { id: `${controle.id}-erreur`, hidden: true } });
  controle.setAttribute('aria-describedby', erreur.id);
  const bloc = creerElement('div', { classe: `Champ ${classe}`.trim() }, [
    creerElement('label', { texte: libelle, attributs: { for: controle.id } }),
    controle,
    erreur,
  ]);
  return { bloc, erreur };
}

/**
 * Affiche ou masque un message d'erreur sous un champ.
 * @param {HTMLElement} zone - Zone d'erreur.
 * @param {HTMLElement} controle - Contrôle concerné.
 * @param {string} message - Message (vide = pas d'erreur).
 */
export function afficherErreur(zone, controle, message) {
  zone.textContent = message;
  zone.hidden = !message;
  controle.setAttribute('aria-invalid', String(Boolean(message)));
}

/**
 * Crée une section repliable avec titre.
 * @param {string} titre - Titre de la section.
 * @param {boolean} [ouverte=true] - Ouverte par défaut.
 * @returns {{section:HTMLElement, contenu:HTMLElement}} Section et zone de contenu.
 */
export function creerSection(titre, ouverte = true) {
  const contenu = creerElement('div', { classe: 'Section-contenu' });
  const section = creerElement('details', { classe: 'Section', attributs: { open: ouverte } }, [
    creerElement('summary', { classe: 'Section-titre', texte: titre }),
    contenu,
  ]);
  return { section, contenu };
}
