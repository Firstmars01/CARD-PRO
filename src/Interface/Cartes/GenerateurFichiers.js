/**
 * GenerateurFichiers.js
 * Produit les fichiers d'une carte (recto et verso) : SVG, PNG et JPG
 * en 300 dpi, PDF, planche A4, vCard, et archives ZIP.
 */

import { nomFichierSur } from '../../Utilitaires/Validation.js';
import { svgVersTexte, svgVersImage } from '../../Utilitaires/ExportImages.js';
import { creerPdfCarte, creerPdfPlanche } from '../../Utilitaires/ExportPdf.js';
import { creerZip } from '../../Utilitaires/Zip.js';
import { nomComplet } from '../../Metier/Personne.js';
import { genererVCard } from '../../Metier/GenerateurVCard.js';
import { genererQrPersonne } from '../../Metier/ContenuQr.js';
import { trouverModele } from '../../Metier/EtatApplication.js';
import { rendreFaceSvg } from '../Rendu/RenduFaceSvg.js';

// 85 × 55 mm à 300 points par pouce (qualité impression).
export const PIXELS_L = 1004;
export const PIXELS_H = 650;

/**
 * Prépare le rendu d'une carte (les deux faces).
 * @param {{personne:object, modeleId:string}} entree - Personne et son modèle.
 * @returns {{nom:string, recto:SVGSVGElement, verso:SVGSVGElement, personne:object}} Carte prête à exporter.
 */
export function preparerCarte(entree) {
  const modele = trouverModele(entree.modeleId);
  const { qr } = genererQrPersonne(entree.personne);
  return {
    nom: nomFichierSur(nomComplet(entree.personne), 'carte-de-visite'),
    personne: entree.personne,
    recto: rendreFaceSvg(modele, 'recto', entree.personne, qr),
    verso: rendreFaceSvg(modele, 'verso', entree.personne, qr),
  };
}

/**
 * Convertit un Blob en octets.
 * @param {Blob} blob - Fichier.
 * @returns {Promise<Uint8Array>} Octets.
 */
async function octets(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

/** @param {SVGSVGElement} svg - Face. @returns {Blob} Fichier SVG. */
export function fichierSvg(svg) {
  return new Blob([svgVersTexte(svg, PIXELS_L, PIXELS_H)], { type: 'image/svg+xml' });
}

/** @param {SVGSVGElement} svg - Face. @returns {Promise<Blob>} Fichier PNG. */
export function fichierPng(svg) {
  return svgVersImage(svg, PIXELS_L, PIXELS_H, 'image/png');
}

/** @param {SVGSVGElement} svg - Face. @returns {Promise<Blob>} Fichier JPEG. */
export function fichierJpg(svg) {
  return svgVersImage(svg, PIXELS_L, PIXELS_H, 'image/jpeg');
}

/** @param {object} carte - Carte préparée. @returns {Promise<Blob>} PDF recto + verso. */
export async function fichierPdf(carte) {
  return creerPdfCarte(await octets(await fichierPng(carte.recto)), await octets(await fichierPng(carte.verso)));
}

/** @param {object} carte - Carte préparée. @returns {Promise<Blob>} Planche A4 recto-verso. */
export async function fichierPlanche(carte) {
  return creerPdfPlanche(await octets(await fichierPng(carte.recto)), await octets(await fichierPng(carte.verso)));
}

/** @param {object} carte - Carte préparée. @returns {Blob} Fichier contact (.vcf). */
export function fichierVcf(carte) {
  return new Blob([genererVCard(carte.personne)], { type: 'text/vcard;charset=utf-8' });
}

/**
 * Liste tous les fichiers d'une carte, éventuellement dans un dossier.
 * @param {object} carte - Carte préparée.
 * @param {string} [dossier=""] - Préfixe de dossier dans le ZIP.
 * @returns {Promise<{nom:string, donnees:Uint8Array}[]>} Fichiers.
 */
async function fichiersCarte(carte, dossier = '') {
  const [rectoPng, versoPng] = await Promise.all([fichierPng(carte.recto), fichierPng(carte.verso)]);
  const [rectoOctets, versoOctets] = await Promise.all([octets(rectoPng), octets(versoPng)]);
  return [
    { nom: `${dossier}${carte.nom}-recto.png`, donnees: rectoOctets },
    { nom: `${dossier}${carte.nom}-verso.png`, donnees: versoOctets },
    { nom: `${dossier}${carte.nom}-recto.jpg`, donnees: await octets(await fichierJpg(carte.recto)) },
    { nom: `${dossier}${carte.nom}-verso.jpg`, donnees: await octets(await fichierJpg(carte.verso)) },
    { nom: `${dossier}${carte.nom}-recto.svg`, donnees: await octets(fichierSvg(carte.recto)) },
    { nom: `${dossier}${carte.nom}-verso.svg`, donnees: await octets(fichierSvg(carte.verso)) },
    { nom: `${dossier}${carte.nom}.pdf`, donnees: await octets(await creerPdfCarte(rectoOctets, versoOctets)) },
    { nom: `${dossier}${carte.nom}-planche-a4.pdf`, donnees: await octets(await creerPdfPlanche(rectoOctets, versoOctets)) },
    { nom: `${dossier}${carte.nom}.vcf`, donnees: await octets(fichierVcf(carte)) },
  ];
}

/** @param {object} carte - Carte préparée. @returns {Promise<Blob>} ZIP de tous les fichiers de la carte. */
export async function fichierZip(carte) {
  return creerZip(await fichiersCarte(carte));
}

/**
 * Crée un ZIP avec un dossier par personne.
 * @param {object[]} entrees - Personnes avec leur modèle.
 * @param {(fait:number, total:number) => void} [progression] - Suivi de l'avancement.
 * @returns {Promise<Blob>} Archive ZIP.
 */
export async function fichierZipTous(entrees, progression = () => {}) {
  const fichiers = [];
  const nomsUtilises = new Map();
  for (const [i, entree] of entrees.entries()) {
    const carte = preparerCarte(entree);
    // Deux personnes du même nom reçoivent des dossiers distincts.
    const compte = (nomsUtilises.get(carte.nom) || 0) + 1;
    nomsUtilises.set(carte.nom, compte);
    const dossier = compte > 1 ? `${carte.nom}-${compte}/` : `${carte.nom}/`;
    fichiers.push(...await fichiersCarte(carte, dossier));
    progression(i + 1, entrees.length);
  }
  return creerZip(fichiers);
}
