/**
 * DepotPersonnes.js
 * Accès à l'API des personnes.
 */

import { appelerApi } from './ClientApi.js';

/**
 * Liste toutes les personnes.
 * @returns {Promise<{id:string, modeleId:string, personne:object}[]>} Personnes (à revalider).
 */
export async function listerPersonnes() {
  return (await appelerApi('GET', '/api/personnes')).personnes;
}

/**
 * Ajoute une personne.
 * @param {object} personne - Personne normalisée.
 * @param {string} modeleId - Modèle de sa carte.
 * @param {string} [entrepriseId] - Entreprise reliée ('' : réglage personnalisé).
 * @returns {Promise<{id:string, modeleId:string, entrepriseId:string, personne:object}>} Personne créée.
 */
export function creerPersonne(personne, modeleId, entrepriseId = '') {
  return appelerApi('POST', '/api/personnes', { personne, modeleId, entrepriseId });
}

/**
 * Ajoute une liste de personnes (import).
 * @param {object[]} personnes - Personnes normalisées.
 * @param {string} modeleId - Modèle de leurs cartes.
 * @returns {Promise<object[]>} Personnes créées.
 */
export async function importerPersonnes(personnes, modeleId) {
  return (await appelerApi('POST', '/api/personnes/import', { personnes, modeleId })).personnes;
}

/**
 * Enregistre une carte.
 * @param {{id:string, modeleId:string, entrepriseId:string, personne:object}} entree - Carte.
 * @returns {Promise<void>}
 */
export async function modifierPersonne({ id, personne, modeleId, entrepriseId }) {
  await appelerApi('PUT', `/api/personnes/${encodeURIComponent(id)}`, { personne, modeleId, entrepriseId });
}

/**
 * Fait passer toutes les cartes d'un modèle sur un autre (design en lot).
 * @param {string} ancien - Modèle actuel.
 * @param {string} nouveau - Nouveau modèle.
 * @returns {Promise<number>} Nombre de cartes modifiées.
 */
export async function changerModeleEnLot(ancien, nouveau) {
  return (await appelerApi('POST', '/api/personnes/changer-modele', { ancien, nouveau })).modifiees;
}

/**
 * Supprime une personne.
 * @param {string} id - Identifiant.
 * @returns {Promise<void>}
 */
export async function supprimerPersonne(id) {
  await appelerApi('DELETE', `/api/personnes/${encodeURIComponent(id)}`);
}
