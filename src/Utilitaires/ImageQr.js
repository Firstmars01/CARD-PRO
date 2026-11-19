/**
 * ImageQr.js
 * Transforme la grille d'un QR code en image noir et blanc (un octet par
 * pixel : 0 = blanc, 1 = noir), avec la marge blanche obligatoire autour.
 */

/**
 * Dessine un QR code en pixels.
 * @param {{taille:number, modules:boolean[][]}} qr - QR code encodé.
 * @param {number} [module=4] - Taille d'un module en pixels.
 * @param {number} [marge=4] - Marge blanche, en modules (4 selon la norme).
 * @returns {{largeur:number, hauteur:number, pixels:Uint8Array}} Image.
 */
export function qrEnPixels(qr, module = 4, marge = 4) {
  const cote = (qr.taille + 2 * marge) * module;
  const pixels = new Uint8Array(cote * cote);
  for (let y = 0; y < qr.taille; y++) {
    for (let x = 0; x < qr.taille; x++) {
      if (!qr.modules[y][x]) continue;
      const debut = ((y + marge) * module) * cote + (x + marge) * module;
      for (let dy = 0; dy < module; dy++) pixels.fill(1, debut + dy * cote, debut + dy * cote + module);
    }
  }
  return { largeur: cote, hauteur: cote, pixels };
}
