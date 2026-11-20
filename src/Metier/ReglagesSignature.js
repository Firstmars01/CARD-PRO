/**
 * ReglagesSignature.js
 * Réglages de la signature e-mail : couleurs (celles de la carte ou au choix),
 * police, taille, image à gauche, icônes, infos affichées, réseaux et texte
 * libre. Ils sont partagés par toutes les cartes d'une entreprise, ou propres
 * à une carte en réglage personnalisé. Le schéma sert à la validation et à
 * la génération du formulaire.
 */

import { normaliserObjet } from '../Utilitaires/Schema.js';

// Polices affichées partout (Outlook, Gmail, téléphones) : [clé, libellé, pile CSS].
export const POLICES_SIGNATURE = [
  ['arial', 'Arial', 'Arial, Helvetica, sans-serif'],
  ['verdana', 'Verdana', 'Verdana, Geneva, sans-serif'],
  ['tahoma', 'Tahoma', 'Tahoma, Geneva, sans-serif'],
  ['trebuchet', 'Trebuchet MS', "'Trebuchet MS', Helvetica, sans-serif"],
  ['georgia', 'Georgia', 'Georgia, Times, serif'],
];

// Tailles du texte : [clé, libellé, taille du nom, taille des infos] (pixels).
export const TAILLES_SIGNATURE = [
  ['petite', 'Petite', 15, 12],
  ['normale', 'Normale', 16, 13],
  ['grande', 'Grande', 18, 14],
];

const COULEURS_LIBRES = (r) => !r.couleursCarte;
const AVEC_IMAGE = (r) => r.image !== 'aucune';

export const SCHEMA_SIGNATURE = [
  { cle: 'couleursCarte', type: 'booleen', libelle: 'Reprendre les couleurs de la carte', groupe: 'Couleurs et texte' },
  { cle: 'couleur', type: 'couleur', libelle: 'Couleur principale (poste, liens, icônes)', groupe: 'Couleurs et texte', visibleSi: COULEURS_LIBRES },
  { cle: 'couleurTexte', type: 'couleur', libelle: 'Couleur du nom', groupe: 'Couleurs et texte', visibleSi: COULEURS_LIBRES },
  { cle: 'police', type: 'choix', libelle: 'Police', groupe: 'Couleurs et texte', options: POLICES_SIGNATURE.map(([c, l]) => [c, l]) },
  { cle: 'taille', type: 'choix', libelle: 'Taille du texte', groupe: 'Couleurs et texte', options: TAILLES_SIGNATURE.map(([c, l]) => [c, l]) },
  { cle: 'image', type: 'choix', libelle: 'Image à gauche', groupe: 'Image', options: [['logo', 'Logo'], ['photo', 'Photo de profil (ronde)'], ['aucune', 'Aucune']] },
  { cle: 'tailleImage', type: 'plage', libelle: "Hauteur de l'image (px)", groupe: 'Image', min: 40, max: 140, visibleSi: AVEC_IMAGE },
  { cle: 'icones', type: 'booleen', libelle: 'Icônes devant les infos', groupe: 'Infos affichées' },
  { cle: 'afficherEntreprise', type: 'booleen', libelle: 'Entreprise', groupe: 'Infos affichées' },
  { cle: 'afficherMobile', type: 'booleen', libelle: 'Mobile', groupe: 'Infos affichées' },
  { cle: 'afficherSupport', type: 'booleen', libelle: 'Support', groupe: 'Infos affichées' },
  { cle: 'afficherEmail', type: 'booleen', libelle: 'E-mail', groupe: 'Infos affichées' },
  { cle: 'afficherSite', type: 'booleen', libelle: 'Site web', groupe: 'Infos affichées' },
  { cle: 'afficherAdresse', type: 'booleen', libelle: 'Adresse', groupe: 'Infos affichées' },
  { cle: 'reseaux', type: 'booleen', libelle: 'Réseaux (LinkedIn, WhatsApp, rendez-vous, liens) en petites icônes', groupe: 'Infos affichées' },
  { cle: 'texteLibre', type: 'texte', libelle: 'Texte libre en bas (slogan, mention…)', groupe: 'Texte libre', max: 300, multiligne: true },
];

export const SIGNATURE_PAR_DEFAUT = Object.freeze({
  couleursCarte: true, couleur: '#2563eb', couleurTexte: '#14181f', police: 'arial', taille: 'normale',
  image: 'logo', tailleImage: 72, icones: true,
  afficherEntreprise: false, afficherMobile: true, afficherSupport: true, afficherEmail: true, afficherSite: true, afficherAdresse: true,
  reseaux: true, texteLibre: '',
});

/**
 * Valide des réglages de signature (formulaire, serveur, sauvegarde).
 * @param {unknown} brut - Réglages non fiables.
 * @returns {object} Réglages propres (valeurs par défaut si absents).
 */
export function normaliserReglagesSignature(brut) {
  return normaliserObjet(SCHEMA_SIGNATURE, brut, SIGNATURE_PAR_DEFAUT);
}

/**
 * Pile CSS d'une police de signature.
 * @param {string} cle - Clé de la police.
 * @returns {string} font-family.
 */
export function policeSignature(cle) {
  return (POLICES_SIGNATURE.find(([c]) => c === cle) || POLICES_SIGNATURE[0])[2];
}

/**
 * Tailles du texte de la signature.
 * @param {string} cle - Clé de la taille.
 * @returns {{nom:number, infos:number}} Tailles en pixels.
 */
export function tailleSignature(cle) {
  const [, , nom, infos] = TAILLES_SIGNATURE.find(([c]) => c === cle) || TAILLES_SIGNATURE[1];
  return { nom, infos };
}
