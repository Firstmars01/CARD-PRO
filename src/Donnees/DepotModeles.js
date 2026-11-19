/**
 * DepotModeles.js
 * Accès à l'API des modèles de carte enregistrés.
 */

import { appelerApi } from './ClientApi.js';

/**
 * Liste les modèles enregistrés.
 * @returns {Promise<object[]>} Modèles (à revalider).
 */
export async function listerModeles() {
  return (await appelerApi('GET', '/api/modeles')).modeles;
}

/**
 * Enregistre un nouveau modèle (l'identifiant est créé par le serveur).
 * @param {object} modele - Modèle normalisé.
 * @returns {Promise<object>} Modèle enregistré.
 */
export async function creerModele(modele) {
  return (await appelerApi('POST', '/api/modeles', { modele })).modele;
}

/**
 * Met à jour un modèle enregistré.
 * @param {object} modele - Modèle normalisé (avec id).
 * @returns {Promise<object>} Modèle enregistré.
 */
export async function modifierModele(modele) {
  return (await appelerApi('PUT', `/api/modeles/${encodeURIComponent(modele.id)}`, { modele })).modele;
}

/**
 * Supprime un modèle enregistré.
 * @param {string} id - Identifiant.
 * @returns {Promise<string>} Identifiant du modèle qui le remplace sur les cartes.
 */
export async function supprimerModele(id) {
  return (await appelerApi('DELETE', `/api/modeles/${encodeURIComponent(id)}`)).modeleRemplacant;
}
