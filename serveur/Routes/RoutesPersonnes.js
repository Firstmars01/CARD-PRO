/**
 * RoutesPersonnes.js
 * Routes des personnes (une carte par personne) : liste, ajout,
 * import en lot, modification, suppression et changement de design en lot.
 */

import { normaliserPersonne } from '../../src/Metier/Personne.js';
import { MODELES_DE_BASE } from '../../src/Metier/ModelesDeBase.js';
import { nouvelId, idValide } from '../../src/Utilitaires/Schema.js';
import { ErreurHttp } from '../Http/ErreurHttp.js';
import { lireCorpsJson } from '../Http/Requete.js';
import { envoyerJson } from '../Http/Reponse.js';
import { transaction } from '../Donnees/BaseDeDonnees.js';

// Une personne peut contenir une photo de profil (≈ 90 Ko maximum).
const LIMITE_CORPS = 160 * 1024;
const LIMITE_IMPORT = 2 * 1024 * 1024;
const IMPORT_MAX = 500;
export const PERSONNES_MAX = 5000;

/**
 * Vérifie l'identifiant de modèle demandé (modèle de base ou enregistré).
 * @param {object} ctx - Contexte de la requête.
 * @param {unknown} modeleId - Identifiant reçu.
 * @returns {string} Identifiant valide (premier modèle de base par défaut).
 */
function modeleValide(ctx, modeleId) {
  const existe = idValide(modeleId)
    && (MODELES_DE_BASE.some((m) => m.id === modeleId) || ctx.depots.modeles.lire(modeleId));
  return existe ? modeleId : MODELES_DE_BASE[0].id;
}

/**
 * Vérifie l'entreprise reliée à une carte.
 * @param {object} ctx - Contexte de la requête.
 * @param {unknown} entrepriseId - Identifiant reçu.
 * @returns {string} Identifiant d'une entreprise existante, ou '' (réglage personnalisé).
 */
function entrepriseValide(ctx, entrepriseId) {
  return idValide(entrepriseId) && ctx.depots.entreprises.existe(entrepriseId) ? entrepriseId : '';
}

/**
 * Construit une carte validée à partir du corps de la requête.
 * @param {object} ctx - Contexte de la requête.
 * @param {string} id - Identifiant de la carte.
 * @param {object} corps - { modeleId, entrepriseId, personne } non fiables.
 * @returns {{id:string, modeleId:string, entrepriseId:string, personne:object}} Carte.
 */
function entreeValide(ctx, id, corps) {
  return {
    id, modeleId: modeleValide(ctx, corps?.modeleId), entrepriseId: entrepriseValide(ctx, corps?.entrepriseId), personne: normaliserPersonne(corps?.personne),
  };
}

/**
 * Bloque l'ajout si la limite de personnes serait dépassée.
 * @param {object} ctx - Contexte de la requête.
 * @param {number} nombre - Nombre de personnes à ajouter.
 */
function verifierPlace(ctx, nombre) {
  if (ctx.depots.personnes.compter() + nombre > PERSONNES_MAX) throw new ErreurHttp(409, `Limite de ${PERSONNES_MAX} personnes atteinte.`);
}

/** GET /api/personnes @param {object} ctx - Contexte. */
function listerPersonnes(ctx) {
  envoyerJson(ctx.res, 200, { personnes: ctx.depots.personnes.listerToutes() });
}

/** POST /api/personnes : ajoute une personne. @param {object} ctx - Contexte. */
async function creerPersonne(ctx) {
  const corps = await lireCorpsJson(ctx.req, LIMITE_CORPS);
  verifierPlace(ctx, 1);
  const entree = entreeValide(ctx, nouvelId('p'), corps);
  ctx.depots.personnes.creer(entree);
  envoyerJson(ctx.res, 201, entree);
}

/** POST /api/personnes/import : ajoute une liste de personnes. @param {object} ctx - Contexte. */
async function importerPersonnes(ctx) {
  const corps = await lireCorpsJson(ctx.req, LIMITE_IMPORT);
  if (!Array.isArray(corps?.personnes) || corps.personnes.length === 0) throw new ErreurHttp(400, 'Liste vide.');
  if (corps.personnes.length > IMPORT_MAX) throw new ErreurHttp(413, `Maximum ${IMPORT_MAX} personnes par import.`);
  verifierPlace(ctx, corps.personnes.length);
  const entrees = corps.personnes.map((personne) => entreeValide(ctx, nouvelId('p'), { ...corps, personne }));
  transaction(ctx.base, () => entrees.forEach((e) => ctx.depots.personnes.creer(e)));
  envoyerJson(ctx.res, 201, { personnes: entrees });
}

/** PUT /api/personnes/:id : modifie une personne. @param {object} ctx - Contexte. */
async function modifierPersonne(ctx) {
  if (!ctx.depots.personnes.existe(ctx.params.id)) throw new ErreurHttp(404, 'Personne introuvable.');
  const corps = await lireCorpsJson(ctx.req, LIMITE_CORPS);
  const entree = entreeValide(ctx, ctx.params.id, corps);
  ctx.depots.personnes.modifier(entree);
  envoyerJson(ctx.res, 200, entree);
}

/** DELETE /api/personnes/:id : supprime une personne. @param {object} ctx - Contexte. */
function supprimerPersonne(ctx) {
  if (!ctx.depots.personnes.existe(ctx.params.id)) throw new ErreurHttp(404, 'Personne introuvable.');
  ctx.depots.personnes.supprimer(ctx.params.id);
  envoyerJson(ctx.res, 200, { ok: true });
}

/**
 * POST /api/personnes/changer-modele : toutes les cartes du modèle « ancien »
 * passent sur le modèle « nouveau ».
 * @param {object} ctx - Contexte.
 */
async function changerModeleEnLot(ctx) {
  const corps = await lireCorpsJson(ctx.req, LIMITE_CORPS);
  if (!idValide(corps?.ancien) || modeleValide(ctx, corps?.nouveau) !== corps.nouveau) throw new ErreurHttp(400, 'Modèle invalide.');
  const modifiees = ctx.depots.personnes.remplacerModele(corps.ancien, corps.nouveau);
  envoyerJson(ctx.res, 200, { modifiees });
}

/**
 * Déclare les routes des personnes.
 * @param {import('../Http/Routeur.js').Routeur} routeur - Routeur.
 */
export function enregistrerRoutesPersonnes(routeur) {
  routeur.ajouter('GET', '/api/personnes', listerPersonnes);
  routeur.ajouter('POST', '/api/personnes', creerPersonne);
  routeur.ajouter('POST', '/api/personnes/import', importerPersonnes);
  routeur.ajouter('POST', '/api/personnes/changer-modele', changerModeleEnLot);
  routeur.ajouter('PUT', '/api/personnes/:id', modifierPersonne);
  routeur.ajouter('DELETE', '/api/personnes/:id', supprimerPersonne);
}
