/**
 * Portefeuille.js
 * Logique du portefeuille : import d'une carte (fichier .cardpro, GIF reçu
 * par e-mail ou QR animé scanné), liste et suppression. Toute donnée lue
 * (fichier ou stockage) est revalidée avant d'être affichée.
 */

import { lirePaquet, estPaquet, IDENTIFIANT_GIF, TAILLE_MAX_PAQUET } from '../../../src/Metier/PaquetCarte.js';
import { extraireDonneesGif } from '../../../src/Utilitaires/LectureGif.js';
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
 * Valide une carte lue dans le stockage.
 * @param {object} brute - Carte enregistrée.
 * @returns {object|null} Carte propre, ou null si inutilisable.
 */
function validerCarteStockee(brute) {
  if (!brute || typeof brute.id !== 'string' || !/^[a-z0-9-]{8,40}$/i.test(brute.id)) return null;
  return {
    id: brute.id,
    ajouteLe: typeof brute.ajouteLe === 'string' ? brute.ajouteLe : '',
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
  const carte = { id: crypto.randomUUID(), ajouteLe: new Date().toISOString(), personne, modele };
  await enregistrerCarte(carte);
  cartes = [carte, ...cartes];
  notifierAbonnes();
  return carte;
}

/**
 * Importe un fichier reçu : .cardpro, ou GIF Card Pro (la carte est cachée dedans).
 * @param {File|Blob} fichier - Fichier choisi ou partagé.
 * @returns {Promise<object>} Carte ajoutée.
 * @throws {Error} Avec un message lisible si le fichier n'est pas une carte.
 */
export async function importerFichier(fichier) {
  if (fichier.size > TAILLE_MAX_FICHIER) throw new Error('Fichier trop volumineux.');
  const octets = new Uint8Array(await fichier.arrayBuffer());
  if (estPaquet(octets)) return ajouterDepuisPaquet(octets);
  const paquet = extraireDonneesGif(octets, IDENTIFIANT_GIF, TAILLE_MAX_PAQUET);
  if (paquet) return ajouterDepuisPaquet(paquet);
  throw new Error("Ce fichier n'est pas une carte Card Pro (choisis le GIF ou le fichier .cardpro reçu).");
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
 * Titre lisible d'une carte (nom, sinon entreprise).
 * @param {object} carte - Carte.
 * @returns {string} Titre.
 */
export function titreCarte(carte) {
  return nomComplet(carte.personne) || carte.personne.entreprise || 'Carte sans nom';
}
