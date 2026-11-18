/**
 * Serveur.js
 * Point d'entrée du serveur Card Pro (Node.js, sans dépendance externe).
 * Il sert l'application web et l'API JSON (personnes et modèles), avec
 * les contrôles de sécurité communs (en-têtes, origine, gestion d'erreurs).
 */

import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { lireConfiguration } from './Configuration.js';
import { ouvrirBase } from './Donnees/BaseDeDonnees.js';
import { creerDepotModeles } from './Donnees/DepotModeles.js';
import { creerDepotPersonnes } from './Donnees/DepotPersonnes.js';
import { ErreurHttp } from './Http/ErreurHttp.js';
import { envoyerJson } from './Http/Reponse.js';
import { appliquerEntetesSecurite, verifierOrigine } from './Http/Securite.js';
import { Routeur } from './Http/Routeur.js';
import { servirFichier } from './Http/FichiersStatiques.js';
import { enregistrerRoutesModeles } from './Routes/RoutesModeles.js';
import { enregistrerRoutesPersonnes } from './Routes/RoutesPersonnes.js';

/**
 * Crée le serveur HTTP (sans le démarrer).
 * @param {object} config - Configuration (voir Configuration.js).
 * @returns {http.Server} Serveur prêt à écouter.
 */
export function creerServeur(config) {
  const base = ouvrirBase(config.cheminBase);
  const depots = { modeles: creerDepotModeles(base), personnes: creerDepotPersonnes(base) };
  const routeur = new Routeur();
  routeur.ajouter('GET', '/api/sante', (ctx) => envoyerJson(ctx.res, 200, { ok: true }));
  enregistrerRoutesModeles(routeur);
  enregistrerRoutesPersonnes(routeur);

  const application = { config, base, depots, routeur };
  const serveur = http.createServer((req, res) => { traiterRequete(req, res, application); });
  serveur.on('close', () => base.close());
  return serveur;
}

/**
 * Traite une requête : API ou fichier statique, avec gestion des erreurs.
 * @param {http.IncomingMessage} req - Requête.
 * @param {http.ServerResponse} res - Réponse.
 * @param {object} application - Configuration, base, dépôts, routeur.
 */
async function traiterRequete(req, res, application) {
  appliquerEntetesSecurite(res);
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname.startsWith('/api/')) await traiterApi(req, res, pathname, application);
    else await servirFichier(req, res, pathname, application.config.racineStatique);
  } catch (erreur) {
    if (res.headersSent) {
      res.destroy();
    } else if (erreur instanceof ErreurHttp) {
      res.setHeader('Connection', 'close');
      envoyerJson(res, erreur.statut, { erreur: erreur.message });
    } else {
      // Le détail reste dans les journaux du serveur, jamais côté client.
      console.error('[CardPro] Erreur interne :', erreur);
      envoyerJson(res, 500, { erreur: 'Erreur interne du serveur.' });
    }
  }
}

/**
 * Vérifie l'origine des requêtes de modification puis appelle la route.
 * @param {http.IncomingMessage} req - Requête.
 * @param {http.ServerResponse} res - Réponse.
 * @param {string} chemin - Chemin de l'URL.
 * @param {object} application - Contexte global.
 */
async function traiterApi(req, res, chemin, application) {
  const route = application.routeur.trouver(req.method, chemin);
  if (!route) throw new ErreurHttp(404, 'Ressource introuvable.');
  const modifiante = req.method !== 'GET' && req.method !== 'HEAD';
  if (modifiante && !verifierOrigine(req)) throw new ErreurHttp(403, 'Origine de la requête refusée.');
  await route.gestionnaire({ ...application, req, res, params: route.params });
}

// Démarrage uniquement si le fichier est lancé directement (pas dans les tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = lireConfiguration();
  creerServeur(config).listen(config.port, () => {
    console.log(`[CardPro] Serveur démarré sur le port ${config.port}`);
  });
}
