/**
 * ExportPdf.js
 * Création de PDF prêts à imprimer avec pdf-lib (embarquée localement,
 * chargée seulement au premier export) :
 * - la carte au format réel 85 × 55 mm : page 1 recto, page 2 verso ;
 * - une planche A4 de 10 cartes : page 1 rectos, page 2 versos placés
 *   en miroir pour une impression recto-verso (retournement bord long).
 */

const MM = 72 / 25.4; // 1 mm en points PDF
const CARTE_L = 85 * MM;
const CARTE_H = 55 * MM;
const A4_L = 210 * MM;
const A4_H = 297 * MM;
const COLONNES = 2;
const LIGNES = 5;

/**
 * Charge pdf-lib à la demande.
 * @returns {Promise<object>} Module pdf-lib.
 */
function chargerPdfLib() {
  return import('../../assets/vendor/pdf-lib.esm.min.js');
}

/**
 * Crée le PDF d'une carte (recto puis verso, format réel).
 * @param {Uint8Array} rectoPng - Image PNG du recto.
 * @param {Uint8Array} versoPng - Image PNG du verso.
 * @returns {Promise<Blob>} Fichier PDF.
 */
export async function creerPdfCarte(rectoPng, versoPng) {
  const { PDFDocument } = await chargerPdfLib();
  const pdf = await PDFDocument.create();
  pdf.setTitle('Carte de visite');
  for (const png of [rectoPng, versoPng]) {
    const image = await pdf.embedPng(png);
    pdf.addPage([CARTE_L, CARTE_H]).drawImage(image, { x: 0, y: 0, width: CARTE_L, height: CARTE_H });
  }
  return new Blob([await pdf.save()], { type: 'application/pdf' });
}

/**
 * Ajoute une page A4 de 10 cartes avec traits de coupe.
 * @param {object} pdf - Document pdf-lib.
 * @param {object} image - Image intégrée.
 * @param {boolean} miroir - true pour inverser les colonnes (verso).
 * @param {Function} rgb - Fonction couleur de pdf-lib.
 */
function ajouterPlanche(pdf, image, miroir, rgb) {
  const page = pdf.addPage([A4_L, A4_H]);
  const margeX = (A4_L - COLONNES * CARTE_L) / 2;
  const margeY = (A4_H - LIGNES * CARTE_H) / 2;
  for (let colonne = 0; colonne < COLONNES; colonne++) {
    for (let ligne = 0; ligne < LIGNES; ligne++) {
      const position = miroir ? COLONNES - 1 - colonne : colonne;
      page.drawImage(image, { x: margeX + position * CARTE_L, y: margeY + ligne * CARTE_H, width: CARTE_L, height: CARTE_H });
    }
  }
  // Traits de coupe dans les marges uniquement (jamais sur les cartes).
  const trait = { thickness: 0.4, color: rgb(0.6, 0.6, 0.6) };
  const longueur = 4 * MM;
  for (let c = 0; c <= COLONNES; c++) {
    const x = margeX + c * CARTE_L;
    page.drawLine({ start: { x, y: margeY - MM }, end: { x, y: margeY - MM - longueur }, ...trait });
    page.drawLine({ start: { x, y: A4_H - margeY + MM }, end: { x, y: A4_H - margeY + MM + longueur }, ...trait });
  }
  for (let l = 0; l <= LIGNES; l++) {
    const y = margeY + l * CARTE_H;
    page.drawLine({ start: { x: margeX - MM, y }, end: { x: margeX - MM - longueur, y }, ...trait });
    page.drawLine({ start: { x: A4_L - margeX + MM, y }, end: { x: A4_L - margeX + MM + longueur, y }, ...trait });
  }
}

/**
 * Crée une planche A4 recto-verso de 10 cartes.
 * @param {Uint8Array} rectoPng - Image PNG du recto.
 * @param {Uint8Array} versoPng - Image PNG du verso.
 * @returns {Promise<Blob>} Fichier PDF (2 pages).
 */
export async function creerPdfPlanche(rectoPng, versoPng) {
  const { PDFDocument, rgb } = await chargerPdfLib();
  const pdf = await PDFDocument.create();
  pdf.setTitle('Planche de cartes de visite (recto-verso)');
  ajouterPlanche(pdf, await pdf.embedPng(rectoPng), false, rgb);
  ajouterPlanche(pdf, await pdf.embedPng(versoPng), true, rgb);
  return new Blob([await pdf.save()], { type: 'application/pdf' });
}
