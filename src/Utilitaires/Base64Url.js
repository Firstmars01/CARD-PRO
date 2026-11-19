/**
 * Base64Url.js
 * Encodage Base64 « URL » (RFC 4648 §5) : des octets transformés en texte
 * utilisable dans une adresse web (lettres, chiffres, « - » et « _ »).
 */

/**
 * Encode des octets en Base64 URL (sans « = » final).
 * @param {Uint8Array} octets - Données.
 * @returns {string} Texte Base64 URL.
 */
export function encoderBase64Url(octets) {
  let binaire = '';
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Décode un texte Base64 URL.
 * @param {string} texte - Texte Base64 URL.
 * @returns {Uint8Array} Octets.
 * @throws {Error} Si le texte contient des caractères invalides.
 */
export function decoderBase64Url(texte) {
  const chaine = String(texte);
  if (!/^[A-Za-z0-9_-]*$/.test(chaine)) throw new Error('Base64 invalide.');
  const binaire = atob(chaine.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(chaine.length / 4) * 4, '='));
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0));
}
