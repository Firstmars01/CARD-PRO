/**
 * LectureGif.js
 * Retrouve le bloc de données privé (« extension d'application ») d'un GIF,
 * sans décoder les images. Le fichier est une source non fiable : chaque
 * longueur est vérifiée avant lecture.
 */

/**
 * Extrait les données d'une extension d'application d'un GIF.
 * @param {Uint8Array} octets - Fichier GIF.
 * @param {string} identifiant - Identifiant de l'extension (11 caractères ASCII).
 * @param {number} tailleMax - Taille maximale des données.
 * @returns {Uint8Array|null} Données trouvées, ou null si absentes / fichier invalide.
 */
export function extraireDonneesGif(octets, identifiant, tailleMax) {
  const signature = String.fromCharCode(...octets.subarray(0, 6));
  if (signature !== 'GIF89a' && signature !== 'GIF87a') return null;
  const cible = identifiant.padEnd(11, ' ').slice(0, 11);
  let position = 13;

  // Saute une palette de couleurs si le champ « packed » l'annonce.
  const sauterPalette = (packed) => {
    if (packed & 0x80) position += 3 * (2 << (packed & 0x07));
  };
  // Lit (ou saute) une suite de sous-blocs terminée par un bloc vide.
  const lireSousBlocs = (garder) => {
    const morceaux = [];
    let total = 0;
    for (;;) {
      if (position >= octets.length) throw new Error('GIF tronqué');
      const longueur = octets[position++];
      if (longueur === 0) break;
      if (position + longueur > octets.length) throw new Error('GIF tronqué');
      if (garder) {
        total += longueur;
        if (total > tailleMax) throw new Error('Trop volumineux');
        morceaux.push(octets.subarray(position, position + longueur));
      }
      position += longueur;
    }
    if (!garder) return null;
    const resultat = new Uint8Array(total);
    let curseur = 0;
    morceaux.forEach((m) => { resultat.set(m, curseur); curseur += m.length; });
    return resultat;
  };

  try {
    if (octets.length < 13) return null;
    sauterPalette(octets[10]);
    while (position < octets.length) {
      const bloc = octets[position++];
      if (bloc === 0x3b) return null; // Fin du fichier
      if (bloc === 0x2c) { // Image : descripteur, palette locale éventuelle, données
        position += 8;
        sauterPalette(octets[position++]);
        position += 1;
        lireSousBlocs(false);
      } else if (bloc === 0x21) { // Extension
        const type = octets[position++];
        if (type === 0xff && octets[position] === 11) {
          const nom = String.fromCharCode(...octets.subarray(position + 1, position + 12));
          position += 12;
          const donnees = lireSousBlocs(nom === cible);
          if (donnees) return donnees;
        } else {
          lireSousBlocs(false);
        }
      } else {
        return null;
      }
    }
  } catch {
    return null;
  }
  return null;
}
