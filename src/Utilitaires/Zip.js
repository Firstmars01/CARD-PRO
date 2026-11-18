/**
 * Zip.js
 * Création d'une archive ZIP dans le navigateur, sans dépendance.
 * Les fichiers sont stockés sans compression (PNG, PDF… sont déjà
 * compressés) ; les noms sont en UTF-8.
 */

let tableCrc = null;

/**
 * Calcule le CRC-32 d'un tableau d'octets (contrôle d'intégrité du ZIP).
 * @param {Uint8Array} octets - Données.
 * @returns {number} CRC-32 non signé.
 */
export function crc32(octets) {
  if (!tableCrc) {
    tableCrc = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tableCrc[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < octets.length; i++) crc = tableCrc[(crc ^ octets[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Crée une archive ZIP.
 * @param {{nom:string, donnees:Uint8Array}[]} fichiers - Fichiers (nom avec dossiers éventuels).
 * @returns {Blob} Archive ZIP.
 */
export function creerZip(fichiers) {
  const encodeur = new TextEncoder();
  const morceaux = [];
  const central = [];
  let position = 0;

  fichiers.forEach(({ nom, donnees }) => {
    const nomOctets = encodeur.encode(nom);
    const crc = crc32(donnees);
    // En-tête local du fichier.
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // Nom en UTF-8
    local.setUint32(14, crc, true);
    local.setUint32(18, donnees.length, true);
    local.setUint32(22, donnees.length, true);
    local.setUint16(26, nomOctets.length, true);
    morceaux.push(new Uint8Array(local.buffer), nomOctets, donnees);

    // Entrée du répertoire central.
    const entree = new DataView(new ArrayBuffer(46));
    entree.setUint32(0, 0x02014b50, true);
    entree.setUint16(4, 20, true);
    entree.setUint16(6, 20, true);
    entree.setUint16(8, 0x0800, true);
    entree.setUint32(16, crc, true);
    entree.setUint32(20, donnees.length, true);
    entree.setUint32(24, donnees.length, true);
    entree.setUint16(28, nomOctets.length, true);
    entree.setUint32(42, position, true);
    central.push(new Uint8Array(entree.buffer), nomOctets);
    position += 30 + nomOctets.length + donnees.length;
  });

  const tailleCentral = central.reduce((total, m) => total + m.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true);
  fin.setUint32(16, position, true);
  return new Blob([...morceaux, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
}
