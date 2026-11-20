/**
 * Signature.js
 * Construit la signature e-mail d'une personne (pour Outlook) : un tableau
 * HTML aux styles intégrés, compris par les logiciels de messagerie.
 * Tout est créé avec le DOM (textContent) : aucun texte n'est interprété
 * comme du HTML. Les liens viennent de valeurs déjà validées
 * (http/https, tel:, mailto:). Les styles sont posés par le CSSOM
 * (element.style), compatible avec la politique de sécurité de la page,
 * et se retrouvent dans le HTML copié.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { nomComplet, urlLisible, valeurChamp, lienWhatsapp } from '../../Metier/Personne.js';

// Police sûre dans tous les logiciels de messagerie.
const POLICE = 'Arial, Helvetica, sans-serif';
const GRIS = '#5d6675';

/**
 * Crée un élément avec ses styles intégrés.
 * @param {string} balise - Balise.
 * @param {string} css - Styles (« propriété:valeur; »).
 * @param {object} [options] - Options de creerElement.
 * @param {Array<Node|string>} [enfants] - Enfants.
 * @returns {HTMLElement} Élément.
 */
function styler(balise, css, options = {}, enfants = []) {
  const element = creerElement(balise, options, enfants);
  element.style.cssText = css;
  return element;
}

/**
 * Lien de la signature.
 * @param {string} texte - Texte affiché.
 * @param {string} href - Adresse (déjà validée).
 * @param {string} couleur - Couleur du lien.
 * @returns {HTMLAnchorElement} Lien.
 */
function lien(texte, href, couleur) {
  return styler('a', `color:${couleur};text-decoration:none;`, { texte, attributs: { href } });
}

/**
 * Ligne de texte de la signature.
 * @param {Array<Node|string>} contenu - Contenu de la ligne.
 * @param {string} [style] - Styles en plus.
 * @returns {HTMLDivElement} Ligne.
 */
function ligne(contenu, style = '') {
  return styler('div', `font-family:${POLICE};font-size:13px;line-height:19px;color:${GRIS};${style}`, {}, contenu);
}

/**
 * Relie des éléments par un séparateur « · ».
 * @param {Array<Node>} morceaux - Éléments (les vides sont ignorés).
 * @returns {Array<Node|string>} Contenu de ligne.
 */
function relier(morceaux) {
  return morceaux.filter(Boolean).flatMap((m, i) => (i ? ['  ·  ', m] : [m]));
}

/**
 * Lien d'appel d'un numéro.
 * @param {string} prefixe - « M. », « T. »…
 * @param {string} numero - Numéro validé.
 * @param {string} couleur - Couleur du lien.
 * @returns {HTMLAnchorElement|null} Lien, ou null sans numéro.
 */
function telephone(prefixe, numero, couleur) {
  return numero ? lien(`${prefixe} ${numero}`, `tel:${numero.replace(/[^\d+]/g, '')}`, couleur) : null;
}

/**
 * Crée la signature d'une personne.
 * @param {object} personne - Personne à afficher (infos d'entreprise appliquées).
 * @param {{couleur:string, logo:string}} options - Couleur d'accent et logo (data URL, '' sans logo).
 * @returns {HTMLTableElement} Signature.
 */
export function creerSignature(personne, { couleur, logo }) {
  const infos = styler('td', `vertical-align:top;padding-left:${logo ? 16 : 0}px;${logo ? `border-left:2px solid ${couleur};` : ''}`, {}, [
    ligne([nomComplet(personne) || ' '], 'font-size:16px;line-height:22px;font-weight:bold;color:#14181f;'),
    personne.poste && ligne([personne.poste], `color:${couleur};font-weight:bold;`),
    personne.entreprise && ligne([personne.entreprise]),
    ligne(relier([
      telephone('M.', personne.telephoneMobile, GRIS), telephone('T.', personne.telephonePro, GRIS), telephone('Std.', personne.telephoneStandard, GRIS),
    ]), 'padding-top:6px;'),
    personne.email && ligne([lien(personne.email, `mailto:${personne.email}`, couleur)]),
    ligne(relier([
      personne.siteWeb && lien(urlLisible(personne.siteWeb), personne.siteWeb, couleur),
      personne.linkedin && lien('LinkedIn', personne.linkedin, couleur),
      personne.whatsapp && lien('WhatsApp', lienWhatsapp(personne.whatsapp), couleur),
      personne.rendezVous && lien('Prendre rendez-vous', personne.rendezVous, couleur),
    ])),
    valeurChamp(personne, 'adresse') && ligne([valeurChamp(personne, 'adresse')], 'font-size:12px;'),
  ].filter((e) => e && e.textContent.trim()));

  const cellules = [infos];
  if (logo) {
    cellules.unshift(styler('td', 'vertical-align:top;padding-right:16px;', {}, [
      styler('img', 'display:block;height:64px;width:auto;border:0;', { attributs: { src: logo, alt: personne.entreprise || 'Logo', height: 64 } }),
    ]));
  }
  return styler('table', 'border-collapse:collapse;', { attributs: { cellpadding: 0, cellspacing: 0, border: 0, role: 'presentation' } }, [
    creerElement('tbody', {}, [creerElement('tr', {}, cellules)]),
  ]);
}
