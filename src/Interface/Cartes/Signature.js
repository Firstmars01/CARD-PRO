/**
 * Signature.js
 * Construit la signature e-mail d'une personne (pour Outlook) selon ses
 * réglages : un tableau HTML aux styles intégrés, compris par les logiciels
 * de messagerie (image à gauche, infos avec icônes, réseaux, texte libre).
 * Tout est créé avec le DOM (textContent) : aucun texte n'est interprété
 * comme du HTML. Les liens viennent de valeurs déjà validées
 * (http/https, tel:, mailto:). Les styles sont posés par le CSSOM
 * (element.style), compatible avec la politique de sécurité de la page,
 * et se retrouvent dans le HTML copié.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { nomComplet, urlLisible, valeurChamp, lienWhatsapp } from '../../Metier/Personne.js';

const GRIS = '#5d6675';

// Icône de chaque information (clés de IconesCarte.js). Nom et poste n'en ont pas.
export const ICONES_SIGNATURE = {
  entreprise: 'entreprise', mobile: 'mobile', support: 'telephone', email: 'email', site: 'web', adresse: 'adresse',
  linkedin: 'mallette', whatsapp: 'message', rendezVous: 'calendrier', lien: 'lien', photo: 'photo', video: 'video', code: 'code', partage: 'partage',
};

// Icône d'un lien personnalisé selon son nom.
const ICONES_LIENS = [[/insta/i, 'photo'], [/you ?tube|vim[eé]o/i, 'video'], [/git/i, 'code'], [/facebook|^x$|twitter|tiktok/i, 'partage']];

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
 * @param {Node|string} contenu - Texte ou image.
 * @param {string} href - Adresse (déjà validée).
 * @param {string} couleur - Couleur du lien.
 * @param {string} [titre] - Info-bulle.
 * @returns {HTMLAnchorElement} Lien.
 */
function lien(contenu, href, couleur, titre) {
  return styler('a', `color:${couleur};text-decoration:none;`, { attributs: { href, title: titre } }, [contenu]);
}

/**
 * Petite image de la signature.
 * @param {string} src - Data URL (PNG).
 * @param {number} taille - Côté en pixels.
 * @param {string} css - Styles en plus.
 * @param {string} [alt] - Texte alternatif.
 * @returns {HTMLImageElement|null} Image, ou null sans source.
 */
function image(src, taille, css, alt = '') {
  return src ? styler('img', `width:${taille}px;height:${taille}px;border:0;${css}`, { attributs: { src, width: taille, height: taille, alt } }) : null;
}

/**
 * Lien d'appel d'un numéro.
 * @param {string} numero - Numéro validé.
 * @returns {HTMLAnchorElement} Lien.
 */
function telephone(numero) {
  return lien(numero, `tel:${numero.replace(/[^\d+]/g, '')}`, GRIS);
}

/**
 * Liens « réseaux » de la personne, sous forme d'icônes.
 * @param {object} personne - Personne à afficher.
 * @returns {{icone:string, href:string, titre:string}[]} Liens disponibles.
 */
function liensReseaux(personne) {
  return [
    personne.linkedin && { icone: 'linkedin', href: personne.linkedin, titre: 'LinkedIn' },
    personne.whatsapp && { icone: 'whatsapp', href: lienWhatsapp(personne.whatsapp), titre: 'WhatsApp' },
    personne.rendezVous && { icone: 'rendezVous', href: personne.rendezVous, titre: 'Prendre rendez-vous' },
    ...personne.liens.map((l) => ({ icone: ICONES_LIENS.find(([motif]) => motif.test(l.libelle))?.[1] || 'lien', href: l.url, titre: l.libelle })),
  ].filter(Boolean);
}

/**
 * Crée la signature d'une personne.
 * @param {object} personne - Personne à afficher (infos d'entreprise appliquées).
 * @param {object} reglages - Réglages résolus : couleur, couleurTexte, police (pile CSS),
 *   tailles {nom, infos}, image et imageDroite (data URL, '' sans image), tailleImage, icones (clé → PNG, vide sans icônes),
 *   afficherEntreprise…afficherAdresse, reseaux, texteLibre.
 * @returns {HTMLTableElement} Signature.
 */
export function creerSignature(personne, reglages) {
  const r = reglages;
  const police = `font-family:${r.police};`;
  const ligne = (contenu, css = '') => styler('div', `${police}font-size:${r.tailles.infos}px;line-height:${r.tailles.infos + 6}px;color:${GRIS};${css}`, {}, contenu);
  const ic = (cle) => image(r.icones[ICONES_SIGNATURE[cle]], r.tailles.infos + 1, 'vertical-align:-2px;margin-right:7px;');
  const adresse = valeurChamp(personne, 'adresse');
  const reseaux = r.reseaux ? liensReseaux(personne) : [];

  const contenu = [
    ligne([nomComplet(personne) || ' '], `font-size:${r.tailles.nom}px;line-height:${r.tailles.nom + 6}px;font-weight:bold;color:${r.couleurTexte};`),
    personne.poste && ligne([personne.poste], `color:${r.couleur};font-weight:bold;padding-bottom:6px;`),
    r.afficherEntreprise && personne.entreprise && ligne([ic('entreprise'), personne.entreprise]),
    r.afficherMobile && personne.telephoneMobile && ligne([ic('mobile'), telephone(personne.telephoneMobile)]),
    r.afficherSupport && personne.telephoneSupport && ligne([ic('support'), telephone(personne.telephoneSupport)]),
    r.afficherEmail && personne.email && ligne([ic('email'), lien(personne.email, `mailto:${personne.email}`, r.couleur)]),
    r.afficherSite && personne.siteWeb && ligne([ic('site'), lien(urlLisible(personne.siteWeb), personne.siteWeb, r.couleur)]),
    r.afficherAdresse && adresse && ligne([ic('adresse'), adresse]),
    reseaux.length && ligne(reseaux.flatMap((l, i) => {
      // Icône cliquable, ou nom du lien (séparé par « · ») si les icônes sont désactivées.
      const icone = image(r.icones[ICONES_SIGNATURE[l.icone]] || '', r.tailles.infos + 5, 'margin-right:9px;', l.titre);
      const element = lien(icone || l.titre, l.href, r.couleur, l.titre);
      return icone || i === 0 ? [element] : ['  ·  ', element];
    }), 'padding-top:6px;'),
    ...r.texteLibre.split('\n').filter((t) => t.trim()).map((t, i) => ligne([t], `font-size:${r.tailles.infos - 1}px;${i === 0 ? 'padding-top:8px;' : ''}`)),
  ].filter((e) => e && e.textContent !== undefined && (e.textContent.trim() || e.querySelector('img')));

  const avecImage = Boolean(r.image);
  const infos = styler('td', `vertical-align:top;padding-left:${avecImage ? 16 : 0}px;${avecImage ? `border-left:2px solid ${r.couleur};` : ''}`, {}, contenu);
  const cellules = [infos];
  if (avecImage) {
    cellules.unshift(styler('td', 'vertical-align:middle;padding-right:16px;', {}, [
      styler('img', `display:block;height:${r.tailleImage}px;width:auto;border:0;`, { attributs: { src: r.image, alt: '', height: r.tailleImage } }),
    ]));
  }
  // Logo à droite (quand la photo est à gauche).
  if (r.imageDroite) {
    cellules.push(styler('td', 'vertical-align:middle;padding-left:20px;', {}, [
      styler('img', `display:block;height:${r.tailleImage}px;width:auto;border:0;`, { attributs: { src: r.imageDroite, alt: '', height: r.tailleImage } }),
    ]));
  }
  return styler('table', 'border-collapse:collapse;', { attributs: { cellpadding: 0, cellspacing: 0, border: 0, role: 'presentation' } }, [
    creerElement('tbody', {}, [creerElement('tr', {}, cellules)]),
  ]);
}
