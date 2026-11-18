/**
 * Personne.js
 * Informations d'une personne (le contenu de sa carte) : liste des champs,
 * validation, valeurs calculées (nom complet, adresse…) et personne d'exemple
 * utilisée dans l'éditeur de modèles.
 */

import {
  nettoyerTexte, nettoyerTexteMultiligne, normaliserEmail, normaliserTelephone, normaliserUrl,
} from '../Utilitaires/Validation.js';

export const LIENS_MAX = 8;

// Champs saisissables, dans l'ordre du formulaire et de l'import CSV.
export const CHAMPS_PERSONNE = [
  { cle: 'prenom', libelle: 'Prénom', type: 'texte', max: 50 },
  { cle: 'nom', libelle: 'Nom', type: 'texte', max: 50 },
  { cle: 'poste', libelle: 'Poste', type: 'texte', max: 80 },
  { cle: 'entreprise', libelle: 'Entreprise', type: 'texte', max: 80 },
  { cle: 'telephoneMobile', libelle: 'Téléphone mobile', type: 'tel', max: 25 },
  { cle: 'telephonePro', libelle: 'Téléphone fixe', type: 'tel', max: 25 },
  { cle: 'email', libelle: 'E-mail', type: 'email', max: 254 },
  { cle: 'siteWeb', libelle: 'Site web', type: 'url', max: 300 },
  { cle: 'rue', libelle: 'Adresse', type: 'texte', max: 100 },
  { cle: 'codePostal', libelle: 'Code postal', type: 'texte', max: 15 },
  { cle: 'ville', libelle: 'Ville', type: 'texte', max: 60 },
  { cle: 'pays', libelle: 'Pays', type: 'texte', max: 60 },
  { cle: 'note', libelle: 'Note', type: 'multiligne', max: 300 },
];

// Champs utilisables dans un élément texte du modèle.
export const CHAMPS_AFFICHABLES = [
  ['nomComplet', 'Prénom + nom'], ['prenom', 'Prénom'], ['nom', 'Nom'], ['poste', 'Poste'],
  ['entreprise', 'Entreprise'], ['telephoneMobile', 'Téléphone mobile'], ['telephonePro', 'Téléphone fixe'],
  ['email', 'E-mail'], ['siteWeb', 'Site web'], ['adresse', 'Adresse complète'], ['rue', 'Rue'],
  ['villeComplete', 'Code postal + ville'], ['pays', 'Pays'], ['note', 'Note'], ['liens', 'Liens (noms)'],
];

/**
 * Crée une personne vide.
 * @returns {object} Personne avec tous les champs vides.
 */
export function personneVide() {
  const personne = { liens: [] };
  CHAMPS_PERSONNE.forEach(({ cle }) => { personne[cle] = ''; });
  return personne;
}

/**
 * Nettoie la valeur d'un champ selon son type.
 * @param {object} champ - Description du champ.
 * @param {unknown} valeur - Valeur brute.
 * @returns {string} Valeur nettoyée (vide si invalide).
 */
export function normaliserChamp(champ, valeur) {
  switch (champ.type) {
    case 'email': return normaliserEmail(valeur);
    case 'tel': return normaliserTelephone(valeur);
    case 'url': return normaliserUrl(valeur);
    case 'multiligne': return nettoyerTexteMultiligne(valeur, champ.max);
    default: return nettoyerTexte(valeur, champ.max);
  }
}

/**
 * Nettoie un lien personnalisé.
 * @param {unknown} lien - Objet { libelle, url } brut.
 * @returns {{libelle:string, url:string}|null} Lien valide ou null.
 */
export function normaliserLien(lien) {
  if (!lien || typeof lien !== 'object') return null;
  const url = normaliserUrl(lien.url);
  if (!url) return null;
  return { libelle: nettoyerTexte(lien.libelle, 30) || new URL(url).hostname, url };
}

/**
 * Normalise une personne (formulaire, import CSV ou serveur).
 * @param {unknown} brut - Données brutes non fiables.
 * @returns {object} Personne propre.
 */
export function normaliserPersonne(brut) {
  const source = brut && typeof brut === 'object' ? brut : {};
  const personne = personneVide();
  CHAMPS_PERSONNE.forEach((champ) => { personne[champ.cle] = normaliserChamp(champ, source[champ.cle]); });
  personne.liens = (Array.isArray(source.liens) ? source.liens : []).map(normaliserLien).filter(Boolean).slice(0, LIENS_MAX);
  return personne;
}

/**
 * Renvoie le nom complet (prénom + nom).
 * @param {object} personne - Personne normalisée.
 * @returns {string} Nom complet.
 */
export function nomComplet(personne) {
  return [personne.prenom, personne.nom].filter(Boolean).join(' ');
}

/**
 * Raccourcit une URL pour l'affichage (sans https:// ni / final).
 * @param {string} url - URL complète.
 * @returns {string} URL lisible.
 */
export function urlLisible(url) {
  return String(url).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

/**
 * Calcule la valeur d'un champ affichable (y compris les champs calculés).
 * @param {object} personne - Personne normalisée.
 * @param {string} champ - Clé d'un champ de CHAMPS_AFFICHABLES.
 * @returns {string} Texte à afficher.
 */
export function valeurChamp(personne, champ) {
  const villeComplete = [personne.codePostal, personne.ville].filter(Boolean).join(' ');
  switch (champ) {
    case 'nomComplet': return nomComplet(personne);
    case 'siteWeb': return personne.siteWeb ? urlLisible(personne.siteWeb) : '';
    case 'villeComplete': return villeComplete;
    case 'adresse': return [personne.rue, villeComplete, personne.pays].filter(Boolean).join(', ');
    case 'liens': return personne.liens.map((l) => l.libelle).join(' · ');
    default: return typeof personne[champ] === 'string' ? personne[champ] : '';
  }
}

// Personne fictive affichée dans l'éditeur de modèles.
export const PERSONNE_EXEMPLE = Object.freeze(normaliserPersonne({
  prenom: 'Camille', nom: 'Durand', poste: 'Responsable commerciale', entreprise: 'Entreprise Exemple',
  telephoneMobile: '06 12 34 56 78', telephonePro: '01 23 45 67 89', email: 'camille.durand@exemple.fr',
  siteWeb: 'exemple.fr', rue: '12 rue des Lilas', codePostal: '75011', ville: 'Paris', pays: 'France',
  liens: [{ libelle: 'LinkedIn', url: 'https://linkedin.com/in/exemple' }],
}));
