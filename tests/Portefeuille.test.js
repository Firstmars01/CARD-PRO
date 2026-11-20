/**
 * Portefeuille.test.js
 * Tests du transfert vers le portefeuille mobile : Base45, paquet de carte
 * (images comprises), découpage en QR codes, GIF animé avec données cachées,
 * encodeur QR alphanumérique et liste des fichiers gardés hors ligne.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encoderBase45, decoderBase45 } from '../src/Utilitaires/Base45.js';
import { creerPaquet, lirePaquet, estPaquet } from '../src/Metier/PaquetCarte.js';
import { decouperPaquet, encoderTrames, lireTrame, AssembleurTransfert } from '../src/Metier/TransfertQr.js';
import { creerGifAnime } from '../src/Utilitaires/EncodeurGif.js';
import { extraireDonneesGif } from '../src/Utilitaires/LectureGif.js';
import { qrEnPixels } from '../src/Utilitaires/ImageQr.js';
import { compresser } from '../src/Utilitaires/Compression.js';
import { encoderTexteQr } from '../src/Utilitaires/EncodeurQr.js';
import { MODELES_DE_BASE } from '../src/Metier/ModelesDeBase.js';
import { PERSONNE_EXEMPLE } from '../src/Metier/Personne.js';
import { creerLienContact, lireLienContact } from '../src/Metier/LienContact.js';
import { encoderBase64Url, decoderBase64Url } from '../src/Utilitaires/Base64Url.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PNG = `data:image/png;base64,${readFileSync(path.join(RACINE, 'assets/icons/Icone192.png')).toString('base64')}`;

/**
 * Modèle de test avec une image de fond et un logo dans le QR.
 * @returns {object} Modèle.
 */
function modeleAvecImages() {
  const modele = structuredClone(MODELES_DE_BASE[0]);
  modele.recto.fond = { ...modele.recto.fond, type: 'image', image: PNG };
  const qr = modele.recto.elements.find((e) => e.type === 'qr');
  qr.logo = PNG;
  return modele;
}

test('Base45 : exemple de la norme et aller-retour', () => {
  assert.equal(encoderBase45(new TextEncoder().encode('AB')), 'BB8');
  assert.equal(encoderBase45(new TextEncoder().encode('Hello!!')), '%69 VD92EX0');
  const octets = Uint8Array.from({ length: 1001 }, (_, i) => (i * 37) % 256);
  assert.deepEqual(decoderBase45(encoderBase45(octets)), octets);
  assert.throws(() => decoderBase45('abc'));
  assert.throws(() => decoderBase45('GGW'));
});

test('paquet : carte complète avec images, aller-retour exact', async () => {
  const modele = modeleAvecImages();
  const paquet = await creerPaquet(PERSONNE_EXEMPLE, modele);
  assert.ok(estPaquet(paquet));
  const { personne, modele: lu } = await lirePaquet(paquet);
  assert.deepEqual(personne, PERSONNE_EXEMPLE);
  assert.equal(lu.recto.fond.image, PNG);
  assert.equal(lu.recto.elements.find((e) => e.type === 'qr').logo, PNG);
  assert.deepEqual(lu.verso, modele.verso);
});

test('paquet : fichiers invalides, corrompus ou piégés refusés', async () => {
  await assert.rejects(lirePaquet(new TextEncoder().encode('bonjour le monde')), /pas une carte/);
  const paquet = await creerPaquet(PERSONNE_EXEMPLE, MODELES_DE_BASE[1]);
  await assert.rejects(lirePaquet(paquet.slice(0, paquet.length - 10)), /corrompue|Données/);
  // Bombe de décompression : 10 Mo de zéros compressés en quelques Ko.
  const bombe = await compresser(new Uint8Array(10 * 1024 * 1024));
  const piege = new Uint8Array(5 + bombe.length);
  piege.set([0x43, 0x50, 0x52, 0x4f, 1]);
  piege.set(bombe, 5);
  await assert.rejects(lirePaquet(piege), /volumineuses/);
});

test('paquet : une image dont le contenu ne correspond pas au type est retirée', async () => {
  const modele = structuredClone(MODELES_DE_BASE[0]);
  modele.recto.fond = { ...modele.recto.fond, type: 'image', image: `data:image/png;base64,${Buffer.from('<svg onload=alert(1)>').toString('base64')}` };
  const { modele: lu } = await lirePaquet(await creerPaquet(PERSONNE_EXEMPLE, modele));
  assert.equal(lu.recto.fond.image, '');
});

test('transfert QR : ordre quelconque, doublons, autre carte au milieu', async () => {
  const paquet = await creerPaquet(PERSONNE_EXEMPLE, modeleAvecImages());
  const trames = decouperPaquet(paquet);
  assert.ok(trames.length > 3);
  const qrs = encoderTrames(trames);
  assert.ok(qrs.every((q) => q.version === qrs[0].version), 'tous les QR ont la même taille');

  const autre = decouperPaquet(await creerPaquet(PERSONNE_EXEMPLE, MODELES_DE_BASE[2]));
  const assembleur = new AssembleurTransfert();
  assembleur.ajouter(autre[0]);
  assert.equal(assembleur.ajouter('https://exemple.fr').etat, 'ignore');
  const ordre = [...trames.keys()].reverse();
  let resultat;
  for (const i of [ordre[0], ordre[0], ...ordre.slice(1)]) resultat = assembleur.ajouter(trames[i]);
  assert.equal(resultat.etat, 'termine');
  assert.deepEqual(resultat.paquet, paquet);
  assert.equal(lireTrame('CP1:###'), null);
});

test('GIF : QR animé lisible et carte cachée dans le fichier', async () => {
  const paquet = await creerPaquet(PERSONNE_EXEMPLE, modeleAvecImages());
  const images = encoderTrames(decouperPaquet(paquet)).map((qr) => qrEnPixels(qr, 2));
  const gif = creerGifAnime(images, { delai: 20, application: { identifiant: 'DRAWCARD1.0', octets: paquet } });
  assert.equal(new TextDecoder().decode(gif.subarray(0, 6)), 'GIF89a');
  assert.equal(gif[gif.length - 1], 0x3b);
  assert.deepEqual(extraireDonneesGif(gif, 'DRAWCARD1.0', 5e6), paquet);
  assert.equal(extraireDonneesGif(gif, 'AUTRE00001', 5e6), null);
  assert.equal(extraireDonneesGif(gif.subarray(0, 400), 'DRAWCARD1.0', 5e6), null);
  assert.equal(extraireDonneesGif(new Uint8Array(50), 'DRAWCARD1.0', 5e6), null);
  assert.equal(extraireDonneesGif(gif, 'DRAWCARD1.0', 100), null, 'taille maximale respectée');
});

test('encodeur QR : mode alphanumérique plus compact et version minimale', () => {
  const texte = 'CP1:'.padEnd(900, 'A');
  assert.ok(encoderTexteQr(texte, 'M').version < encoderTexteQr(texte.toLowerCase(), 'M').version);
  assert.equal(encoderTexteQr('ABC', 'M', { versionMin: 12 }).version, 12);
});

test('portefeuille : tous les fichiers nécessaires sont gardés hors ligne', () => {
  const sw = readFileSync(path.join(RACINE, 'portefeuille/sw.js'), 'utf8');
  const listes = [...sw.matchAll(/^ {2}'(\.{1,2}\/[^']*)',$/gm)].map((m) => path.resolve(RACINE, 'portefeuille', m[1]));
  // Parcourt les imports à partir du point d'entrée.
  const aVisiter = [path.join(RACINE, 'portefeuille/src/Main.js')];
  const modules = new Set();
  while (aVisiter.length) {
    const fichier = aVisiter.pop();
    if (modules.has(fichier)) continue;
    modules.add(fichier);
    const source = readFileSync(fichier, 'utf8');
    for (const [, cible] of source.matchAll(/from '(\.{1,2}\/[^']+)'/g)) aVisiter.push(path.resolve(path.dirname(fichier), cible));
  }
  modules.forEach((m) => assert.ok(listes.includes(m), `${path.relative(RACINE, m)} manque dans sw.js`));
  listes.filter((f) => !f.endsWith('jsQR.js') && !f.endsWith(`portefeuille${path.sep}`)).forEach((f) => assert.ok(existsSync(f), `${f} introuvable`));
});

test('lien contact (NFC iPhone) : aller-retour, validation et refus', async () => {
  const octets = Uint8Array.from({ length: 300 }, (_, i) => (i * 91) % 256);
  assert.deepEqual(decoderBase64Url(encoderBase64Url(octets)), octets);
  assert.throws(() => decoderBase64Url('abc+/='));

  assert.equal(await creerLienContact('', PERSONNE_EXEMPLE), '', 'pas de lien sans adresse du site');
  assert.equal(await creerLienContact('http://exemple.fr/', PERSONNE_EXEMPLE), '', 'HTTPS obligatoire');
  const lien = await creerLienContact('https://compte.github.io/depot/', PERSONNE_EXEMPLE);
  assert.match(lien, /^https:\/\/compte\.github\.io\/depot\/contact\/#[A-Za-z0-9_-]+$/);
  assert.ok(lien.length < 1500, 'lien assez court pour le NFC');
  assert.deepEqual(await lireLienContact(lien.slice(lien.indexOf('#'))), PERSONNE_EXEMPLE);

  // Un lien fabriqué à la main passe par les mêmes validations.
  const { compresser: comp } = await import('../src/Utilitaires/Compression.js');
  const piege = encoderBase64Url(await comp(new TextEncoder().encode(JSON.stringify({ prenom: 'Eve', siteWeb: 'javascript:alert(1)', liens: [{ libelle: 'x', url: 'data:text/html,1' }] }))));
  const lue = await lireLienContact(piege);
  assert.equal(lue.prenom, 'Eve');
  assert.equal(lue.siteWeb, '');
  assert.equal(lue.liens.length, 0);
  await assert.rejects(lireLienContact('#%%%'), /invalide/);
  await assert.rejects(lireLienContact(''), /invalide/);
});

test('portefeuille : tri (ma carte, favoris, puis ordre choisi) et sauvegarde revalidée', async () => {
  const { trierCartes } = await import('../portefeuille/src/Metier/TriCartes.js');
  const { creerSauvegarde, lireSauvegarde } = await import('../portefeuille/src/Metier/SauvegardePortefeuille.js');
  const carte = (id, prenom, entreprise, ajouteLe, options = {}) => ({
    id, ajouteLe, maCarte: false, favori: false, ...options, personne: { prenom, nom: '', entreprise, liens: [] }, modele: {},
  });
  const cartes = [
    carte('carte-aaaa1', 'Zoé', 'Beta', '2026-01-01T00:00:00Z'),
    carte('carte-aaaa2', 'Ana', 'Alpha', '2026-03-01T00:00:00Z'),
    carte('carte-aaaa3', 'Moi', 'Gamma', '2026-02-01T00:00:00Z', { maCarte: true }),
    carte('carte-aaaa4', 'Léo', 'Alpha', '2025-12-01T00:00:00Z', { favori: true }),
  ];
  const ids = (ordre) => trierCartes(cartes, ordre).map((c) => c.personne.prenom);
  assert.deepEqual(ids('recentes'), ['Moi', 'Léo', 'Ana', 'Zoé']);
  assert.deepEqual(ids('az'), ['Moi', 'Léo', 'Ana', 'Zoé']);
  assert.deepEqual(ids('entreprise'), ['Moi', 'Léo', 'Ana', 'Zoé']);
  assert.deepEqual(trierCartes(cartes.filter((c) => !c.maCarte && !c.favori), 'az').map((c) => c.personne.prenom), ['Ana', 'Zoé']);

  // Sauvegarde : relue et revalidée (champs dangereux nettoyés, doublons et cartes invalides retirés).
  const texte = creerSauvegarde([
    { ...cartes[0], personne: { prenom: 'Zoé', siteWeb: 'javascript:alert(1)' } },
    cartes[0], { id: '../pirate' }, { ...cartes[2], maCarte: 'oui' },
  ]);
  const relues = lireSauvegarde(texte);
  assert.equal(relues.length, 2);
  assert.equal(relues[0].personne.siteWeb, '');
  assert.equal(relues[1].maCarte, false);
  assert.throws(() => lireSauvegarde('{"format":"autre","cartes":[]}'), /pas une sauvegarde/);
  assert.throws(() => lireSauvegarde('pas du json'), /pas une sauvegarde/);
});

test('DrawCard : les cartes et sauvegardes créées sous l’ancien nom restent lisibles', async () => {
  const { creerPaquet, lirePaquet, estPaquet } = await import('../src/Metier/PaquetCarte.js');
  const { normaliserPersonne } = await import('../src/Metier/Personne.js');
  const { normaliserModele } = await import('../src/Metier/ModeleCarte.js');
  const { lireSauvegarde } = await import('../portefeuille/src/Metier/SauvegardePortefeuille.js');
  const paquet = await creerPaquet(normaliserPersonne({ prenom: 'Lou' }), normaliserModele({ nom: 'M' }));
  assert.equal(new TextDecoder().decode(paquet.subarray(0, 4)), 'DRWC');
  const ancien = paquet.slice();
  ancien.set([0x43, 0x50, 0x52, 0x4f], 0); // « CPRO »
  assert.ok(estPaquet(ancien));
  assert.equal((await lirePaquet(ancien)).personne.prenom, 'Lou');
  const carte = { id: 'carte-ancienne1', ajouteLe: '', personne: { prenom: 'Ana' }, modele: {} };
  assert.equal(lireSauvegarde(JSON.stringify({ format: 'cardpro-portefeuille', version: 1, cartes: [carte] })).length, 1);
});
