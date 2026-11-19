/**
 * Configuration.js
 * Lit la configuration du serveur depuis les variables d'environnement.
 * Aucun secret n'est nécessaire.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normaliserUrl } from '../src/Utilitaires/Validation.js';

// Racine du projet (dossier contenant index.html, assets/ et src/).
const RACINE_PROJET = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Valide une adresse : seules les adresses HTTPS sont acceptées.
 * @param {unknown} valeur - Adresse brute.
 * @returns {string} Adresse propre, ou chaîne vide.
 */
function lienHttps(valeur) {
  const url = normaliserUrl(valeur);
  return url.startsWith('https://') ? url : '';
}

/**
 * Construit la configuration du serveur.
 * @param {object} [env=process.env] - Variables d'environnement.
 * @returns {{port:number, cheminBase:string, racineStatique:string, lienPortefeuille:string}} Configuration.
 *   lienPortefeuille : adresse HTTPS de l'appli mobile (LIEN_PORTEFEUILLE), vide si absente ou invalide.
 */
export function lireConfiguration(env = process.env) {
  return {
    port: Number(env.PORT) || 3000,
    cheminBase: env.CHEMIN_BASE || path.join(RACINE_PROJET, 'donnees', 'cardpro.sqlite'),
    racineStatique: RACINE_PROJET,
    lienPortefeuille: lienHttps(env.LIEN_PORTEFEUILLE),
  };
}
