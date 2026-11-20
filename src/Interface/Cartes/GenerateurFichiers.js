/**
 * GenerateurFichiers.js
 * Produit les fichiers d'une carte (recto et verso), au format de son
 * modèle : SVG, PNG et JPG en 300 dpi, PDF, planche A4, PDF imprimeur
 * (fonds perdus), vCard, fichiers du portefeuille mobile (.cardpro et GIF
 * du QR animé), et le kit complet en ZIP (avec signature Outlook et fond
 * Teams / Zoom), pour une personne ou pour toutes.
 */

import { nomFichierSur } from '../../Utilitaires/Validation.js';
import { svgVersTexte, svgVersImage } from '../../Utilitaires/ExportImages.js';
import { creerPdfCarte, creerPdfPlanche, creerPdfImprimeur } from '../../Utilitaires/ExportPdf.js';
import { dimensionsModele, enPixels, FOND_PERDU } from '../../Metier/Formats.js';
import { creerZip } from '../../Utilitaires/Zip.js';
import { convertirEnJpegBase64 } from '../../Utilitaires/Image.js';
import { nomComplet } from '../../Metier/Personne.js';
import { genererVCard } from '../../Metier/GenerateurVCard.js';
import { genererQrPersonne } from '../../Metier/ContenuQr.js';
import { carteEffective } from '../../Metier/EtatApplication.js';
import { rendreFaceSvg } from '../Rendu/RenduFaceSvg.js';
import { creerPaquet, IDENTIFIANT_GIF } from '../../Metier/PaquetCarte.js';
import { decouperPaquet, encoderTrames } from '../../Metier/TransfertQr.js';
import { creerGifAnime } from '../../Utilitaires/EncodeurGif.js';
import { qrEnPixels } from '../../Utilitaires/ImageQr.js';
import { fichierFondVisio } from '../Rendu/RenduFondVisio.js';
import { fichiersSignature } from './GenerateurSignature.js';

const DELAI_GIF = 20; // 1/5 de seconde par QR code


/**
 * Prépare le rendu d'une carte (les deux faces), avec les infos et le logo
 * de son entreprise si elle est reliée à une entreprise.
 * @param {{personne:object, modeleId:string, entrepriseId:string}} entree - Carte.
 * @returns {{nom:string, recto:SVGSVGElement, verso:SVGSVGElement, personne:object, modele:object}} Carte prête à exporter.
 */
export function preparerCarte(entree) {
  const { modele, personne } = carteEffective(entree);
  const { qr } = genererQrPersonne(personne);
  const dimensions = dimensionsModele(modele);
  const perdu = { largeur: dimensions.largeur + 2 * FOND_PERDU, hauteur: dimensions.hauteur + 2 * FOND_PERDU };
  return {
    nom: nomFichierSur(nomComplet(personne), 'carte-de-visite'),
    entree,
    personne,
    modele,
    dimensions,
    pixels: enPixels(dimensions),
    pixelsPerdu: enPixels(perdu),
    recto: rendreFaceSvg(modele, 'recto', personne, qr),
    verso: rendreFaceSvg(modele, 'verso', personne, qr),
    // Faces avec 3 mm de fond en plus (fichier imprimeur), créées à la demande.
    facePerdue: (cote) => rendreFaceSvg(modele, cote, personne, qr, { fondPerdu: true }),
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

/** @param {object} carte - Carte préparée. @returns {Promise<Blob>} Fichier contact (.vcf), avec la photo de profil. */
export async function fichierVcf(carte) {
  const photoJpeg = carte.personne.photo ? await convertirEnJpegBase64(carte.personne.photo) : '';
  return new Blob([genererVCard(carte.personne, { photoJpeg })], { type: 'text/vcard;charset=utf-8' });
}

/** @param {object} carte - Carte préparée. @returns {Promise<Blob>} Fichier .cardpro (carte complète pour le portefeuille). */
export async function fichierCardpro(carte) {
  return new Blob([await creerPaquet(carte.personne, carte.modele)], { type: 'application/octet-stream' });
}

/**
 * Prépare les QR codes du transfert vers le portefeuille mobile.
 * @param {object} carte - Carte préparée.
 * @returns {Promise<{paquet:Uint8Array, qrs:object[]}>} Paquet et QR codes (même taille).
 */
export async function preparerTransfert(carte) {
  const paquet = await creerPaquet(carte.personne, carte.modele);
  return { paquet, qrs: encoderTrames(decouperPaquet(paquet)) };
}

/**
 * GIF animé du QR code de transfert, à joindre à un e-mail. La carte complète
 * y est aussi cachée : le portefeuille l'importe sans scanner.
 * @param {object} carte - Carte préparée.
 * @returns {Promise<Blob>} Fichier GIF.
 */
export async function fichierGifPortefeuille(carte) {
  const { paquet, qrs } = await preparerTransfert(carte);
  const gif = creerGifAnime(qrs.map((qr) => qrEnPixels(qr, 4)), {
    delai: DELAI_GIF,
    application: { identifiant: IDENTIFIANT_GIF, octets: paquet },
  });
  return new Blob([gif], { type: 'image/gif' });
}

/**
 * Kit complet d'une carte, rangé par usage :
 *  - Carte : images recto / verso (PNG, JPG, SVG) ;
 *  - Impression : PDF recto + verso, planche A4, PDF imprimeur ;
 *  - Contact : fiche .vcf (avec la photo de profil) ;
 *  - Signature Outlook : signature .htm + images + mode d'emploi ;
 *  - Teams - Zoom : fond d'écran 1920 × 1080 ;
 *  - Portefeuille mobile : fichier .cardpro et GIF du QR animé.
 * @param {object} carte - Carte préparée.
 * @param {string} [dossier=""] - Dossier de la personne dans le ZIP (avec « / » final).
 * @returns {Promise<{nom:string, donnees:Uint8Array}[]>} Fichiers.
 */
async function fichiersCarte(carte, dossier = '') {
  const [rectoOctets, versoOctets] = await pngFaces(carte);
  const n = carte.nom;
  const d = (sousDossier) => `${dossier}${sousDossier}/`;
  return [
    { nom: `${d('Carte')}${n}-recto.png`, donnees: rectoOctets },
    { nom: `${d('Carte')}${n}-verso.png`, donnees: versoOctets },
    { nom: `${d('Carte')}${n}-recto.jpg`, donnees: await octets(await fichierJpg(carte, 'recto')) },
    { nom: `${d('Carte')}${n}-verso.jpg`, donnees: await octets(await fichierJpg(carte, 'verso')) },
    { nom: `${d('Carte')}${n}-recto.svg`, donnees: await octets(fichierSvg(carte, 'recto')) },
    { nom: `${d('Carte')}${n}-verso.svg`, donnees: await octets(fichierSvg(carte, 'verso')) },
    { nom: `${d('Impression')}${n}.pdf`, donnees: await octets(await creerPdfCarte(rectoOctets, versoOctets, carte.dimensions)) },
    { nom: `${d('Impression')}${n}-planche-a4.pdf`, donnees: await octets(await creerPdfPlanche(rectoOctets, versoOctets, carte.dimensions)) },
    { nom: `${d('Impression')}${n}-imprimeur.pdf`, donnees: await octets(await fichierImprimeur(carte)) },
    { nom: `${d('Contact')}${n}.vcf`, donnees: await octets(await fichierVcf(carte)) },
    ...await fichiersSignature(carte, carte.entree, d('Signature Outlook')),
    { nom: `${d('Teams - Zoom')}${n}-fond-visio.png`, donnees: await octets(await fichierFondVisio(carte)) },
    { nom: `${d('Portefeuille mobile')}${n}.cardpro`, donnees: await octets(await fichierCardpro(carte)) },
    { nom: `${d('Portefeuille mobile')}${n}-portefeuille.gif`, donnees: await octets(await fichierGifPortefeuille(carte)) },
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
