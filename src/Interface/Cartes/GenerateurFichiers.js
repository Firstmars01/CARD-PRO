/**
 * GenerateurFichiers.js
 * Produit les fichiers d'une carte (recto et verso), au format de son
 * modèle : SVG, PNG et JPG en 300 dpi, PDF, planche A4, PDF imprimeur
 * (fonds perdus), vCard, et archives ZIP.
 */

import { nomFichierSur } from '../../Utilitaires/Validation.js';
import { svgVersTexte, svgVersImage } from '../../Utilitaires/ExportImages.js';
import { creerPdfCarte, creerPdfPlanche, creerPdfImprimeur } from '../../Utilitaires/ExportPdf.js';
import { dimensionsModele, enPixels, FOND_PERDU } from '../../Metier/Formats.js';
import { creerZip } from '../../Utilitaires/Zip.js';
import { nomComplet } from '../../Metier/Personne.js';
import { genererVCard } from '../../Metier/GenerateurVCard.js';
import { genererQrPersonne } from '../../Metier/ContenuQr.js';
import { trouverModele } from '../../Metier/EtatApplication.js';
import { rendreFaceSvg } from '../Rendu/RenduFaceSvg.js';


/**
 * Prépare le rendu d'une carte (les deux faces).
 * @param {{personne:object, modeleId:string}} entree - Personne et son modèle.
 * @returns {{nom:string, recto:SVGSVGElement, verso:SVGSVGElement, personne:object}} Carte prête à exporter.
 */
export function preparerCarte(entree) {
  const modele = trouverModele(entree.modeleId);
  const { qr } = genererQrPersonne(entree.personne);
  const dimensions = dimensionsModele(modele);
  const perdu = { largeur: dimensions.largeur + 2 * FOND_PERDU, hauteur: dimensions.hauteur + 2 * FOND_PERDU };
  return {
    nom: nomFichierSur(nomComplet(entree.personne), 'carte-de-visite'),
    personne: entree.personne,
    dimensions,
    pixels: enPixels(dimensions),
    pixelsPerdu: enPixels(perdu),
    recto: rendreFaceSvg(modele, 'recto', entree.personne, qr),
    verso: rendreFaceSvg(modele, 'verso', entree.personne, qr),
    // Faces avec 3 mm de fond en plus (fichier imprimeur), créées à la demande.
    facePerdue: (cote) => rendreFaceSvg(modele, cote, entree.personne, qr, { fondPerdu: true }),
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

/**
 * @param {object} carte - Carte préparée.
 * @param {"recto"|"verso"} cote - Face.
 * @returns {Blob} Fichier SVG.
 */
export function fichierSvg(carte, cote) {
  return new Blob([svgVersTexte(carte[cote], carte.pixels.largeur, carte.pixels.hauteur)], { type: 'image/svg+xml' });
}

/**
 * @param {object} carte - Carte préparée.
 * @param {"recto"|"verso"} cote - Face.
 * @returns {Promise<Blob>} Fichier PNG (300 dpi).
 */
export function fichierPng(carte, cote) {
  return svgVersImage(carte[cote], carte.pixels.largeur, carte.pixels.hauteur, 'image/png');
}

/**
 * @param {object} carte - Carte préparée.
 * @param {"recto"|"verso"} cote - Face.
 * @returns {Promise<Blob>} Fichier JPEG (300 dpi).
 */
export function fichierJpg(carte, cote) {
  return svgVersImage(carte[cote], carte.pixels.largeur, carte.pixels.hauteur, 'image/jpeg');
}

/**
 * Images PNG des deux faces, en octets (pour les PDF).
 * @param {object} carte - Carte préparée.
 * @returns {Promise<Uint8Array[]>} [recto, verso].
 */
async function pngFaces(carte) {
  return Promise.all(['recto', 'verso'].map(async (cote) => octets(await fichierPng(carte, cote))));
}

/** @param {object} carte - Carte préparée. @returns {Promise<Blob>} PDF recto + verso. */
export async function fichierPdf(carte) {
  const [recto, verso] = await pngFaces(carte);
  return creerPdfCarte(recto, verso, carte.dimensions);
}

/** @param {object} carte - Carte préparée. @returns {Promise<Blob>} Planche A4 recto-verso. */
export async function fichierPlanche(carte) {
  const [recto, verso] = await pngFaces(carte);
  return creerPdfPlanche(recto, verso, carte.dimensions);
}

/** @param {object} carte - Carte préparée. @returns {Promise<Blob>} PDF imprimeur (fonds perdus 3 mm, traits de coupe). */
export async function fichierImprimeur(carte) {
  const { largeur, hauteur } = carte.pixelsPerdu;
  const [recto, verso] = await Promise.all(['recto', 'verso'].map(async (cote) => octets(await svgVersImage(carte.facePerdue(cote), largeur, hauteur, 'image/png'))));
  return creerPdfImprimeur(recto, verso, carte.dimensions);
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
  const [rectoOctets, versoOctets] = await pngFaces(carte);
  return [
    { nom: `${dossier}${carte.nom}-recto.png`, donnees: rectoOctets },
    { nom: `${dossier}${carte.nom}-verso.png`, donnees: versoOctets },
    { nom: `${dossier}${carte.nom}-recto.jpg`, donnees: await octets(await fichierJpg(carte, 'recto')) },
    { nom: `${dossier}${carte.nom}-verso.jpg`, donnees: await octets(await fichierJpg(carte, 'verso')) },
    { nom: `${dossier}${carte.nom}-recto.svg`, donnees: await octets(fichierSvg(carte, 'recto')) },
    { nom: `${dossier}${carte.nom}-verso.svg`, donnees: await octets(fichierSvg(carte, 'verso')) },
    { nom: `${dossier}${carte.nom}.pdf`, donnees: await octets(await creerPdfCarte(rectoOctets, versoOctets, carte.dimensions)) },
    { nom: `${dossier}${carte.nom}-planche-a4.pdf`, donnees: await octets(await creerPdfPlanche(rectoOctets, versoOctets, carte.dimensions)) },
    { nom: `${dossier}${carte.nom}-imprimeur.pdf`, donnees: await octets(await fichierImprimeur(carte)) },
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
