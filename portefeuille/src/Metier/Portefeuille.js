/**
 * Portefeuille.js
 * Logique du portefeuille : import d'une carte (fichier .drawcard, GIF reçu
 * par e-mail ou QR animé scanné), liste, favoris, « ma carte » (modifiable),
 * modification, restauration d'une sauvegarde et suppression. Toute donnée lue
 * (fichier ou stockage) est revalidée avant d'être affichée.
 */

import { lirePaquet, extrairePaquet } from '../../../src/Metier/PaquetCarte.js';
import { normaliserPersonne, nomComplet } from '../../../src/Metier/Personne.js';
import { normaliserModele } from '../../../src/Metier/ModeleCarte.js';
import { listerCartes, enregistrerCarte, supprimerCarte } from '../Donnees/StockageCartes.js';

const TAILLE_MAX_FICHIER = 20 * 1024 * 1024; // Un GIF peut contenir beaucoup d'images

let cartes = [];
const abonnes = new Set();

/**
 * Prévient l'interface que la liste a changé.
 */
function notifierAbonnes() {
  abonnes.forEach((rappel) => rappel(cartes));
}

/**
 * S'abonne aux changements de la liste des cartes.
 * @param {(cartes:object[]) => void} rappel - Fonction appelée à chaque changement.
 */
export function abonnerCartes(rappel) {
  abonnes.add(rappel);
}

/**
 * Valide une carte lue dans le stockage ou dans une sauvegarde.
 * @param {object} brute - Carte enregistrée (source non fiable).
 * @returns {object|null} Carte propre, ou null si inutilisable.
 */
export function validerCarteStockee(brute) {
  if (!brute || typeof brute.id !== 'string' || !/^[a-z0-9-]{8,40}$/i.test(brute.id)) return null;
  return {
    id: brute.id,
    ajouteLe: typeof brute.ajouteLe === 'string' && /^[\d\-T:.Z]{0,30}$/.test(brute.ajouteLe) ? brute.ajouteLe : '',
    // Ma carte : celle de la personne qui utilise le téléphone (modifiable). Favori : affichée en haut.
    maCarte: brute.maCarte === true,
    favori: brute.favori === true,
    personne: normaliserPersonne(brute.personne),
    modele: normaliserModele(brute.modele),
  };
}

/**
 * Charge les cartes du téléphone (les plus récentes d'abord).
 * @returns {Promise<object[]>} Cartes.
 */
export async function chargerCartes() {
  cartes = (await listerCartes()).map(validerCarteStockee).filter(Boolean)
    .sort((a, b) => b.ajouteLe.localeCompare(a.ajouteLe));
  notifierAbonnes();
  return cartes;
}

/**
 * Renvoie les cartes chargées.
 * @returns {object[]} Cartes.
 */
export function obtenirCartes() {
  return cartes;
}

/**
 * Cherche une carte par son identifiant.
 * @param {string} id - Identifiant.
 * @returns {object|undefined} Carte trouvée.
 */
export function trouverCarte(id) {
  return cartes.find((c) => c.id === id);
}

/**
 * Ajoute une carte à partir de son paquet (déjà reconstitué).
 * @param {Uint8Array} paquet - Paquet binaire de la carte.
 * @returns {Promise<object>} Carte ajoutée.
 * @throws {Error} Si le paquet est invalide.
 */
export async function ajouterDepuisPaquet(paquet) {
  const { personne, modele } = await lirePaquet(paquet);
  const carte = { id: crypto.randomUUID(), ajouteLe: new Date().toISOString(), maCarte: false, favori: false, personne, modele };
  await enregistrerCarte(carte);
  cartes = [carte, ...cartes];
  notifierAbonnes();
  return carte;
}

/**
 * Importe un fichier reçu : .drawcard, ou GIF DrawCard (la carte est cachée dedans).
 * @param {File|Blob} fichier - Fichier choisi ou partagé.
 * @returns {Promise<object>} Carte ajoutée.
 * @throws {Error} Avec un message lisible si le fichier n'est pas une carte.
 */
export async function importerFichier(fichier) {
  if (fichier.size > TAILLE_MAX_FICHIER) throw new Error('Fichier trop volumineux.');
  return ajouterDepuisPaquet(extrairePaquet(new Uint8Array(await fichier.arrayBuffer())));
}

/**
 * Supprime une carte du téléphone.
 * @param {string} id - Identifiant de la carte.
 * @returns {Promise<void>}
 */
export async function retirerCarte(id) {
  await supprimerCarte(id);
  cartes = cartes.filter((c) => c.id !== id);
  notifierAbonnes();
}

/**
 * Modifie une carte : favori, « ma carte », ou infos de la personne (seulement
 * pour « ma carte » ; le design ne change jamais). Tout est revalidé.
 * @param {string} id - Identifiant de la carte.
 * @param {{favori?:boolean, maCarte?:boolean, personne?:object}} changements - Changements.
 * @returns {Promise<object>} Carte enregistrée.
 * @throws {Error} Si la carte n'existe pas, ou si on modifie les infos d'une carte reçue.
 */
export async function modifierCarte(id, changements) {
  const actuelle = trouverCarte(id);
  if (!actuelle) throw new Error('Carte introuvable.');
  if (changements.personne && !actuelle.maCarte) throw new Error('Seule ta propre carte est modifiable.');
  const carte = validerCarteStockee({
    ...actuelle,
    favori: typeof changements.favori === 'boolean' ? changements.favori : actuelle.favori,
    maCarte: typeof changements.maCarte === 'boolean' ? changements.maCarte : actuelle.maCarte,
    personne: changements.personne || actuelle.personne,
  });
  await enregistrerCarte(carte);
  cartes = cartes.map((c) => (c.id === id ? carte : c));
  notifierAbonnes();
  return carte;
}

/**
 * Ajoute les cartes d'une sauvegarde (déjà validées) : celles déjà présentes
 * (même identifiant) sont gardées telles quelles.
 * @param {object[]} restaurees - Cartes validées.
 * @returns {Promise<number>} Nombre de cartes ajoutées.
 */
export async function ajouterCartesRestaurees(restaurees) {
  const connues = new Set(cartes.map((c) => c.id));
  const nouvelles = restaurees.filter((c) => !connues.has(c.id));
  for (const carte of nouvelles) await enregistrerCarte(carte);
  cartes = [...cartes, ...nouvelles];
  notifierAbonnes();
  return nouvelles.length;
}

/**
 * Titre lisible d'une carte (nom, sinon entreprise).
 * @param {object} carte - Carte.
 * @returns {string} Titre.
 */
export function titreCarte(carte) {
  return nomComplet(carte.personne) || carte.personne.entreprise || 'Carte sans nom';
}
