/**
 * Metier.test.js
 * Tests de la logique métier : personnes, éléments, modèles, vCard,
 * import CSV, ZIP et encodeur de QR code.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliserPersonne, valeurChamp, PERSONNE_EXEMPLE } from '../src/Metier/Personne.js';
import { normaliserElement, creerElementCarte } from '../src/Metier/Elements.js';
import { normaliserModele, ELEMENTS_MAX } from '../src/Metier/ModeleCarte.js';
import { MODELES_DE_BASE } from '../src/Metier/ModelesDeBase.js';
import { genererVCard } from '../src/Metier/GenerateurVCard.js';
import { convertirLignes } from '../src/Metier/ImportPersonnes.js';
import { lireCsv } from '../src/Utilitaires/Csv.js';
import { crc32, creerZip } from '../src/Utilitaires/Zip.js';
import { encoderTexteQr } from '../src/Utilitaires/EncodeurQr.js';

test('personne : liens dangereux filtrés et champs calculés', () => {
  const p = normaliserPersonne({ prenom: 'Clément', nom: 'Marie', codePostal: '75011', ville: 'Paris', liens: [{ libelle: 'X', url: 'javascript:alert(1)' }] });
  assert.equal(p.liens.length, 0);
  assert.equal(valeurChamp(p, 'nomComplet'), 'Clément Marie');
  assert.equal(valeurChamp(p, 'villeComplete'), '75011 Paris');
  assert.equal(valeurChamp(PERSONNE_EXEMPLE, 'siteWeb'), 'exemple.fr');
});

test('éléments : type inconnu refusé, valeurs bornées, préfixe avec espace', () => {
  assert.equal(normaliserElement({ type: 'script' }), null);
  const e = normaliserElement({ type: 'texte', x: 99999, couleur: 'red;', champ: '__proto__', prefixe: 'Tél. ' });
  assert.equal(e.x, 850);
  assert.equal(e.couleur, '#1d2430');
  assert.equal(e.champ, 'nomComplet');
  assert.equal(e.prefixe, 'Tél. ');
  assert.equal(normaliserElement({ type: 'image', image: 'data:image/svg+xml;base64,PHN2Zz4=' }).image, '');
  assert.notEqual(creerElementCarte('qr').id, creerElementCarte('qr').id);
});

test('modèles : faces validées, nombre d\'éléments limité, ids uniques', () => {
  const elements = Array.from({ length: ELEMENTS_MAX + 10 }, () => ({ type: 'forme', id: 'meme-id' }));
  const m = normaliserModele({ nom: '<b>Test</b>', recto: { elements }, verso: { fond: { type: 'pirate' } } });
  assert.equal(m.recto.elements.length, ELEMENTS_MAX);
  assert.equal(new Set(m.recto.elements.map((e) => e.id)).size, ELEMENTS_MAX);
  assert.equal(m.verso.fond.type, 'uni');
  assert.equal(MODELES_DE_BASE.length, 6);
  MODELES_DE_BASE.forEach((base) => assert.ok(base.id.startsWith('base-') && base.recto.elements.length > 0));
});

test('vCard : valide et sans injection de propriété', () => {
  const vcard = genererVCard(normaliserPersonne({ nom: 'X\r\nTEL:0000', entreprise: 'A;B,C' }));
  assert.ok(vcard.startsWith('BEGIN:VCARD\r\nVERSION:3.0'));
  assert.ok(!vcard.includes('\r\nTEL:0000'));
  assert.ok(vcard.includes('ORG:A\\;B\\,C'));
});

test('import CSV : colonnes reconnues, guillemets, lignes vides', () => {
  const csv = '﻿Prénom;Nom;E-mail;Inconnue\r\n"Jean";"Dupont; fils";jean@exemple.fr;x\r\n;;;\r\nSophie;Bernard;pas-un-mail;y\r\n';
  const { personnes, colonnesIgnorees } = convertirLignes(lireCsv(csv));
  assert.equal(personnes.length, 2);
  assert.equal(personnes[0].nom, 'Dupont; fils');
  assert.equal(personnes[1].email, '');
  assert.deepEqual(colonnesIgnorees, ['Inconnue']);
  assert.throws(() => convertirLignes(lireCsv('Truc;Machin\na;b')));
});

test('ZIP : CRC-32 correct et signature valide', async () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const zip = new Uint8Array(await creerZip([{ nom: 'a.txt', donnees: new TextEncoder().encode('bonjour') }]).arrayBuffer());
  assert.deepEqual(Array.from(zip.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
});

test('QR : taille de grille cohérente et limite de capacité', () => {
  const qr = encoderTexteQr('Bonjour');
  assert.equal(qr.version, 1);
  assert.equal(qr.taille, 21);
  assert.throws(() => encoderTexteQr('x'.repeat(5000)));
});
