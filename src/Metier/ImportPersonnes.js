/**
 * ImportPersonnes.js
 * Transforme les lignes d'un fichier CSV (Excel) en personnes, en
 * reconnaissant les noms de colonnes courants, et fournit le modèle de
 * fichier à remplir.
 */

import { CHAMPS_PERSONNE, normaliserPersonne, nomComplet } from './Personne.js';

export const IMPORT_MAX = 500;

// Noms de colonnes acceptés pour chaque champ (sans accents, en minuscules).
const ALIAS = {
  prenom: ['prenom', 'first name', 'firstname'],
  nom: ['nom', 'nom de famille', 'last name', 'lastname'],
  poste: ['poste', 'fonction', 'titre', 'job', 'title'],
  entreprise: ['entreprise', 'societe', 'organisation', 'company'],
  telephoneMobile: ['telephone mobile', 'mobile', 'portable', 'tel mobile', 'gsm'],
  telephoneSupport: ['support', 'telephone support', 'standard', 'telephone standard', 'accueil', 'telephone fixe', 'fixe', 'telephone', 'tel', 'telephone pro', 'ligne directe'],
  whatsapp: ['whatsapp', 'whatsapp (numero)', 'numero whatsapp'],
  email: ['e-mail', 'email', 'mail', 'courriel'],
  siteWeb: ['site web', 'site', 'web', 'url', 'site internet'],
  linkedin: ['linkedin', 'profil linkedin'],
  linkedinEntreprise: ["linkedin de l'entreprise", 'linkedin entreprise', 'linkedin societe'],
  rendezVous: ['prise de rendez-vous (lien)', 'prise de rendez-vous', 'rendez-vous', 'rendez vous', 'rdv', 'calendly'],
  rue: ['adresse', 'rue', 'address'],
  codePostal: ['code postal', 'cp', 'zip'],
  ville: ['ville', 'city'],
  pays: ['pays', 'country'],
  note: ['note', 'notes', 'commentaire'],
};

/**
 * Simplifie un nom de colonne (minuscules, sans accents ni ponctuation).
 * @param {string} texte - Nom de colonne.
 * @returns {string} Nom simplifié.
 */
function simplifier(texte) {
  return String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[_.]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Associe chaque colonne du fichier à un champ de la personne.
 * @param {string[]} entetes - Première ligne du fichier.
 * @returns {(string|null)[]} Champ par colonne (null = colonne ignorée).
 */
function associerColonnes(entetes) {
  return entetes.map((entete) => {
    const simple = simplifier(entete);
    const champ = Object.entries(ALIAS).find(([cle, alias]) => simple === simplifier(cle) || alias.includes(simple));
    return champ ? champ[0] : null;
  });
}

/**
 * Convertit les lignes d'un CSV en personnes validées.
 * @param {string[][]} lignes - Lignes du fichier (la première contient les en-têtes).
 * @returns {{personnes:object[], colonnesIgnorees:string[]}} Résultat.
 * @throws {Error} Si le fichier est vide, sans colonne reconnue ou trop long.
 */
export function convertirLignes(lignes) {
  if (lignes.length < 2) throw new Error('Le fichier ne contient aucune personne (1re ligne = en-têtes).');
  const [entetes, ...donnees] = lignes;
  if (donnees.length > IMPORT_MAX) throw new Error(`Maximum ${IMPORT_MAX} personnes par import.`);
  const colonnes = associerColonnes(entetes);
  if (!colonnes.some(Boolean)) throw new Error('Aucune colonne reconnue. Utilise le fichier modèle.');

  const personnes = donnees
    .map((ligne) => {
      const brut = {};
      colonnes.forEach((champ, i) => { if (champ) brut[champ] = ligne[i] ?? ''; });
      return normaliserPersonne(brut);
    })
    .filter((p) => nomComplet(p) || p.email || p.entreprise);
  return { personnes, colonnesIgnorees: entetes.filter((_, i) => !colonnes[i]) };
}

/**
 * Lignes du fichier modèle à remplir (en-têtes + un exemple).
 * @returns {string[][]} Lignes CSV.
 */
export function lignesFichierModele() {
  return [
    CHAMPS_PERSONNE.map((c) => c.libelle),
    ['Camille', 'Durand', 'Responsable commerciale', 'Entreprise Exemple', '06 12 34 56 78', '01 23 45 67 89',
      'camille.durand@exemple.fr', 'exemple.fr', '12 rue des Lilas', '75011', 'Paris', 'France', ''],
  ];
}
