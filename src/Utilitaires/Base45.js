/**
 * Base45.js
 * Encodage Base45 (RFC 9285) : transforme des octets en texte composé
 * uniquement des 45 caractères du mode alphanumérique des QR codes.
 * C'est le moyen le plus compact de mettre des données binaires dans un QR
 * (≈ 97 % de l'efficacité du binaire) tout en restant lisible par tous les
 * lecteurs, qui renvoient du texte.
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const VALEURS = new Map([...ALPHABET].map((c, i) => [c, i]));

/**
 * Encode des octets en Base45 (2 octets → 3 caractères).
 * @param {Uint8Array} octets - Données binaires.
 * @returns {string} Texte Base45.
 */
export function encoderBase45(octets) {
  let texte = '';
  for (let i = 0; i < octets.length; i += 2) {
    if (i + 1 < octets.length) {
      const n = octets[i] * 256 + octets[i + 1];
      texte += ALPHABET[n % 45] + ALPHABET[Math.floor(n / 45) % 45] + ALPHABET[Math.floor(n / 2025)];
    } else {
      const n = octets[i];
      texte += ALPHABET[n % 45] + ALPHABET[Math.floor(n / 45)];
    }
  }
  return texte;
}

/**
 * Décode un texte Base45.
 * @param {string} texte - Texte Base45.
 * @returns {Uint8Array} Octets décodés.
 * @throws {Error} Si le texte n'est pas du Base45 valide.
 */
export function decoderBase45(texte) {
  const chaine = String(texte);
  if (chaine.length % 3 === 1) throw new Error('Base45 invalide (longueur).');
  const octets = new Uint8Array(Math.floor(chaine.length / 3) * 2 + (chaine.length % 3 === 2 ? 1 : 0));
  let position = 0;
  for (let i = 0; i < chaine.length; i += 3) {
    const groupe = [...chaine.slice(i, i + 3)].map((c) => {
      const valeur = VALEURS.get(c);
      if (valeur === undefined) throw new Error('Base45 invalide (caractère).');
      return valeur;
    });
    if (groupe.length === 3) {
      const n = groupe[0] + groupe[1] * 45 + groupe[2] * 2025;
      if (n > 0xffff) throw new Error('Base45 invalide (valeur).');
      octets[position++] = n >> 8;
      octets[position++] = n & 0xff;
    } else {
      const n = groupe[0] + groupe[1] * 45;
      if (n > 0xff) throw new Error('Base45 invalide (valeur).');
      octets[position++] = n;
    }
  }
  return octets;
}
