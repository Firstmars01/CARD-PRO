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
  const gif = creerGifAnime(images, { delai: 20, application: { identifiant: 'CARDPRO1.0', octets: paquet } });
  assert.equal(new TextDecoder().decode(gif.subarray(0, 6)), 'GIF89a');
  assert.equal(gif[gif.length - 1], 0x3b);
  assert.deepEqual(extraireDonneesGif(gif, 'CARDPRO1.0', 5e6), paquet);
  assert.equal(extraireDonneesGif(gif, 'AUTRE00001', 5e6), null);
  assert.equal(extraireDonneesGif(gif.subarray(0, 400), 'CARDPRO1.0', 5e6), null);
  assert.equal(extraireDonneesGif(new Uint8Array(50), 'CARDPRO1.0', 5e6), null);
  assert.equal(extraireDonneesGif(gif, 'CARDPRO1.0', 100), null, 'taille maximale respectée');
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
