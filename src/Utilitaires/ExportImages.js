/**
 * ExportImages.js
 * Conversion d'un SVG en texte (fichier .svg) ou en image PNG / JPEG via un canvas.
 */

/**
 * Sérialise un SVG en texte, avec une taille en pixels fixée.
 * @param {SVGSVGElement} svg - SVG source (non modifié).
 * @param {number} largeur - Largeur en pixels.
 * @param {number} hauteur - Hauteur en pixels.
 * @returns {string} Contenu du fichier SVG.
 */
export function svgVersTexte(svg, largeur, hauteur) {
  const copie = svg.cloneNode(true);
  copie.setAttribute('width', String(largeur));
  copie.setAttribute('height', String(hauteur));
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copie)}`;
}

/**
 * Dessine un SVG dans un canvas et renvoie l'image.
 * @param {SVGSVGElement} svg - SVG source.
 * @param {number} largeur - Largeur en pixels.
 * @param {number} hauteur - Hauteur en pixels.
 * @param {"image/png"|"image/jpeg"} [type="image/png"] - Format de sortie.
 * @returns {Promise<Blob>} Image.
 */
export async function svgVersImage(svg, largeur, hauteur, type = 'image/png') {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgVersTexte(svg, largeur, hauteur))}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const ctx = canvas.getContext('2d');
  // Le JPEG n'a pas de transparence : fond blanc (coins arrondis).
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largeur, hauteur);
  }
  ctx.drawImage(image, 0, 0, largeur, hauteur);
  return new Promise((resoudre, rejeter) => {
    canvas.toBlob((blob) => (blob ? resoudre(blob) : rejeter(new Error("Conversion de l'image impossible."))), type, 0.92);
  });
}
