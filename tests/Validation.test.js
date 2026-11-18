/**
 * Validation.test.js
 * Tests du nettoyage et de la validation des entrées utilisateur.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nettoyerTexte, normaliserEmail, normaliserTelephone, normaliserUrl,
  normaliserCouleur, normaliserImageDataUrl, nomFichierSur,
} from '../src/Utilitaires/Validation.js';

import { contraste, verifierLisibiliteQr } from '../src/Utilitaires/Couleurs.js';

test('nettoyerTexte supprime les caractères de contrôle et coupe la longueur', () => {
  assert.equal(nettoyerTexte('  Jean\r\nBEGIN:VCARD\u0000  '), 'Jean BEGIN:VCARD');
  assert.equal(nettoyerTexte('a'.repeat(200), 10), 'a'.repeat(10));
  assert.equal(nettoyerTexte({ objet: true }), '');
});

test('normaliserEmail accepte les e-mails valides seulement', () => {
  assert.equal(normaliserEmail(' Jean@Exemple.FR '), 'jean@exemple.fr');
  assert.equal(normaliserEmail('pas-un-email'), '');
  assert.equal(normaliserEmail('a@b.c"><script>'), '');
});

test('normaliserTelephone refuse les lettres', () => {
  assert.equal(normaliserTelephone('+33 6 12 34 56 78'), '+33 6 12 34 56 78');
  assert.equal(normaliserTelephone('06abc'), '');
});

test('normaliserUrl bloque les protocoles dangereux', () => {
  assert.equal(normaliserUrl('exemple.fr'), 'https://exemple.fr/');
  assert.equal(normaliserUrl('javascript:alert(1)'), '');
  assert.equal(normaliserUrl('data:text/html,<b>x</b>'), '');
  assert.equal(normaliserUrl('https://user:mdp@exemple.fr'), '');
  assert.equal(normaliserUrl('http://localhost'), '');
});

test('normaliserCouleur et normaliserImageDataUrl', () => {
  assert.equal(normaliserCouleur('#ABCDEF', '#000000'), '#abcdef');
  assert.equal(normaliserCouleur('red;background:url(x)', '#000000'), '#000000');
  assert.equal(normaliserImageDataUrl('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
  assert.equal(normaliserImageDataUrl('data:image/svg+xml;base64,PHN2Zz4='), '');
});

test('nomFichierSur produit un nom sans caractères spéciaux', () => {
  assert.equal(nomFichierSur('Élodie Dupré/../x'), 'Elodie-Dupre-x');
  assert.equal(nomFichierSur(''), 'carte');
});


test('contraste et lisibilité du QR', () => {
  assert.ok(contraste('#000000', '#ffffff') > 20);
  assert.equal(verifierLisibiliteQr('#000000', '#ffffff').length, 0);
  assert.equal(verifierLisibiliteQr('#cccccc', '#ffffff').length, 1);
  assert.equal(verifierLisibiliteQr('#ffffff', '#000000').length, 1);
});
