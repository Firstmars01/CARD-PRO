/**
 * Compression.js
 * Compression et décompression « deflate » avec l'API native du navigateur
 * (CompressionStream), sans dépendance. La décompression est plafonnée pour
 * qu'un fichier piégé (« bombe de décompression ») ne sature pas la mémoire.
 */

/**
 * Lit un flux d'octets jusqu'au bout, avec une taille maximale.
 * @param {ReadableStream<Uint8Array>} flux - Flux à lire.
 * @param {number} tailleMax - Nombre d'octets maximal accepté.
 * @returns {Promise<Uint8Array>} Octets lus.
 * @throws {Error} Si le flux dépasse la taille maximale.
 */
async function lireFlux(flux, tailleMax) {
  const lecteur = flux.getReader();
  const morceaux = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.length;
    if (total > tailleMax) {
      await lecteur.cancel();
      throw new Error('Données trop volumineuses.');
    }
    morceaux.push(value);
  }
  const resultat = new Uint8Array(total);
  let position = 0;
  morceaux.forEach((m) => { resultat.set(m, position); position += m.length; });
  return resultat;
}

/**
 * Fait passer des octets dans un flux de transformation.
 * @param {Uint8Array} octets - Données d'entrée.
 * @param {TransformStream} transformation - Compression ou décompression.
 * @param {number} tailleMax - Taille maximale du résultat.
 * @returns {Promise<Uint8Array>} Données transformées.
 */
function transformer(octets, transformation, tailleMax) {
  const source = new Blob([octets]).stream().pipeThrough(transformation);
  return lireFlux(source, tailleMax);
}

/**
 * Compresse des octets (deflate brut).
 * @param {Uint8Array} octets - Données.
 * @returns {Promise<Uint8Array>} Données compressées.
 */
export function compresser(octets) {
  return transformer(octets, new CompressionStream('deflate-raw'), Infinity);
}

/**
 * Décompresse des octets (deflate brut).
 * @param {Uint8Array} octets - Données compressées.
 * @param {number} tailleMax - Taille maximale acceptée une fois décompressé.
 * @returns {Promise<Uint8Array>} Données d'origine.
 * @throws {Error} Si les données sont corrompues ou trop volumineuses.
 */
export async function decompresser(octets, tailleMax) {
  try {
    return await transformer(octets, new DecompressionStream('deflate-raw'), tailleMax);
  } catch (erreur) {
    throw new Error(erreur.message === 'Données trop volumineuses.' ? erreur.message : 'Données corrompues.');
  }
}
