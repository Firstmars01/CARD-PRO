/**
 * BaseDeDonnees.js
 * Ouverture de la base SQLite (intégrée à Node.js) et création des tables.
 * Toutes les requêtes du projet sont des requêtes préparées (anti-injection SQL).
 */

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS modeles (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    donnees TEXT NOT NULL,
    modifie_le TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS personnes (
    id TEXT PRIMARY KEY,
    modele_id TEXT NOT NULL,
    donnees TEXT NOT NULL,
    cree_le TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

/**
 * Ouvre (ou crée) la base de données et applique le schéma.
 * @param {string} chemin - Chemin du fichier SQLite (« :memory: » pour les tests).
 * @returns {DatabaseSync} Connexion ouverte.
 */
export function ouvrirBase(chemin) {
  if (chemin !== ':memory:') mkdirSync(path.dirname(chemin), { recursive: true });
  const base = new DatabaseSync(chemin);
  base.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  base.exec(SCHEMA);
  return base;
}

/**
 * Exécute une fonction dans une transaction (tout ou rien).
 * @param {DatabaseSync} base - Connexion.
 * @param {Function} action - Fonction synchrone à exécuter.
 * @returns {unknown} Résultat de l'action.
 */
export function transaction(base, action) {
  base.exec('BEGIN');
  try {
    const resultat = action();
    base.exec('COMMIT');
    return resultat;
  } catch (erreur) {
    base.exec('ROLLBACK');
    throw erreur;
  }
}
