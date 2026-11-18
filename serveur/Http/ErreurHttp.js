/**
 * ErreurHttp.js
 * Erreur « prévue » renvoyée au client avec un code HTTP et un message
 * public. Toute autre erreur est masquée (message générique 500).
 */

export class ErreurHttp extends Error {
  /**
   * @param {number} statut - Code HTTP (400, 401, 403, 404…).
   * @param {string} message - Message sans information sensible, affiché à l'utilisateur.
   */
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}
