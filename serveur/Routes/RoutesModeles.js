/**
 * RoutesModeles.js
 * Routes des modèles de carte enregistrés : liste, création,
 * modification et suppression. Les modèles de base ne sont pas stockés.
 */

import { normaliserModele, estModeleDeBase } from '../../src/Metier/ModeleCarte.js';
import { MODELES_DE_BASE } from '../../src/Metier/ModelesDeBase.js';
import { nouvelId } from '../../src/Utilitaires/Schema.js';
import { ErreurHttp } from '../Http/ErreurHttp.js';
import { lireCorpsJson } from '../Http/Requete.js';
import { envoyerJson } from '../Http/Reponse.js';
import { transaction } from '../Donnees/BaseDeDonnees.js';

// Un modèle peut contenir plusieurs images (logo, fond…).
const LIMITE_CORPS = 8 * 1024 * 1024;
const MODELES_MAX = 200;

/**
 * Lit et valide le modèle envoyé par le client.
 * @param {object} ctx - Contexte de la requête.
 * @returns {Promise<object>} Modèle normalisé.
 */
async function lireModele(ctx) {
  const corps = await lireCorpsJson(ctx.req, LIMITE_CORPS);
  if (!corps || typeof corps.modele !== 'object') throw new ErreurHttp(400, 'Modèle manquant.');
  return normaliserModele(corps.modele);
}

/**
 * Vérifie qu'un modèle enregistré existe.
 * @param {object} ctx - Contexte de la requête.
 * @throws {ErreurHttp} 404 si introuvable.
 */
function verifierExistence(ctx) {
  if (!ctx.depots.modeles.lire(ctx.params.id)) throw new ErreurHttp(404, 'Modèle introuvable.');
}

/** GET /api/modeles @param {object} ctx - Contexte. */
function listerModeles(ctx) {
  envoyerJson(ctx.res, 200, { modeles: ctx.depots.modeles.listerTous() });
}

/** POST /api/modeles : enregistre un nouveau modèle. @param {object} ctx - Contexte. */
async function creerModele(ctx) {
  const modele = await lireModele(ctx);
  if (ctx.depots.modeles.compter() >= MODELES_MAX) throw new ErreurHttp(409, `Limite de ${MODELES_MAX} modèles atteinte.`);
  modele.id = nouvelId('m');
  ctx.depots.modeles.creer(modele);
  envoyerJson(ctx.res, 201, { modele });
}

/** PUT /api/modeles/:id : met à jour un modèle enregistré. @param {object} ctx - Contexte. */
async function modifierModele(ctx) {
  verifierExistence(ctx);
  const modele = await lireModele(ctx);
  modele.id = ctx.params.id;
  if (estModeleDeBase(modele)) throw new ErreurHttp(403, 'Les modèles de base ne sont pas modifiables.');
  ctx.depots.modeles.modifier(modele);
  envoyerJson(ctx.res, 200, { modele });
}

/**
 * DELETE /api/modeles/:id : supprime un modèle ; les cartes qui
 * l'utilisaient passent sur le premier modèle de base.
 * @param {object} ctx - Contexte.
 */
function supprimerModele(ctx) {
  verifierExistence(ctx);
  transaction(ctx.base, () => {
    ctx.depots.personnes.remplacerModele(ctx.params.id, MODELES_DE_BASE[0].id);
    ctx.depots.modeles.supprimer(ctx.params.id);
  });
  envoyerJson(ctx.res, 200, { ok: true, modeleRemplacant: MODELES_DE_BASE[0].id });
}

/**
 * Déclare les routes des modèles.
 * @param {import('../Http/Routeur.js').Routeur} routeur - Routeur.
 */
export function enregistrerRoutesModeles(routeur) {
  routeur.ajouter('GET', '/api/modeles', listerModeles);
  routeur.ajouter('POST', '/api/modeles', creerModele);
  routeur.ajouter('PUT', '/api/modeles/:id', modifierModele);
  routeur.ajouter('DELETE', '/api/modeles/:id', supprimerModele);
}
