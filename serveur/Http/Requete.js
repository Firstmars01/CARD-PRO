/**
 * Requete.js
 * Lecture sûre du corps JSON d'une requête (type et taille contrôlés).
 */

import { ErreurHttp } from './ErreurHttp.js';

/**
 * Lit et analyse le corps JSON d'une requête.
 * @param {import('node:http').IncomingMessage} req - Requête.
 * @param {number} limite - Taille maximale en octets.
 * @returns {Promise<unknown>} Objet JSON (à valider par l'appelant).
 * @throws {ErreurHttp} 415, 413 ou 400 selon le problème.
 */
export async function lireCorpsJson(req, limite) {
  const type = String(req.headers['content-type'] || '').toLowerCase();
  if (!type.startsWith('application/json')) throw new ErreurHttp(415, 'Format de requête non supporté.');
  if (Number(req.headers['content-length']) > limite) throw new ErreurHttp(413, 'Requête trop volumineuse.');

  const morceaux = [];
  let total = 0;
  for await (const morceau of req) {
    total += morceau.length;
    if (total > limite) throw new ErreurHttp(413, 'Requête trop volumineuse.');
    morceaux.push(morceau);
  }
  try {
    return JSON.parse(Buffer.concat(morceaux).toString('utf8'));
  } catch {
    throw new ErreurHttp(400, 'Données invalides.');
  }
}
