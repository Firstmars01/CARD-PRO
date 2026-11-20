/**
 * Metier.test.js
 * Tests de la logique métier : personnes, éléments, styles, alignement,
 * modèles, vCard, import CSV, ZIP et encodeur de QR code.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliserPersonne, valeurChamp, PERSONNE_EXEMPLE } from '../src/Metier/Personne.js';
import { normaliserElement, creerElementCarte, extraireStyle, appliquerStyle } from '../src/Metier/Elements.js';
import { aligner, centrerSurCarte, repartir, boiteEnglobante, toucheCadre, zoneCarte } from '../src/Metier/Alignement.js';
import { dimensionsModele, enPixels, adapterElements } from '../src/Metier/Formats.js';
import { remplacerCouleur, couleursPrincipales } from '../src/Metier/Palette.js';
import { cheminForme, rectangleArrondi } from '../src/Utilitaires/Formes.js';
import * as Edition from '../src/Interface/Modeles/EtatEdition.js';
import { normaliserModele, ELEMENTS_MAX } from '../src/Metier/ModeleCarte.js';
import { MODELES_DE_BASE } from '../src/Metier/ModelesDeBase.js';
import { genererVCard } from '../src/Metier/GenerateurVCard.js';
import { adresseQrElement, qrPourElement, avertissementsQrElement } from '../src/Metier/ContenuQr.js';
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
  assert.equal(e.x, 2000);
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
  assert.equal(MODELES_DE_BASE.length, 8);
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

test('style : copié d\'un texte, appliqué sans toucher au contenu ni à la position', () => {
  const source = creerElementCarte('texte', { taille: 60, couleur: '#ff0000', police: 'mono', champ: 'poste' });
  const cible = creerElementCarte('texte', { x: 100, champ: 'email' });
  const resultat = appliquerStyle(cible, extraireStyle(source));
  assert.equal(resultat.taille, 60);
  assert.equal(resultat.couleur, '#ff0000');
  assert.equal(resultat.champ, 'email');
  assert.equal(resultat.x, 100);
  const forme = appliquerStyle(creerElementCarte('forme', { opacite: 100 }), { ...extraireStyle(source), opacite: 40 });
  assert.equal(forme.opacite, 40);
  assert.equal(forme.police, undefined);
});

test('alignement, centrage, répartition et sélection au cadre', () => {
  const a = { id: 'a', x: 10, y: 10, largeur: 100, hauteur: 20 };
  const b = { id: 'b', x: 200, y: 50, largeur: 50, hauteur: 20 };
  const c = { id: 'c', x: 600, y: 90, largeur: 100, hauteur: 20 };
  assert.deepEqual(aligner([a], 'centreH', zoneCarte({ largeur: 850, hauteur: 550 })), [{ id: 'a', x: 375, y: 10 }]);
  assert.deepEqual(aligner([a, b], 'gauche', boiteEnglobante([a, b])).map((p) => p.x), [10, 10]);
  assert.deepEqual(aligner([a, b], 'bas', boiteEnglobante([a, b])).map((p) => p.y), [50, 50]);
  const centres = centrerSurCarte([a, c], 'horizontal', { largeur: 850, hauteur: 550 });
  assert.equal(centres[1].x - centres[0].x, c.x - a.x);
  assert.equal(boiteEnglobante(centres.map((p, i) => ({ ...[a, c][i], ...p }))).x, 80);
  assert.deepEqual(repartir([a, b, c], 'horizontal').map((p) => p.x), [10, 330, 600]);
  assert.ok(toucheCadre(b, { x: 190, y: 40, largeur: 20, hauteur: 20 }));
  assert.ok(!toucheCadre(c, { x: 0, y: 0, largeur: 100, hauteur: 100 }));
});

test('QR des liens : adresse du bon lien, rien si le lien est absent', () => {
  const p = normaliserPersonne({ siteWeb: 'exemple.fr', liens: [{ libelle: 'LinkedIn', url: 'https://linkedin.com/in/x' }] });
  const lien1 = creerElementCarte('qr', { contenu: 'lien', numeroLien: 1 });
  const lien2 = creerElementCarte('qr', { contenu: 'lien', numeroLien: 2 });
  assert.equal(adresseQrElement(p, lien1), 'https://linkedin.com/in/x');
  assert.equal(adresseQrElement(p, creerElementCarte('qr', { contenu: 'siteWeb' })), 'https://exemple.fr/');
  assert.equal(qrPourElement(p, lien2, null), null);
  assert.ok(qrPourElement(p, lien1, null).taille >= 21);
  assert.equal(valeurChamp(p, 'lien1'), 'LinkedIn');
  assert.equal(valeurChamp(p, 'lien2'), '');
  assert.equal(normaliserElement({ type: 'qr', contenu: 'pirate', numeroLien: 99 }).numeroLien, 8);
});

test('formats : dimensions, orientation, pixels et adaptation des éléments', () => {
  assert.deepEqual(dimensionsModele({ format: 'standard', orientation: 'portrait' }), { largeur: 550, hauteur: 850 });
  assert.deepEqual(dimensionsModele({ format: 'inconnu' }), { largeur: 850, hauteur: 550 });
  assert.deepEqual(enPixels({ largeur: 850, hauteur: 550 }), { largeur: 1004, hauteur: 650 });
  const [e] = adapterElements([{ x: 400, y: 250, largeur: 50, hauteur: 50, taille: 40 }], { largeur: 850, hauteur: 550 }, { largeur: 550, hauteur: 850 });
  assert.equal(e.x + e.largeur / 2, Math.round(425 * 550 / 850));
  assert.ok(e.largeur < 50 && e.taille < 40);
});

test('palette : remplacement partout et couleurs principales', () => {
  const m = normaliserModele({ recto: { fond: { couleur1: '#111111' }, elements: [{ type: 'texte', couleur: '#111111' }, { type: 'forme', remplissage: '#222222' }] } });
  assert.equal(remplacerCouleur(m, '#111111', '#abcdef'), 2);
  assert.equal(m.recto.fond.couleur1, '#abcdef');
  assert.equal(m.recto.elements[0].couleur, '#abcdef');
  assert.ok(!couleursPrincipales(m).includes('#000000'));
});

test('formes : tracés valides', () => {
  const base = { x: 0, y: 0, largeur: 100, hauteur: 100, cotes: 5, arrondiHG: 10, arrondiHD: 0, arrondiBD: 30, arrondiBG: 0 };
  for (const forme of ['triangle', 'losange', 'etoile', 'polygone', 'vague', 'fleche', 'rectangle']) {
    assert.match(cheminForme({ ...base, forme }), /^M[-\d. ]+.*Z$/, forme);
  }
  assert.ok(rectangleArrondi(0, 0, 10, 10, [100, 100, 100, 100]).includes('A5 5'));
});

test('QR avec logo : niveau de correction H', () => {
  const p = normaliserPersonne({ prenom: 'A', liens: [{ libelle: 'Site', url: 'https://exemple.fr' }] });
  const logo = 'data:image/png;base64,iVBORw0KGgo=';
  const qr = qrPourElement(p, creerElementCarte('qr', { contenu: 'lien', logo }), null);
  assert.equal(qr.niveau, 'H');
  assert.deepEqual(avertissementsQrElement(qr, { logo, styleYeux: 'carre' }), []);
  assert.equal(avertissementsQrElement(qr, { logo, styleYeux: 'rond' }).length, 1);
});

test('éditeur : groupes, verrouillage, palette et changement de format', () => {
  Edition.chargerModele(normaliserModele({ recto: { elements: [
    { type: 'forme', id: 'a', x: 10, y: 10, remplissage: '#123456' },
    { type: 'forme', id: 'b', x: 300, y: 10 },
    { type: 'forme', id: 'c', x: 500, y: 10, verrouille: true },
  ] } }));
  Edition.selectionnerPlusieurs(['a', 'b']);
  assert.ok(Edition.grouperSelection());
  Edition.selectionner('a');
  assert.deepEqual(Edition.obtenirEdition().selectionIds.sort(), ['a', 'b']);
  Edition.selectionnerPlusieurs(['c']);
  Edition.alignerSelection('gauche');
  assert.equal(Edition.elementsFace().find((e) => e.id === 'c').x, 500);
  Edition.modifierModele({ palette1: Edition.obtenirEdition().modele.palette1 });
  Edition.modifierModele({ palette2: '#2563eb' });
  const avant = Edition.obtenirEdition().modele.palette2;
  Edition.modifierModele({ palette2: '#ff0000' });
  assert.equal(avant, '#2563eb');
  Edition.modifierModele({ orientation: 'portrait' });
  assert.deepEqual(Edition.dimensions(), { largeur: 550, hauteur: 850 });
  assert.ok(Edition.elementsFace().every((e) => e.x + e.largeur / 2 <= 550));
});

test('éditeur : changer plusieurs fois de format ne déforme pas la carte', () => {
  Edition.chargerModele(normaliserModele({ recto: { elements: [
    { type: 'texte', id: 't', x: 60, y: 60, largeur: 500, hauteur: 70, taille: 48 },
    { type: 'qr', id: 'q', x: 600, y: 300, largeur: 200, hauteur: 200 },
  ] } }));
  const depart = JSON.stringify(Edition.elementsFace());
  for (const [format, orientation] of [['carre', 'paysage'], ['long', 'portrait'], ['us', 'paysage'], ['standard', 'paysage']]) {
    Edition.modifierModele({ format, orientation });
  }
  assert.equal(JSON.stringify(Edition.elementsFace()), depart);
});

test('texte trop long : rétréci pour tenir, sinon coupé avec « … »', async () => {
  const { ajusterTexte } = await import('../src/Utilitaires/MesureTexte.js');
  const style = { taille: 40, police: 'x', graisse: '700', interligne: 120 };
  // Hors navigateur, un caractère mesure 0,55 × taille.
  const court = ajusterTexte('Jean Dupont', { largeur: 400, hauteur: 50 }, style);
  assert.equal(court.taille, 40);
  assert.deepEqual(court.lignes, ['Jean Dupont']);
  const long = ajusterTexte('Jean-Christophe Dupont', { largeur: 400, hauteur: 50 }, style);
  assert.ok(long.taille < 40 && long.taille >= 20);
  assert.deepEqual(long.lignes, ['Jean-Christophe Dupont']);
  assert.ok(22 * long.taille * 0.55 <= 400);
  const enorme = ajusterTexte('A'.repeat(200), { largeur: 400, hauteur: 50 }, style);
  assert.equal(enorme.taille, 20);
  assert.ok(enorme.lignes[0].endsWith('…'));
});

test('polices : clé inconnue (ancienne « manuscrite ») remplacée par Inter', async () => {
  const { familleCss, POLICES, OPTIONS_POLICES, FACES_POLICES } = await import('../src/Metier/Polices.js');
  assert.equal(familleCss('manuscrite'), POLICES.moderne);
  OPTIONS_POLICES.forEach(([cle]) => {
    const famille = POLICES[cle].match(/^"([^"]+)"/)[1];
    assert.ok(FACES_POLICES[famille], `${famille} sans fichiers`);
  });
  const { existsSync } = await import('node:fs');
  Object.values(FACES_POLICES).flat().forEach(([fichier]) => {
    assert.ok(existsSync(new URL(`../assets/polices/${fichier}.woff`, import.meta.url)), `${fichier}.woff manquant`);
  });
});

test('entreprise : infos imposées à la carte reliée, logo remplacé, liens calculés', async () => {
  const { normaliserEntreprise, appliquerEntreprisePersonne, appliquerEntrepriseModele } = await import('../src/Metier/Entreprise.js');
  const { normaliserPersonne, lienWhatsapp, lienItineraire } = await import('../src/Metier/Personne.js');
  const { normaliserModele } = await import('../src/Metier/ModeleCarte.js');
  const { adresseQrElement } = await import('../src/Metier/ContenuQr.js');
  const { genererVCard } = await import('../src/Metier/GenerateurVCard.js');
  assert.equal(normaliserEntreprise({ id: '../x' }), null);
  const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const entreprise = normaliserEntreprise({ id: 'e-1', nom: 'ACME', telephone: '01 02 03 04 05', ville: 'Lyon', logo });
  const personne = normaliserPersonne({ prenom: 'Lou', entreprise: 'Ancienne', ville: 'Paris', rue: '1 rue A', whatsapp: '06 11 22 33 44' });
  const effective = appliquerEntreprisePersonne(personne, entreprise);
  assert.equal(effective.entreprise, 'ACME');
  assert.equal(effective.ville, 'Lyon');
  assert.equal(effective.rue, '');
  assert.equal(effective.telephoneStandard, '01 02 03 04 05');
  assert.equal(effective.prenom, 'Lou');
  assert.equal(appliquerEntreprisePersonne(personne, null), personne);

  const modele = normaliserModele({ nom: 'M', recto: { elements: [{ type: 'image', image: '' }, { type: 'image', image: '', logoEntreprise: false }] } });
  const [avecLogo, sansLogo] = appliquerEntrepriseModele(modele, entreprise).recto.elements;
  assert.equal(avecLogo.image, logo);
  assert.equal(sansLogo.image, '');

  assert.equal(lienWhatsapp('06 11 22 33 44'), 'https://wa.me/33611223344');
  assert.equal(lienWhatsapp('+44 20 7946 0000'), 'https://wa.me/442079460000');
  assert.ok(lienItineraire(personne).includes(encodeURIComponent('1 rue A')));
  assert.equal(adresseQrElement(personne, { contenu: 'whatsapp' }), 'https://wa.me/33611223344');
  assert.match(genererVCard(effective), /TEL;TYPE=WORK,MAIN:01 02 03 04 05/);
  assert.match(genererVCard(effective), /X-ABLabel:WhatsApp/);
});

test('contrôle avant export : nom vide, contact manquant, doublons, texte coupé', async () => {
  const { controlerCartes } = await import('../src/Metier/ControleCartes.js');
  const { normaliserPersonne } = await import('../src/Metier/Personne.js');
  const { normaliserModele } = await import('../src/Metier/ModeleCarte.js');
  const modele = normaliserModele({ nom: 'M', recto: { elements: [{ type: 'texte', champ: 'nomComplet', largeur: 300, hauteur: 50, taille: 40 }] } });
  const carte = (id, p) => ({ id, modele, personne: normaliserPersonne(p) });
  const resultat = controlerCartes([
    carte('a', { prenom: 'Lou', nom: 'Martin', email: 'lou@exemple.fr' }),
    carte('b', { prenom: 'lou', nom: 'martin', email: 'LOU@exemple.fr' }),
    carte('c', { email: 'c@exemple.fr' }),
    carte('d', { prenom: 'Maximilien-Alexandre', nom: 'de La Rochefoucauld-Montbazon', telephoneMobile: '0600000000' }),
    carte('e', { prenom: 'Ana', nom: 'Li', telephoneMobile: '0600000000' }),
  ]);
  const de = (id) => resultat.find((r) => r.id === id)?.problemes || [];
  assert.ok(de('a').some((p) => p.includes('Même nom')) && de('a').some((p) => p.includes('Même e-mail')));
  assert.ok(de('c').some((p) => p.includes('Prénom et nom vides')));
  assert.ok(de('d').some((p) => p.startsWith('Texte coupé')));
  assert.deepEqual(de('e'), []);
});

test('identité visuelle : couleur d’accent, logo et texte lisible', async () => {
  const { couleurAccent, logoCarte, couleurTexteSur } = await import('../src/Metier/IdentiteVisuelle.js');
  const { normaliserModele } = await import('../src/Metier/ModeleCarte.js');
  const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const modele = normaliserModele({ nom: 'M', recto: { elements: [
    { type: 'texte', source: 'champ', champ: 'poste', couleur: '#ffffff' },
    { type: 'texte', source: 'champ', champ: 'entreprise', couleur: '#c2410c' },
    { type: 'image', image: logo, logoEntreprise: false },
  ] } });
  assert.equal(couleurAccent(modele), '#c2410c'); // Le blanc (poste) est trop clair : couleur suivante.
  assert.equal(couleurAccent(normaliserModele({ nom: 'Vide' })), '#2563eb');
  assert.equal(logoCarte(modele), logo);
  assert.equal(couleurTexteSur('#101820'), '#ffffff');
  assert.equal(couleurTexteSur('#f5f5f5'), '#14181f');
});
