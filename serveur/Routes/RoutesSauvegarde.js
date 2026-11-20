/**
 * RoutesSauvegarde.js
 * Sauvegarde et restauration de toutes les données (modèles enregistrés,
 * entreprises et personnes) dans un seul fichier JSON. La restauration
 * remplace tout, en une transaction, après avoir tout revalidé.
 * Les sauvegardes de la version 1 (sans entreprises) restent acceptées.
 */

import { normaliserModele, estModeleDeBase } from '../../src/Metier/ModeleCarte.js';
import { MODELES_DE_BASE } from '../../src/Metier/ModelesDeBase.js';
import { normaliserPersonne } from '../../src/Metier/Personne.js';
import { normaliserEntreprise, ENTREPRISES_MAX } from '../../src/Metier/Entreprise.js';
import { nouvelId, idValide } from '../../src/Utilitaires/Schema.js';
import { ErreurHttp } from '../Http/ErreurHttp.js';
import { lireCorpsJson } from '../Http/Requete.js';
import { envoyerJson } from '../Http/Reponse.js';
import { transaction } from '../Donnees/BaseDeDonnees.js';
import { MODELES_MAX } from './RoutesModeles.js';
import { PERSONNES_MAX } from './RoutesPersonnes.js';

export const FORMAT_SAUVEGARDE = 'cardpro-sauvegarde';
const VERSION_SAUVEGARDE = 2;
// 200 modèles avec images + 5 000 personnes.
const LIMITE_CORPS = 64 * 1024 * 1024;

/** GET /api/sauvegarde : toutes les données. @param {object} ctx - Contexte. */
function exporter(ctx) {
  envoyerJson(ctx.res, 200, {
    format: FORMAT_SAUVEGARDE,
    version: VERSION_SAUVEGARDE,
    creeLe: new Date().toISOString(),
    modeles: ctx.depots.modeles.listerTous(),
    entreprises: ctx.depots.entreprises.listerToutes(),
    personnes: ctx.depots.personnes.listerToutes(),
  });
}

/**
 * Valide les modèles d'une sauvegarde (identifiants uniques, sans les modèles de base).
 * @param {unknown[]} bruts - Modèles reçus.
 * @returns {object[]} Modèles propres.
 */
function validerModeles(bruts) {
  const vus = new Set();
  return bruts.map(normaliserModele).filter((m) => {
    if (estModeleDeBase(m)) return false;
    if (vus.has(m.id)) m.id = nouvelId('m');
    vus.add(m.id);
    return true;
  });
}

/**
 * Valide les entreprises d'une sauvegarde (identifiants uniques).
 * @param {unknown[]} brutes - Entreprises reçues.
 * @returns {object[]} Entreprises propres.
 */
function validerEntreprises(brutes) {
  const vus = new Set();
  return brutes.map(normaliserEntreprise).filter((e) => {
    if (!e || vus.has(e.id)) return false;
    vus.add(e.id);
    return true;
  });
}

/**
 * Valide les personnes d'une sauvegarde (modèle existant, sinon modèle par
 * défaut ; entreprise existante, sinon réglage personnalisé).
 * @param {unknown[]} brutes - Entrées reçues { id, modeleId, entrepriseId, personne }.
 * @param {Set<string>} modelesConnus - Identifiants des modèles disponibles.
 * @param {Set<string>} entreprisesConnues - Identifiants des entreprises restaurées.
 * @returns {object[]} Entrées propres.
 */
function validerPersonnes(brutes, modelesConnus, entreprisesConnues) {
  const vus = new Set();
  return brutes.map((brute) => {
    const entree = brute && typeof brute === 'object' ? brute : {};
    let id = idValide(entree.id) ? entree.id : nouvelId('p');
    if (vus.has(id)) id = nouvelId('p');
    vus.add(id);
    const modeleId = modelesConnus.has(entree.modeleId) ? entree.modeleId : MODELES_DE_BASE[0].id;
    const entrepriseId = entreprisesConnues.has(entree.entrepriseId) ? entree.entrepriseId : '';
    return { id, modeleId, entrepriseId, personne: normaliserPersonne(entree.personne) };
  });
}

/** POST /api/sauvegarde : remplace toutes les données. @param {object} ctx - Contexte. */
async function restaurer(ctx) {
  const corps = await lireCorpsJson(ctx.req, LIMITE_CORPS);
  if (corps?.format !== FORMAT_SAUVEGARDE || !Array.isArray(corps.modeles) || !Array.isArray(corps.personnes)) {
    throw new ErreurHttp(400, "Ce fichier n'est pas une sauvegarde Card Pro.");
  }
  if (corps.version > VERSION_SAUVEGARDE) throw new ErreurHttp(400, 'Sauvegarde créée par une version plus récente de Card Pro.');
  if (corps.modeles.length > MODELES_MAX) throw new ErreurHttp(413, `Maximum ${MODELES_MAX} modèles.`);
  if (corps.personnes.length > PERSONNES_MAX) throw new ErreurHttp(413, `Maximum ${PERSONNES_MAX} personnes.`);
  const entreprisesBrutes = Array.isArray(corps.entreprises) ? corps.entreprises : [];
  if (entreprisesBrutes.length > ENTREPRISES_MAX) throw new ErreurHttp(413, `Maximum ${ENTREPRISES_MAX} entreprises.`);

  const modeles = validerModeles(corps.modeles);
  const entreprises = validerEntreprises(entreprisesBrutes);
  const connus = new Set([...MODELES_DE_BASE.map((m) => m.id), ...modeles.map((m) => m.id)]);
  const personnes = validerPersonnes(corps.personnes, connus, new Set(entreprises.map((e) => e.id)));

  transaction(ctx.base, () => {
    ctx.depots.personnes.toutSupprimer();
    ctx.depots.modeles.toutSupprimer();
    ctx.depots.entreprises.toutSupprimer();
    modeles.forEach((m) => ctx.depots.modeles.creer(m));
    entreprises.forEach((e) => ctx.depots.entreprises.creer(e));
    personnes.forEach((p) => ctx.depots.personnes.creer(p));
  });
  envoyerJson(ctx.res, 200, { modeles: modeles.length, entreprises: entreprises.length, personnes: personnes.length });
}

/**
 * Déclare les routes de sauvegarde.
 * @param {import('../Http/Routeur.js').Routeur} routeur - Routeur.
 */
export function enregistrerRoutesSauvegarde(routeur) {
  routeur.ajouter('GET', '/api/sauvegarde', exporter);
  routeur.ajouter('POST', '/api/sauvegarde', restaurer);
}
