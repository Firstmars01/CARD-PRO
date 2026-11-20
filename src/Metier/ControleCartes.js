/**
 * ControleCartes.js
 * Contrôle avant export : repère les cartes à vérifier (nom manquant, aucun
 * moyen de contact, doublons, QR trop chargé, texte coupé ou très réduit).
 * Les valeurs invalides (numéro, e-mail, lien) sont déjà refusées à la
 * saisie ; ce contrôle porte sur ce qui reste valide mais douteux.
 */

import { nomComplet } from './Personne.js';
import { texteElement } from './Elements.js';
import { familleCss } from './Polices.js';
import { genererQrPersonne } from './ContenuQr.js';
import { ajusterTexte } from '../Utilitaires/MesureTexte.js';

// En dessous de 70 % de sa taille, un texte rétréci est signalé.
const REDUCTION_SIGNALEE = 0.7;

/**
 * Vérifie que les textes de la carte tiennent dans leur zone.
 * @param {object} modele - Modèle à afficher.
 * @param {object} personne - Personne à afficher.
 * @returns {string[]} Problèmes trouvés.
 */
function controlerTextes(modele, personne) {
  const problemes = [];
  ['recto', 'verso'].forEach((cote) => modele[cote].elements
    .filter((e) => e.type === 'texte' && e.visible && !e.vertical)
    .forEach((el) => {
      const texte = texteElement(el, personne);
      if (!texte) return;
      const style = { taille: el.taille, police: familleCss(el.police), graisse: el.graisse, italique: el.italique, espacement: el.espacement, interligne: el.interligne };
      const { lignes, taille } = ajusterTexte(texte, el, style);
      if (lignes.some((l) => l.endsWith('…'))) problemes.push(`Texte coupé au ${cote} : « ${texte} ».`);
      else if (taille < el.taille * REDUCTION_SIGNALEE) problemes.push(`Texte très réduit au ${cote} : « ${texte} ».`);
    }));
  return problemes;
}

/**
 * Compte les occurrences d'une clé (pour trouver les doublons).
 * @param {object[]} cartes - Cartes.
 * @param {Function} cle - Calcule la clé d'une carte ('' = ignorée).
 * @returns {Map<string, number>} Nombre de cartes par clé.
 */
function compter(cartes, cle) {
  const compte = new Map();
  cartes.forEach((c) => {
    const valeur = cle(c);
    if (valeur) compte.set(valeur, (compte.get(valeur) || 0) + 1);
  });
  return compte;
}

/**
 * Contrôle une liste de cartes.
 * @param {{id:string, modele:object, personne:object}[]} cartes - Cartes telles qu'elles s'affichent.
 * @returns {{id:string, nom:string, problemes:string[]}[]} Cartes à vérifier (vide si tout va bien).
 */
export function controlerCartes(cartes) {
  const cleNom = (c) => nomComplet(c.personne).toLocaleLowerCase('fr');
  const cleEmail = (c) => c.personne.email.toLowerCase();
  const noms = compter(cartes, cleNom);
  const emails = compter(cartes, cleEmail);

  return cartes.map((carte) => {
    const { personne, modele } = carte;
    const problemes = [];
    if (!nomComplet(personne)) problemes.push('Prénom et nom vides.');
    if (!personne.telephoneMobile && !personne.telephoneSupport && !personne.email) {
      problemes.push('Aucun téléphone ni e-mail.');
    }
    if (noms.get(cleNom(carte)) > 1) problemes.push('Même nom qu’une autre carte (doublon ?).');
    if (emails.get(cleEmail(carte)) > 1) problemes.push('Même e-mail qu’une autre carte (doublon ?).');
    problemes.push(...genererQrPersonne(personne).avertissements, ...controlerTextes(modele, personne));
    return { id: carte.id, nom: nomComplet(personne) || 'Sans nom', problemes };
  }).filter((r) => r.problemes.length);
}
