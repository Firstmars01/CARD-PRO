/**
 * Couleurs.js
 * Calculs sur les couleurs : luminance et contraste (norme WCAG).
 * Sert à prévenir l'utilisateur quand un QR code risque d'être illisible.
 */

/**
 * Convertit une couleur #rrggbb en composantes RVB.
 * @param {string} hex - Couleur hexadécimale.
 * @returns {number[]} Tableau [r, v, b] entre 0 et 255.
 */
export function hexVersRvb(hex) {
  const valeur = parseInt(String(hex).slice(1), 16) || 0;
  return [(valeur >> 16) & 255, (valeur >> 8) & 255, valeur & 255];
}

/**
 * Calcule la luminance relative d'une couleur.
 * @param {string} hex - Couleur hexadécimale.
 * @returns {number} Luminance entre 0 (noir) et 1 (blanc).
 */
export function luminance(hex) {
  const [r, v, b] = hexVersRvb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * v + 0.0722 * b;
}

/**
 * Calcule le rapport de contraste entre deux couleurs.
 * @param {string} a - Première couleur.
 * @param {string} b - Seconde couleur.
 * @returns {number} Rapport entre 1 et 21.
 */
export function contraste(a, b) {
  const [claire, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (claire + 0.05) / (sombre + 0.05);
}

/**
 * Vérifie la lisibilité d'un QR code selon ses couleurs.
 * @param {string} couleurModules - Couleur des modules.
 * @param {string} couleurFond - Couleur du fond.
 * @returns {string[]} Liste d'avertissements (vide si tout va bien).
 */
export function verifierLisibiliteQr(couleurModules, couleurFond) {
  const avertissements = [];
  if (contraste(couleurModules, couleurFond) < 4) {
    avertissements.push('Contraste du QR code trop faible : il risque de ne pas être scanné.');
  }
  if (luminance(couleurModules) > luminance(couleurFond)) {
    avertissements.push('QR code inversé (modules clairs sur fond sombre) : certains téléphones Android ne le lisent pas.');
  }
  return avertissements;
}
