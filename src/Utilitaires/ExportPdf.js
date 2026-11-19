/**
 * ExportPdf.js
 * Création de PDF prêts à imprimer avec pdf-lib (embarquée localement,
 * chargée seulement au premier export), au format de chaque modèle :
 * - la carte au format réel : page 1 recto, page 2 verso ;
 * - une planche A4 (autant de cartes que possible) : page 1 rectos,
 *   page 2 versos placés en miroir pour une impression recto-verso ;
 * - un PDF « imprimeur » : fonds perdus de 3 mm et traits de coupe.
 */

const MM = 72 / 25.4; // 1 mm en points PDF
const A4_L = 210;
const A4_H = 297;
const MARGE_PLANCHE = 8; // mm
const FOND_PERDU = 3; // mm
const MARGE_TRAITS = 8; // mm (zone des traits de coupe autour du fond perdu)

/**
 * Charge pdf-lib à la demande.
 * @returns {Promise<object>} Module pdf-lib.
 */
function chargerPdfLib() {
  return import('../../assets/vendor/pdf-lib.esm.min.js');
}

/**
 * Convertit les dimensions d'un modèle (dixièmes de mm) en millimètres.
 * @param {{largeur:number, hauteur:number}} dimensions - Dimensions.
 * @returns {{l:number, h:number}} Largeur et hauteur en mm.
 */
function enMm({ largeur, hauteur }) {
  return { l: largeur / 10, h: hauteur / 10 };
}

/**
 * Trace un trait fin gris.
 * @param {object} page - Page pdf-lib.
 * @param {Function} rgb - Fonction couleur de pdf-lib.
 * @param {number[]} de - Point de départ [x, y] en mm.
 * @param {number[]} a - Point d'arrivée [x, y] en mm.
 */
function trait(page, rgb, de, a) {
  page.drawLine({ start: { x: de[0] * MM, y: de[1] * MM }, end: { x: a[0] * MM, y: a[1] * MM }, thickness: 0.4, color: rgb(0.45, 0.45, 0.45) });
}

/**
 * Crée le PDF d'une carte (recto puis verso, format réel).
 * @param {Uint8Array} rectoPng - Image PNG du recto.
 * @param {Uint8Array} versoPng - Image PNG du verso.
 * @param {{largeur:number, hauteur:number}} dimensions - Dimensions de la carte.
 * @returns {Promise<Blob>} Fichier PDF.
 */
export async function creerPdfCarte(rectoPng, versoPng, dimensions) {
  const { PDFDocument } = await chargerPdfLib();
  const { l, h } = enMm(dimensions);
  const pdf = await PDFDocument.create();
  pdf.setTitle('Carte de visite');
  for (const png of [rectoPng, versoPng]) {
    const image = await pdf.embedPng(png);
    pdf.addPage([l * MM, h * MM]).drawImage(image, { x: 0, y: 0, width: l * MM, height: h * MM });
  }
  return new Blob([await pdf.save()], { type: 'application/pdf' });
}

/**
 * Ajoute une page A4 remplie de cartes, avec traits de coupe dans les marges.
 * @param {object} pdf - Document pdf-lib.
 * @param {object} image - Image intégrée.
 * @param {{l:number, h:number}} carte - Taille de la carte en mm.
 * @param {boolean} miroir - true pour inverser les colonnes (verso).
 * @param {Function} rgb - Fonction couleur de pdf-lib.
 */
function ajouterPlanche(pdf, image, carte, miroir, rgb) {
  const colonnes = Math.max(1, Math.floor((A4_L - 2 * MARGE_PLANCHE) / carte.l));
  const lignes = Math.max(1, Math.floor((A4_H - 2 * MARGE_PLANCHE) / carte.h));
  const page = pdf.addPage([A4_L * MM, A4_H * MM]);
  const mx = (A4_L - colonnes * carte.l) / 2;
  const my = (A4_H - lignes * carte.h) / 2;
  for (let c = 0; c < colonnes; c++) {
    for (let li = 0; li < lignes; li++) {
      const position = miroir ? colonnes - 1 - c : c;
      page.drawImage(image, { x: (mx + position * carte.l) * MM, y: (my + li * carte.h) * MM, width: carte.l * MM, height: carte.h * MM });
    }
  }
  // Traits de coupe : seulement dans les marges, jamais sur les cartes.
  const longueur = Math.min(4, mx - 1, my - 1);
  for (let c = 0; c <= colonnes; c++) {
    const x = mx + c * carte.l;
    trait(page, rgb, [x, my - 1], [x, my - 1 - longueur]);
    trait(page, rgb, [x, A4_H - my + 1], [x, A4_H - my + 1 + longueur]);
  }
  for (let li = 0; li <= lignes; li++) {
    const y = my + li * carte.h;
    trait(page, rgb, [mx - 1, y], [mx - 1 - longueur, y]);
    trait(page, rgb, [A4_L - mx + 1, y], [A4_L - mx + 1 + longueur, y]);
  }
}

/**
 * Crée une planche A4 recto-verso (autant de cartes que le format le permet).
 * @param {Uint8Array} rectoPng - Image PNG du recto.
 * @param {Uint8Array} versoPng - Image PNG du verso.
 * @param {{largeur:number, hauteur:number}} dimensions - Dimensions de la carte.
 * @returns {Promise<Blob>} Fichier PDF (2 pages).
 */
export async function creerPdfPlanche(rectoPng, versoPng, dimensions) {
  const { PDFDocument, rgb } = await chargerPdfLib();
  const pdf = await PDFDocument.create();
  pdf.setTitle('Planche de cartes de visite (recto-verso)');
  const carte = enMm(dimensions);
  ajouterPlanche(pdf, await pdf.embedPng(rectoPng), carte, false, rgb);
  ajouterPlanche(pdf, await pdf.embedPng(versoPng), carte, true, rgb);
  return new Blob([await pdf.save()], { type: 'application/pdf' });
}

/**
 * Crée le PDF pour un imprimeur professionnel : chaque page contient la
 * carte avec 3 mm de fond perdu, les traits de coupe et les zones
 * TrimBox / BleedBox renseignées.
 * @param {Uint8Array} rectoPng - Image PNG du recto AVEC fond perdu.
 * @param {Uint8Array} versoPng - Image PNG du verso AVEC fond perdu.
 * @param {{largeur:number, hauteur:number}} dimensions - Dimensions de la carte (sans fond perdu).
 * @returns {Promise<Blob>} Fichier PDF (2 pages).
 */
export async function creerPdfImprimeur(rectoPng, versoPng, dimensions) {
  const { PDFDocument, rgb } = await chargerPdfLib();
  const { l, h } = enMm(dimensions);
  const bord = MARGE_TRAITS + FOND_PERDU; // position du bord de coupe dans la page
  const pageL = l + 2 * bord;
  const pageH = h + 2 * bord;
  const pdf = await PDFDocument.create();
  pdf.setTitle('Carte de visite – fichier imprimeur (fonds perdus 3 mm)');

  for (const png of [rectoPng, versoPng]) {
    const image = await pdf.embedPng(png);
    const page = pdf.addPage([pageL * MM, pageH * MM]);
    page.drawImage(image, { x: MARGE_TRAITS * MM, y: MARGE_TRAITS * MM, width: (l + 2 * FOND_PERDU) * MM, height: (h + 2 * FOND_PERDU) * MM });
    page.setBleedBox(MARGE_TRAITS * MM, MARGE_TRAITS * MM, (l + 2 * FOND_PERDU) * MM, (h + 2 * FOND_PERDU) * MM);
    page.setTrimBox(bord * MM, bord * MM, l * MM, h * MM);
    // Traits de coupe aux 4 coins, hors du fond perdu.
    const debut = FOND_PERDU + 1;
    const fin = bord - 1;
    [[bord, bord], [bord + l, bord], [bord, bord + h], [bord + l, bord + h]].forEach(([x, y]) => {
      const sx = x === bord ? -1 : 1;
      const sy = y === bord ? -1 : 1;
      trait(page, rgb, [x + sx * debut, y], [x + sx * fin, y]);
      trait(page, rgb, [x, y + sy * debut], [x, y + sy * fin]);
    });
  }
  return new Blob([await pdf.save()], { type: 'application/pdf' });
}
