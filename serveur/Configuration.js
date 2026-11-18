/**
 * Configuration.js
 * Lit la configuration du serveur depuis les variables d'environnement.
 * Aucun secret n'est nécessaire.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Racine du projet (dossier contenant index.html, assets/ et src/).
const RACINE_PROJET = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Construit la configuration du serveur.
 * @param {object} [env=process.env] - Variables d'environnement.
 * @returns {{port:number, cheminBase:string, racineStatique:string}} Configuration.
 */
export function lireConfiguration(env = process.env) {
  return {
    port: Number(env.PORT) || 3000,
    cheminBase: env.CHEMIN_BASE || path.join(RACINE_PROJET, 'donnees', 'cardpro.sqlite'),
    racineStatique: RACINE_PROJET,
  };
}
