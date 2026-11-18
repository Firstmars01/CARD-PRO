/**
 * Reponse.js
 * Envoi des réponses JSON (jamais mises en cache).
 */

/**
 * Envoie une réponse JSON.
 * @param {import('node:http').ServerResponse} res - Réponse.
 * @param {number} statut - Code HTTP.
 * @param {unknown} donnees - Données sérialisables.
 */
export function envoyerJson(res, statut, donnees) {
  const corps = JSON.stringify(donnees);
  res.writeHead(statut, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corps),
    'Cache-Control': 'no-store',
  });
  res.end(corps);
}
