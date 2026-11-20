/**
 * DepotEntreprises.js
 * Accès à l'API des entreprises.
 */

import { appelerApi } from './ClientApi.js';

/**
 * Liste les entreprises.
 * @returns {Promise<object[]>} Entreprises (à revalider).
 */
export async function listerEntreprises() {
  return (await appelerApi('GET', '/api/entreprises')).entreprises;
}

/**
 * Ajoute une entreprise.
 * @param {object} entreprise - Entreprise normalisée.
 * @returns {Promise<object>} Entreprise créée (avec son identifiant définitif).
 */
export async function creerEntreprise(entreprise) {
  return (await appelerApi('POST', '/api/entreprises', { entreprise })).entreprise;
}

/**
 * Enregistre une entreprise.
 * @param {object} entreprise - Entreprise normalisée.
 * @returns {Promise<object>} Entreprise enregistrée.
 */
export async function modifierEntreprise(entreprise) {
  return (await appelerApi('PUT', `/api/entreprises/${encodeURIComponent(entreprise.id)}`, { entreprise })).entreprise;
}

/**
 * Supprime une entreprise (refusé si des cartes y sont reliées).
 * @param {string} id - Identifiant.
 * @returns {Promise<void>}
 */
export async function supprimerEntreprise(id) {
  await appelerApi('DELETE', `/api/entreprises/${encodeURIComponent(id)}`);
}
