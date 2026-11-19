/**
 * ClientApi.js
 * Appels à l'API du serveur et transformation des erreurs en messages lisibles.
 */

/**
 * Erreur renvoyée par l'API, avec son code HTTP.
 */
export class ErreurApi extends Error {
  /**
   * @param {number} statut - Code HTTP (0 si le serveur est injoignable).
   * @param {string} message - Message à afficher.
   */
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

/**
 * Appelle l'API et renvoie la réponse JSON.
 * @param {string} methode - GET, POST, PUT ou DELETE.
 * @param {string} chemin - Chemin de l'API (ex. : « /api/personnes »).
 * @param {unknown} [corps] - Données à envoyer.
 * @returns {Promise<any>} Réponse du serveur.
 * @throws {ErreurApi} Si le serveur répond par une erreur ou est injoignable.
 */
export async function appelerApi(methode, chemin, corps) {
  let reponse;
  try {
    reponse = await fetch(chemin, {
      method: methode,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch {
    throw new ErreurApi(0, 'Serveur injoignable. Vérifie que Card Pro tourne toujours.');
  }
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new ErreurApi(reponse.status, donnees.erreur || 'Erreur inattendue.');
  return donnees;
}
