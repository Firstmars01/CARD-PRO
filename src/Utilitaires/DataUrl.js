/**
 * DataUrl.js
 * Conversion entre images « data URL » (texte base64) et octets bruts, avec
 * vérification de la signature du fichier : une image annoncée PNG doit
 * vraiment commencer comme un PNG.
 */

// Types d'images acceptés : code sur 1 octet, type MIME et signature.
const TYPES = [
  { code: 1, mime: 'image/png', estDuType: (o) => o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47 },
  { code: 2, mime: 'image/jpeg', estDuType: (o) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff },
  { code: 3, mime: 'image/webp', estDuType: (o) => o[0] === 0x52 && o[1] === 0x49 && o[8] === 0x57 && o[9] === 0x45 },
];

/**
 * Transforme une data URL d'image en octets.
 * @param {string} dataUrl - Image « data:image/...;base64,... ».
 * @returns {{code:number, octets:Uint8Array}|null} Code du type et octets, ou null si invalide.
 */
export function dataUrlVersOctets(dataUrl) {
  const resultat = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(dataUrl));
  if (!resultat) return null;
  const type = TYPES.find((t) => t.mime === resultat[1]);
  const binaire = atob(resultat[2]);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return type.estDuType(octets) ? { code: type.code, octets } : null;
}

/**
 * Transforme des octets d'image en data URL, après vérification de la signature.
 * @param {number} code - Code du type (1 PNG, 2 JPEG, 3 WebP).
 * @param {Uint8Array} octets - Contenu du fichier image.
 * @returns {string} Data URL, ou chaîne vide si le type ou le contenu est invalide.
 */
export function octetsVersDataUrl(code, octets) {
  const type = TYPES.find((t) => t.code === code);
  if (!type || octets.length < 12 || !type.estDuType(octets)) return '';
  return `data:${type.mime};base64,${octetsVersBase64(octets)}`;
}

/**
 * Encode des octets en Base64 (par tranches, pour les gros fichiers).
 * @param {Uint8Array} octets - Octets à encoder.
 * @returns {string} Texte Base64.
 */
export function octetsVersBase64(octets) {
  let binaire = '';
  const TRANCHE = 0x8000;
  for (let i = 0; i < octets.length; i += TRANCHE) {
    binaire += String.fromCharCode(...octets.subarray(i, i + TRANCHE));
  }
  return btoa(binaire);
}
