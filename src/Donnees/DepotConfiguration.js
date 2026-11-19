/**
 * DepotConfiguration.js
 * Lit les réglages publics du serveur (adresse de l'appli mobile).
 */

import { appelerApi } from './ClientApi.js';

let configuration = null;

/**
 * Renvoie la configuration du serveur (lue une seule fois).
 * @returns {Promise<{lienPortefeuille:string}>} Configuration ; lien vide si non réglé ou injoignable.
 */
export async function lireConfiguration() {
  if (!configuration) {
    try {
      const donnees = await appelerApi('GET', '/api/configuration');
      const lien = typeof donnees?.lienPortefeuille === 'string' && donnees.lienPortefeuille.startsWith('https://') ? donnees.lienPortefeuille : '';
      configuration = { lienPortefeuille: lien };
    } catch {
      return { lienPortefeuille: '' };
    }
  }
  return configuration;
}
