/**
 * Securite.js
 * Protections HTTP : en-têtes de sécurité, vérification de l'origine
 * des requêtes qui modifient des données (bloque les requêtes envoyées
 * par un autre site ouvert dans le navigateur, attaque CSRF), et du nom
 * d'hôte quand le serveur n'écoute que sur ce PC (attaque « DNS rebinding »).
 */

const HOTES_LOCAUX = ['localhost', '127.0.0.1', '[::1]'];

const POLITIQUE_CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data: blob:",
  "connect-src 'self'", "worker-src 'self'", "manifest-src 'self'", "object-src 'none'",
  "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

const ENTETES = {
  'Content-Security-Policy': POLITIQUE_CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Ajoute les en-têtes de sécurité à une réponse.
 * @param {import('node:http').ServerResponse} res - Réponse.
 */
export function appliquerEntetesSecurite(res) {
  Object.entries(ENTETES).forEach(([nom, valeur]) => res.setHeader(nom, valeur));
}

/**
 * Indique si une adresse d'écoute est locale (ce PC uniquement).
 * @param {string} hote - Adresse d'écoute (ex. 127.0.0.1).
 * @returns {boolean} true pour 127.0.0.1, ::1 ou localhost.
 */
export function estHoteLocal(hote) {
  return ['127.0.0.1', '::1', 'localhost'].includes(hote);
}

/**
 * Vérifie le nom d'hôte demandé : un site malveillant qui ferait pointer son
 * propre nom vers 127.0.0.1 (DNS rebinding) est refusé.
 * @param {import('node:http').IncomingMessage} req - Requête.
 * @returns {boolean} true si l'hôte est localhost / 127.0.0.1 / [::1] avec le bon port.
 */
export function verifierHoteLocal(req) {
  const port = req.socket.localPort;
  return HOTES_LOCAUX.some((nom) => req.headers.host === `${nom}:${port}`);
}

/**
 * Vérifie que la requête vient de l'application elle-même :
 * l'en-tête Origin doit correspondre exactement à l'adresse du serveur.
 * @param {import('node:http').IncomingMessage} req - Requête.
 * @returns {boolean} true si l'origine est acceptée.
 */
export function verifierOrigine(req) {
  const origine = req.headers.origin;
  const hote = req.headers.host;
  if (!origine || !hote) return false;
  return origine === `http://${hote}` || origine === `https://${hote}`;
}
