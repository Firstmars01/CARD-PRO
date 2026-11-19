/**
 * FichiersStatiques.js
 * Sert les fichiers de l'application (HTML, CSS, JS, images).
 * Seuls quelques fichiers et dossiers sont autorisés : le code du serveur,
 * la base de données et les fichiers cachés ne sont jamais accessibles.
 * Le portefeuille mobile (/portefeuille/) est aussi servi, pour l'essayer
 * sur le PC (la caméra n'y est autorisée que pour lui).
 */

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { ErreurHttp } from './ErreurHttp.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
const FICHIERS_RACINE = ['index.html', 'manifest.webmanifest', 'sw.js'];
const DOSSIERS_AUTORISES = ['assets', 'src', 'portefeuille'];
// Page d'accueil de l'application et du portefeuille mobile.
const PAGE_APPLICATION = /^\/$/;
const PAGE_PORTEFEUILLE = /^\/portefeuille\/$/;

/**
 * Convertit le chemin demandé en chemin relatif autorisé.
 * @param {string} chemin - Chemin de l'URL.
 * @returns {string} Chemin relatif sûr.
 * @throws {ErreurHttp} 404 si le fichier n'est pas autorisé.
 */
function cheminAutorise(chemin) {
  if (PAGE_APPLICATION.test(chemin)) return 'index.html';
  if (PAGE_PORTEFEUILLE.test(chemin)) return 'portefeuille/index.html';
  let relatif;
  try {
    relatif = decodeURIComponent(chemin).replace(/^\/+/, '');
  } catch {
    throw new ErreurHttp(404, 'Page introuvable.');
  }
  const segments = relatif.split('/');
  // Bloque « .. », les fichiers cachés, les segments vides et les antislashs.
  const suspect = segments.some((s) => s === '' || s.startsWith('.') || s.includes('\\') || s.includes('\0'));
  const autorise = segments.length === 1 ? FICHIERS_RACINE.includes(relatif) : DOSSIERS_AUTORISES.includes(segments[0]);
  if (suspect || !autorise) throw new ErreurHttp(404, 'Page introuvable.');
  return relatif;
}

/**
 * Envoie un fichier statique.
 * @param {import('node:http').IncomingMessage} req - Requête.
 * @param {import('node:http').ServerResponse} res - Réponse.
 * @param {string} chemin - Chemin de l'URL.
 * @param {string} racine - Dossier racine du projet.
 * @throws {ErreurHttp} 404 ou 405.
 */
export async function servirFichier(req, res, chemin, racine) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new ErreurHttp(405, 'Méthode non autorisée.');
  // Le portefeuille utilise des chemins relatifs : il doit être ouvert avec le « / » final.
  if (chemin === '/portefeuille') {
    res.writeHead(301, { Location: '/portefeuille/' });
    res.end();
    return;
  }
  const complet = path.resolve(racine, cheminAutorise(chemin));
  const type = TYPES[path.extname(complet)];
  if (!complet.startsWith(racine + path.sep) || !type) throw new ErreurHttp(404, 'Page introuvable.');

  let contenu;
  try {
    contenu = await readFile(complet);
  } catch {
    throw new ErreurHttp(404, 'Page introuvable.');
  }
  // Le scanner du portefeuille a besoin de la caméra ; le reste de l'application non.
  if (path.relative(racine, complet).startsWith(`portefeuille${path.sep}`)) {
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': contenu.length, 'Cache-Control': 'no-cache' });
  res.end(req.method === 'HEAD' ? undefined : contenu);
}
