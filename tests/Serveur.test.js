/**
 * Serveur.test.js
 * Tests de l'API avec un vrai serveur HTTP et une base en mémoire :
 * personnes, import, modèles, validation, origine et fichiers.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { creerServeur } from '../serveur/Serveur.js';
import { lireConfiguration } from '../serveur/Configuration.js';
import { MODELES_DE_BASE } from '../src/Metier/ModelesDeBase.js';

let serveur;
let base;

/**
 * Appelle l'API comme le ferait le navigateur (même origine).
 * @param {string} methode - Méthode HTTP.
 * @param {string} chemin - Chemin.
 * @param {unknown} [corps] - Corps JSON.
 * @param {object} [entetes] - En-têtes supplémentaires.
 * @returns {Promise<{statut:number, donnees:any}>} Réponse.
 */
async function appeler(methode, chemin, corps, entetes = {}) {
  const reponse = await fetch(base + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', Origin: base, ...entetes },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  return { statut: reponse.status, donnees: await reponse.json() };
}

before(async () => {
  serveur = creerServeur({ ...lireConfiguration({}), cheminBase: ':memory:' });
  await new Promise((resoudre) => serveur.listen(0, '127.0.0.1', resoudre));
  base = `http://127.0.0.1:${serveur.address().port}`;
});

after(() => new Promise((resoudre) => serveur.close(resoudre)));

test('personnes : ajout validé, modification, suppression', async () => {
  const cree = await appeler('POST', '/api/personnes', { personne: { prenom: 'Alice', siteWeb: 'javascript:alert(1)' }, modeleId: 'inconnu' });
  assert.equal(cree.statut, 201);
  assert.equal(cree.donnees.personne.siteWeb, '');
  assert.equal(cree.donnees.modeleId, MODELES_DE_BASE[0].id);
  const { id } = cree.donnees;
  const modif = await appeler('PUT', `/api/personnes/${id}`, { personne: { prenom: 'Alicia' }, modeleId: 'base-neon' });
  assert.equal(modif.donnees.modeleId, 'base-neon');
  assert.equal((await appeler('GET', '/api/personnes')).donnees.personnes[0].personne.prenom, 'Alicia');
  assert.equal((await appeler('DELETE', `/api/personnes/${id}`)).statut, 200);
  assert.equal((await appeler('DELETE', `/api/personnes/${id}`)).statut, 404);
});

test('import en lot', async () => {
  const liste = Array.from({ length: 3 }, (_, i) => ({ prenom: `P${i}`, email: `p${i}@exemple.fr` }));
  const importe = await appeler('POST', '/api/personnes/import', { personnes: liste, modeleId: 'base-ocean' });
  assert.equal(importe.statut, 201);
  assert.equal(importe.donnees.personnes.length, 3);
  assert.equal((await appeler('POST', '/api/personnes/import', { personnes: [] })).statut, 400);
});

test('modèles : création, modification, suppression avec remplacement', async () => {
  const cree = await appeler('POST', '/api/modeles', {
    modele: { id: 'base-pirate', nom: 'Delta', recto: { elements: [{ type: 'texte', x: 10 }, { type: 'inconnu' }] } },
  });
  assert.equal(cree.statut, 201);
  const modele = cree.donnees.modele;
  assert.match(modele.id, /^m-/);
  assert.equal(modele.recto.elements.length, 1);
  const personne = await appeler('POST', '/api/personnes', { personne: { prenom: 'Bob' }, modeleId: modele.id });
  assert.equal(personne.donnees.modeleId, modele.id);
  const renomme = await appeler('PUT', `/api/modeles/${modele.id}`, { modele: { ...modele, nom: 'Delta 2' } });
  assert.equal(renomme.donnees.modele.nom, 'Delta 2');
  assert.equal((await appeler('PUT', '/api/modeles/base-classique', { modele })).statut, 404);
  assert.equal((await appeler('DELETE', `/api/modeles/${modele.id}`)).statut, 200);
  const apres = (await appeler('GET', '/api/personnes')).donnees.personnes.find((p) => p.id === personne.donnees.id);
  assert.equal(apres.modeleId, MODELES_DE_BASE[0].id);
});

test('protections : origine étrangère, mauvais format, fichiers sensibles', async () => {
  assert.equal((await appeler('POST', '/api/personnes', { personne: {} }, { Origin: 'http://pirate.exemple' })).statut, 403);
  const texte = await fetch(`${base}/api/personnes`, { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: base }, body: '{}' });
  assert.equal(texte.status, 415);
  const accueil = await fetch(`${base}/`);
  assert.equal(accueil.status, 200);
  assert.match(accueil.headers.get('content-security-policy'), /default-src 'self'/);
  for (const chemin of ['/serveur/Serveur.js', '/package.json', '/.env', '/src/%2e%2e/serveur/Serveur.js', '/donnees/cardpro.sqlite']) {
    assert.equal((await fetch(base + chemin)).status, 404, chemin);
  }
});

test('portefeuille : servi avec la caméra autorisée, redirection du « / » final', async () => {
  const page = await fetch(`${base}/portefeuille/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('permissions-policy'), /camera=\(self\)/);
  const redirection = await fetch(`${base}/portefeuille`, { redirect: 'manual' });
  assert.equal(redirection.status, 301);
  assert.equal(redirection.headers.get('location'), '/portefeuille/');
  // La page des RH n'a toujours pas accès à la caméra.
  assert.match((await fetch(`${base}/`)).headers.get('permissions-policy'), /camera=\(\)/);
  assert.equal((await fetch(`${base}/portefeuille/../serveur/Serveur.js`)).status, 404);
});

test("configuration : adresse de l'appli mobile en HTTPS uniquement", async () => {
  assert.equal(lireConfiguration({ LIEN_PORTEFEUILLE: 'https://exemple.github.io/app/portefeuille/' }).lienPortefeuille, 'https://exemple.github.io/app/portefeuille/');
  assert.equal(lireConfiguration({ LIEN_PORTEFEUILLE: 'http://exemple.fr/' }).lienPortefeuille, '');
  assert.equal(lireConfiguration({ LIEN_PORTEFEUILLE: 'javascript:alert(1)' }).lienPortefeuille, '');
  assert.deepEqual((await appeler('GET', '/api/configuration')).donnees, { lienPortefeuille: '' });
});
