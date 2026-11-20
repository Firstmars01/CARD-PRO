/**
 * RoutesEntreprises.js
 * Routes des entreprises : liste, création, modification et suppression.
 * Une entreprise encore reliée à des cartes ne peut pas être supprimée.
 */

import { normaliserEntreprise, ENTREPRISES_MAX } from '../../src/Metier/Entreprise.js';
import { nouvelId } from '../../src/Utilitaires/Schema.js';
import { ErreurHttp } from '../Http/ErreurHttp.js';
import { lireCorpsJson } from '../Http/Requete.js';
import { envoyerJson } from '../Http/Reponse.js';

// Une entreprise contient un logo (≈ 1 Mo maximum).
const LIMITE_CORPS = 2 * 1024 * 1024;

/**
 * Lit et valide l'entreprise envoyée, avec l'identifiant voulu.
 * @param {object} ctx - Contexte de la requête.
 * @param {string} id - Identifiant à utiliser.
 * @returns {Promise<object>} Entreprise normalisée.
 */
async function lireEntreprise(ctx, id) {
  const corps = await lireCorpsJson(ctx.req, LIMITE_CORPS);
  if (!corps || typeof corps.entreprise !== 'object') throw new ErreurHttp(400, 'Entreprise manquante.');
  return normaliserEntreprise({ ...corps.entreprise, id });
}

/**
 * Vérifie qu'une entreprise existe.
 * @param {object} ctx - Contexte de la requête.
 * @throws {ErreurHttp} 404 si introuvable.
 */
function verifierExistence(ctx) {
  if (!ctx.depots.entreprises.existe(ctx.params.id)) throw new ErreurHttp(404, 'Entreprise introuvable.');
}

/** GET /api/entreprises @param {object} ctx - Contexte. */
function listerEntreprises(ctx) {
  envoyerJson(ctx.res, 200, { entreprises: ctx.depots.entreprises.listerToutes() });
}

/** POST /api/entreprises : ajoute une entreprise. @param {object} ctx - Contexte. */
async function creerEntreprise(ctx) {
  const entreprise = await lireEntreprise(ctx, nouvelId('e'));
  if (ctx.depots.entreprises.compter() >= ENTREPRISES_MAX) throw new ErreurHttp(409, `Limite de ${ENTREPRISES_MAX} entreprises atteinte.`);
  ctx.depots.entreprises.creer(entreprise);
  envoyerJson(ctx.res, 201, { entreprise });
}

/** PUT /api/entreprises/:id : modifie une entreprise. @param {object} ctx - Contexte. */
async function modifierEntreprise(ctx) {
  verifierExistence(ctx);
  const entreprise = await lireEntreprise(ctx, ctx.params.id);
  ctx.depots.entreprises.modifier(entreprise);
  envoyerJson(ctx.res, 200, { entreprise });
}

/** DELETE /api/entreprises/:id : supprime une entreprise sans carte reliée. @param {object} ctx - Contexte. */
function supprimerEntreprise(ctx) {
  verifierExistence(ctx);
  const reliees = ctx.depots.personnes.compterParEntreprise(ctx.params.id);
  if (reliees > 0) throw new ErreurHttp(409, `Impossible : ${reliees} carte(s) sont reliées à cette entreprise.`);
  ctx.depots.entreprises.supprimer(ctx.params.id);
  envoyerJson(ctx.res, 200, { ok: true });
}

/**
 * Déclare les routes des entreprises.
 * @param {import('../Http/Routeur.js').Routeur} routeur - Routeur.
 */
export function enregistrerRoutesEntreprises(routeur) {
  routeur.ajouter('GET', '/api/entreprises', listerEntreprises);
  routeur.ajouter('POST', '/api/entreprises', creerEntreprise);
  routeur.ajouter('PUT', '/api/entreprises/:id', modifierEntreprise);
  routeur.ajouter('DELETE', '/api/entreprises/:id', supprimerEntreprise);
}
