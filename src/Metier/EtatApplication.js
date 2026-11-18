/**
 * EtatApplication.js
 * État central de l'application : la liste des personnes (une carte
 * chacune) et les modèles enregistrés. Les composants s'abonnent aux
 * changements ; les modifications sont envoyées au serveur.
 */

import { normaliserPersonne, personneVide } from './Personne.js';
import { normaliserModele, estModeleDeBase } from './ModeleCarte.js';
import { MODELES_DE_BASE } from './ModelesDeBase.js';
import { idValide } from '../Utilitaires/Schema.js';
import * as DepotPersonnes from '../Donnees/DepotPersonnes.js';
import * as DepotModeles from '../Donnees/DepotModeles.js';

const DELAI_SAUVEGARDE = 700;

const etat = { personnes: [], modeles: [] };
const abonnes = new Set();
const minuteries = new Map();
let surErreur = () => {};

/**
 * Valide une entrée personne reçue du serveur.
 * @param {object} entree - { id, modeleId, personne }.
 * @returns {{id:string, modeleId:string, personne:object}|null} Entrée propre.
 */
function normaliserEntree(entree) {
  if (!idValide(entree?.id)) return null;
  return { id: entree.id, modeleId: idValide(entree.modeleId) ? entree.modeleId : MODELES_DE_BASE[0].id, personne: normaliserPersonne(entree.personne) };
}

/**
 * Charge les personnes et les modèles depuis le serveur.
 * @param {Function} [surErreurSauvegarde] - Appelée si une sauvegarde échoue.
 * @returns {Promise<void>}
 */
export async function chargerDonnees(surErreurSauvegarde) {
  if (surErreurSauvegarde) surErreur = surErreurSauvegarde;
  const [personnes, modeles] = await Promise.all([DepotPersonnes.listerPersonnes(), DepotModeles.listerModeles()]);
  etat.personnes = personnes.map(normaliserEntree).filter(Boolean);
  etat.modeles = modeles.map(normaliserModele).filter((m) => !estModeleDeBase(m));
  // Sauvegarde immédiate si l'utilisateur quitte ou change d'onglet.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sauvegarderTout().catch(() => {});
  });
}

/**
 * Renvoie l'état courant (à ne pas modifier directement).
 * @returns {{personnes:object[], modeles:object[]}} État.
 */
export function obtenirEtat() {
  return etat;
}

/**
 * Abonne une fonction aux changements ("personnes", "personne", "modeles").
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
 * Ajoute une personne vide.
 * @param {string} modeleId - Modèle de sa carte.
 * @returns {Promise<object>} Entrée créée.
 */
export async function ajouterPersonne(modeleId) {
  const entree = normaliserEntree(await DepotPersonnes.creerPersonne(personneVide(), modeleId));
  etat.personnes.push(entree);
  notifier('personnes');
  return entree;
}

/**
 * Modifie une personne (sauvegarde différée, regroupe les frappes).
 * @param {string} id - Identifiant.
 * @param {{personne?:object, modeleId?:string}} modifications - Changements.
 */
export function modifierPersonne(id, modifications) {
  const entree = trouverPersonne(id);
  if (!entree) return;
  if (modifications.personne) entree.personne = normaliserPersonne(modifications.personne);
  if (modifications.modeleId && idValide(modifications.modeleId)) entree.modeleId = modifications.modeleId;
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
  if (entree) await DepotPersonnes.modifierPersonne(id, entree.personne, entree.modeleId);
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
