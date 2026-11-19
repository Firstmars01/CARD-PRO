/**
 * DepotSauvegarde.js
 * Appels à l'API de sauvegarde : récupération de toutes les données et
 * restauration (remplacement complet).
 */

import { appelerApi } from './ClientApi.js';

/**
 * Récupère toutes les données (modèles enregistrés et personnes).
 * @returns {Promise<object>} Sauvegarde { format, version, creeLe, modeles, personnes }.
 */
export function lireSauvegarde() {
  return appelerApi('GET', '/api/sauvegarde');
}

/**
 * Remplace toutes les données par celles d'une sauvegarde.
 * @param {object} sauvegarde - Contenu du fichier de sauvegarde (revalidé par le serveur).
 * @returns {Promise<{modeles:number, personnes:number}>} Nombre d'éléments restaurés.
 */
export function restaurerSauvegarde(sauvegarde) {
  return appelerApi('POST', '/api/sauvegarde', sauvegarde);
}
