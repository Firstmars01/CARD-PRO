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
 * @returns {Promise<{id:string, modeleId:string, personne:object}>} Personne créée.
 */
export function creerPersonne(personne, modeleId) {
  return appelerApi('POST', '/api/personnes', { personne, modeleId });
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
 * Enregistre une personne.
 * @param {string} id - Identifiant.
 * @param {object} personne - Personne normalisée.
 * @param {string} modeleId - Modèle de sa carte.
 * @returns {Promise<void>}
 */
export async function modifierPersonne(id, personne, modeleId) {
  await appelerApi('PUT', `/api/personnes/${encodeURIComponent(id)}`, { personne, modeleId });
}

/**
 * Supprime une personne.
 * @param {string} id - Identifiant.
 * @returns {Promise<void>}
 */
export async function supprimerPersonne(id) {
  await appelerApi('DELETE', `/api/personnes/${encodeURIComponent(id)}`);
}
