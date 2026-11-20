/**
 * SauvegardePortefeuille.js
 * Sauvegarde de tout le portefeuille dans un fichier .json (pour ne rien
 * perdre ou changer de téléphone), et lecture d'une sauvegarde : le fichier
 * est une source non fiable, chaque carte est revalidée comme à l'import.
 */

import { validerCarteStockee } from './Portefeuille.js';

export const FORMAT_SAUVEGARDE = 'cardpro-portefeuille';
const VERSION_SAUVEGARDE = 1;
export const TAILLE_MAX_SAUVEGARDE = 40 * 1024 * 1024;
const CARTES_MAX = 2000;

/**
 * Crée le contenu du fichier de sauvegarde.
 * @param {object[]} cartes - Cartes du portefeuille.
 * @returns {string} Texte JSON.
 */
export function creerSauvegarde(cartes) {
  return JSON.stringify({ format: FORMAT_SAUVEGARDE, version: VERSION_SAUVEGARDE, creeLe: new Date().toISOString(), cartes });
}

/**
 * Lit une sauvegarde et revalide chaque carte.
 * @param {string} texte - Contenu du fichier (non fiable).
 * @returns {object[]} Cartes valides (identifiants uniques).
 * @throws {Error} Si le fichier n'est pas une sauvegarde Card Pro.
 */
export function lireSauvegarde(texte) {
  let donnees;
  try {
    donnees = JSON.parse(texte);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Card Pro.");
  }
  if (donnees?.format !== FORMAT_SAUVEGARDE || !Array.isArray(donnees.cartes)) throw new Error("Ce fichier n'est pas une sauvegarde Card Pro.");
  if (donnees.version > VERSION_SAUVEGARDE) throw new Error('Sauvegarde créée par une version plus récente : mets à jour Card Pro.');
  if (donnees.cartes.length > CARTES_MAX) throw new Error(`Maximum ${CARTES_MAX} cartes.`);
  const vues = new Set();
  return donnees.cartes.map(validerCarteStockee).filter((c) => {
    if (!c || vues.has(c.id)) return false;
    vues.add(c.id);
    return true;
  });
}
