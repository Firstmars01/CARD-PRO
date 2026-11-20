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

// Icône de chaque information (clés de IconesCarte.js). Nom, prénom et poste n'en ont pas.
export const ICONES_SIGNATURE = {
  entreprise: 'entreprise', mobile: 'mobile', support: 'telephone', email: 'email', site: 'web',
  linkedin: 'mallette', whatsapp: 'message', rendezVous: 'calendrier', adresse: 'adresse',
};

/**
 * Ligne d'information précédée de son icône.
 * @param {string} icone - Data URL de l'icône ('' : pas d'icône).
 * @param {Node|string} contenu - Texte ou lien.
 * @param {string} [style] - Styles en plus.
 * @returns {HTMLDivElement} Ligne.
 */
function ligneIcone(icone, contenu, style = '') {
  const image = icone && styler('img', 'width:14px;height:14px;vertical-align:-2px;margin-right:7px;border:0;', { attributs: { src: icone, width: 14, height: 14, alt: '' } });
  return ligne([image, contenu], style);
}

/**
 * Lien d'appel d'un numéro.
 * @param {string} numero - Numéro validé.
 * @param {string} couleur - Couleur du lien.
 * @returns {HTMLAnchorElement} Lien.
 */
function telephone(numero, couleur) {
  return lien(numero, `tel:${numero.replace(/[^\d+]/g, '')}`, couleur);
}

/**
 * Crée la signature d'une personne.
 * @param {object} personne - Personne à afficher (infos d'entreprise appliquées).
 * @param {{couleur:string, image:string, icones:Object<string, string>}} options - Couleur d'accent,
 *   image de gauche (photo ronde ou logo, '' sans image) et icônes PNG (vides : sans icônes).
 * @returns {HTMLTableElement} Signature.
 */
export function creerSignature(personne, { couleur, image, icones }) {
  const ic = (cle) => icones[ICONES_SIGNATURE[cle]] || '';
  const adresse = valeurChamp(personne, 'adresse');
  const details = [
    personne.entreprise && ligneIcone(ic('entreprise'), personne.entreprise),
    personne.telephoneMobile && ligneIcone(ic('mobile'), telephone(personne.telephoneMobile, GRIS)),
    personne.telephoneSupport && ligneIcone(ic('support'), telephone(personne.telephoneSupport, GRIS)),
    personne.email && ligneIcone(ic('email'), lien(personne.email, `mailto:${personne.email}`, couleur)),
    personne.siteWeb && ligneIcone(ic('site'), lien(urlLisible(personne.siteWeb), personne.siteWeb, couleur)),
    personne.linkedin && ligneIcone(ic('linkedin'), lien('LinkedIn', personne.linkedin, couleur)),
    personne.whatsapp && ligneIcone(ic('whatsapp'), lien('WhatsApp', lienWhatsapp(personne.whatsapp), couleur)),
    personne.rendezVous && ligneIcone(ic('rendezVous'), lien('Prendre rendez-vous', personne.rendezVous, couleur)),
    adresse && ligneIcone(ic('adresse'), adresse, 'font-size:12px;'),
  ].filter(Boolean);

  const infos = styler('td', `vertical-align:top;padding-left:${image ? 16 : 0}px;${image ? `border-left:2px solid ${couleur};` : ''}`, {}, [
    ligne([nomComplet(personne) || ' '], 'font-size:16px;line-height:22px;font-weight:bold;color:#14181f;'),
    personne.poste && ligne([personne.poste], `color:${couleur};font-weight:bold;padding-bottom:6px;`),
    ...details,
  ].filter((e) => e && e.textContent.trim()));

  const cellules = [infos];
  if (image) {
    cellules.unshift(styler('td', 'vertical-align:top;padding-right:16px;', {}, [
      styler('img', 'display:block;height:72px;width:auto;border:0;', { attributs: { src: image, alt: '', height: 72 } }),
    ]));
  }
  return styler('table', 'border-collapse:collapse;', { attributs: { cellpadding: 0, cellspacing: 0, border: 0, role: 'presentation' } }, [
    creerElement('tbody', {}, [creerElement('tr', {}, cellules)]),
  ]);
}
