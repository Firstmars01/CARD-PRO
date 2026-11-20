/**
 * EtatApplication.js
 * État central de l'application : la liste des personnes (une carte
 * chacune), les modèles enregistrés et les entreprises. Les composants
 * s'abonnent aux changements ; les modifications sont envoyées au serveur.
 */

import { normaliserPersonne, personneVide } from './Personne.js';
import { normaliserModele, estModeleDeBase } from './ModeleCarte.js';
import { normaliserEntreprise, appliquerEntreprisePersonne, appliquerEntrepriseModele } from './Entreprise.js';
import { MODELES_DE_BASE } from './ModelesDeBase.js';
import { idValide } from '../Utilitaires/Schema.js';
import * as DepotPersonnes from '../Donnees/DepotPersonnes.js';
import * as DepotModeles from '../Donnees/DepotModeles.js';
import * as DepotEntreprises from '../Donnees/DepotEntreprises.js';

const DELAI_SAUVEGARDE = 700;

const etat = { personnes: [], modeles: [], entreprises: [] };
const abonnes = new Set();
const minuteries = new Map();
let surErreur = () => {};

/**
 * Valide une entrée personne reçue du serveur.
 * @param {object} entree - { id, modeleId, entrepriseId, personne }.
 * @returns {{id:string, modeleId:string, entrepriseId:string, personne:object}|null} Entrée propre.
 */
function normaliserEntree(entree) {
  if (!idValide(entree?.id)) return null;
  return {
    id: entree.id,
    modeleId: idValide(entree.modeleId) ? entree.modeleId : MODELES_DE_BASE[0].id,
    entrepriseId: idValide(entree.entrepriseId) ? entree.entrepriseId : '',
    personne: normaliserPersonne(entree.personne),
  };
}

/**
 * Charge les personnes et les modèles depuis le serveur.
 * @param {Function} [surErreurSauvegarde] - Appelée si une sauvegarde échoue.
 * @returns {Promise<void>}
 */
export async function chargerDonnees(surErreurSauvegarde) {
  if (surErreurSauvegarde) surErreur = surErreurSauvegarde;
  const [personnes, modeles, entreprises] = await Promise.all([
    DepotPersonnes.listerPersonnes(), DepotModeles.listerModeles(), DepotEntreprises.listerEntreprises(),
  ]);
  etat.personnes = personnes.map(normaliserEntree).filter(Boolean);
  etat.modeles = modeles.map(normaliserModele).filter((m) => !estModeleDeBase(m));
  etat.entreprises = entreprises.map(normaliserEntreprise).filter(Boolean);
  // Sauvegarde immédiate si l'utilisateur quitte ou change d'onglet.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sauvegarderTout().catch(() => {});
  });
}

/**
 * Renvoie l'état courant (à ne pas modifier directement).
 * @returns {{personnes:object[], modeles:object[], entreprises:object[]}} État.
 */
export function obtenirEtat() {
  return etat;
}

/**
 * Abonne une fonction aux changements ("personnes", "personne", "modeles", "entreprises").
 * @param {Function} rappel - Reçoit le type de changement et l'id concerné.
 * @returns {Function} Fonction pour se désabonner.
 */
export function abonner(rappel) {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

/**
 * Prévient les abonnés d'un changement.
 * @param {string} type - Type de changement.
 * @param {string} [id] - Identifiant concerné.
 */
function notifier(type, id) {
  abonnes.forEach((rappel) => rappel(type, id));
}

/**
 * Renvoie tous les modèles disponibles (de base puis enregistrés).
 * @returns {object[]} Modèles.
 */
export function tousLesModeles() {
  return [...MODELES_DE_BASE, ...etat.modeles];
}

/**
 * Cherche un modèle par son identifiant.
 * @param {string} id - Identifiant.
 * @returns {object} Modèle trouvé, ou le premier modèle de base.
 */
export function trouverModele(id) {
  return tousLesModeles().find((m) => m.id === id) || MODELES_DE_BASE[0];
}

/**
 * Cherche une personne par son identifiant.
 * @param {string} id - Identifiant.
 * @returns {object|undefined} Entrée { id, modeleId, personne }.
 */
export function trouverPersonne(id) {
  return etat.personnes.find((p) => p.id === id);
}

/**
 * Cherche une entreprise par son identifiant.
 * @param {string} id - Identifiant ('' : aucune).
 * @returns {object|null} Entreprise, ou null.
 */
export function trouverEntreprise(id) {
  return (id && etat.entreprises.find((e) => e.id === id)) || null;
}

/**
 * Carte telle qu'elle s'affiche : modèle et informations, avec ceux de
 * l'entreprise reliée (infos communes et logo). Utilisée par l'aperçu
 * et par tous les exports.
 * @param {{modeleId:string, entrepriseId:string, personne:object}} entree - Carte.
 * @returns {{modele:object, personne:object}} Modèle et personne à afficher.
 */
export function carteEffective(entree) {
  const entreprise = trouverEntreprise(entree.entrepriseId);
  return {
    modele: appliquerEntrepriseModele(trouverModele(entree.modeleId), entreprise),
    personne: appliquerEntreprisePersonne(entree.personne, entreprise),
  };
}

/**
 * Ajoute une personne vide.
 * @param {string} modeleId - Modèle de sa carte.
 * @param {string} [entrepriseId] - Entreprise reliée ('' : réglage personnalisé).
 * @returns {Promise<object>} Entrée créée.
 */
export async function ajouterPersonne(modeleId, entrepriseId = '') {
  const entree = normaliserEntree(await DepotPersonnes.creerPersonne(personneVide(), modeleId, entrepriseId));
  etat.personnes.push(entree);
  notifier('personnes');
  return entree;
}

/**
 * Ajoute une personne déjà remplie (import d'une carte).
 * @param {object} personne - Personne (revalidée par le serveur).
 * @param {string} modeleId - Modèle de sa carte.
 * @returns {Promise<object>} Entrée créée.
 */
export async function ajouterPersonneRemplie(personne, modeleId) {
  const entree = normaliserEntree(await DepotPersonnes.creerPersonne(normaliserPersonne(personne), modeleId));
  etat.personnes.push(entree);
  notifier('personnes');
  return entree;
}

/**
 * Remplace les informations et le modèle d'une personne, enregistrés tout de suite.
 * @param {string} id - Identifiant.
 * @param {object} personne - Nouvelles informations.
 * @param {string} modeleId - Modèle de sa carte.
 * @returns {Promise<void>}
 */
export async function remplacerPersonne(id, personne, modeleId) {
  modifierPersonne(id, { personne, modeleId });
  await sauvegarderPersonne(id);
  notifier('personnes');
}

/**
 * Modifie une personne (sauvegarde différée, regroupe les frappes).
 * @param {string} id - Identifiant.
 * @param {{personne?:object, modeleId?:string, entrepriseId?:string}} modifications - Changements
 *   (entrepriseId '' : réglage personnalisé).
 */
export function modifierPersonne(id, modifications) {
  const entree = trouverPersonne(id);
  if (!entree) return;
  if (modifications.personne) entree.personne = normaliserPersonne(modifications.personne);
  if (modifications.modeleId && idValide(modifications.modeleId)) entree.modeleId = modifications.modeleId;
  if (modifications.entrepriseId === '' || trouverEntreprise(modifications.entrepriseId)) entree.entrepriseId = modifications.entrepriseId;
  notifier('personne', id);
  clearTimeout(minuteries.get(id));
  minuteries.set(id, setTimeout(() => sauvegarderPersonne(id).catch(() => surErreur()), DELAI_SAUVEGARDE));
}

/**
 * Envoie immédiatement une personne au serveur.
 * @param {string} id - Identifiant.
 * @returns {Promise<void>}
 */
async function sauvegarderPersonne(id) {
  clearTimeout(minuteries.get(id));
  minuteries.delete(id);
  const entree = trouverPersonne(id);
  if (entree) await DepotPersonnes.modifierPersonne(entree);
}

/**
 * Envoie toutes les modifications en attente.
 * @returns {Promise<void>}
 */
export async function sauvegarderTout() {
  await Promise.all(Array.from(minuteries.keys(), sauvegarderPersonne));
}

/**
 * Supprime une personne.
 * @param {string} id - Identifiant.
 * @returns {Promise<void>}
 */
export async function supprimerPersonne(id) {
  clearTimeout(minuteries.get(id));
  minuteries.delete(id);
  await DepotPersonnes.supprimerPersonne(id);
  etat.personnes = etat.personnes.filter((p) => p.id !== id);
  notifier('personnes');
}

/**
 * Importe une liste de personnes.
 * @param {object[]} personnes - Personnes (déjà normalisées).
 * @param {string} modeleId - Modèle de leurs cartes.
 * @returns {Promise<number>} Nombre de personnes ajoutées.
 */
export async function importerPersonnes(personnes, modeleId) {
  const crees = (await DepotPersonnes.importerPersonnes(personnes, modeleId)).map(normaliserEntree).filter(Boolean);
  etat.personnes.push(...crees);
  notifier('personnes');
  return crees.length;
}

/**
 * Enregistre un modèle : mise à jour s'il est déjà enregistré, sinon création.
 * @param {object} modele - Modèle normalisé.
 * @returns {Promise<object>} Modèle enregistré (avec son identifiant définitif).
 */
export async function enregistrerModele(modele) {
  const existe = etat.modeles.some((m) => m.id === modele.id);
  const enregistre = normaliserModele(existe ? await DepotModeles.modifierModele(modele) : await DepotModeles.creerModele(modele));
  etat.modeles = [...etat.modeles.filter((m) => m.id !== enregistre.id), enregistre]
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  notifier('modeles');
  return enregistre;
}

/**
 * Supprime un modèle enregistré ; ses cartes passent sur le modèle de remplacement.
 * @param {string} id - Identifiant.
 * @returns {Promise<void>}
 */
export async function supprimerModele(id) {
  const remplacant = await DepotModeles.supprimerModele(id);
  etat.modeles = etat.modeles.filter((m) => m.id !== id);
  etat.personnes.forEach((p) => { if (p.modeleId === id) p.modeleId = remplacant; });
  notifier('modeles');
  notifier('personnes');
}

/**
 * Fait passer toutes les cartes du modèle « ancien » sur le modèle « nouveau ».
 * @param {string} ancien - Modèle actuel.
 * @param {string} nouveau - Nouveau modèle.
 * @returns {Promise<number>} Nombre de cartes modifiées.
 */
export async function changerModeleEnLot(ancien, nouveau) {
  await sauvegarderTout();
  const modifiees = await DepotPersonnes.changerModeleEnLot(ancien, nouveau);
  etat.personnes.forEach((p) => { if (p.modeleId === ancien) p.modeleId = nouveau; });
  notifier('personnes');
  return modifiees;
}

/**
 * Ajoute une entreprise vide.
 * @param {object} entreprise - Entreprise normalisée (l'identifiant est donné par le serveur).
 * @returns {Promise<object>} Entreprise créée.
 */
export async function ajouterEntreprise(entreprise) {
  const creee = normaliserEntreprise(await DepotEntreprises.creerEntreprise(entreprise));
  etat.entreprises = [...etat.entreprises, creee].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  notifier('entreprises');
  return creee;
}

/**
 * Enregistre une entreprise ; les cartes reliées sont mises à jour à l'écran.
 * @param {object} entreprise - Entreprise normalisée.
 * @returns {Promise<void>}
 */
export async function enregistrerEntreprise(entreprise) {
  const enregistree = normaliserEntreprise(await DepotEntreprises.modifierEntreprise(entreprise));
  etat.entreprises = etat.entreprises.map((e) => (e.id === enregistree.id ? enregistree : e))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  notifier('entreprises');
  notifier('personnes');
}

/**
 * Supprime une entreprise (refusé par le serveur si des cartes y sont reliées).
 * @param {string} id - Identifiant.
 * @returns {Promise<void>}
 */
export async function supprimerEntreprise(id) {
  await sauvegarderTout();
  await DepotEntreprises.supprimerEntreprise(id);
  etat.entreprises = etat.entreprises.filter((e) => e.id !== id);
  notifier('entreprises');
}
