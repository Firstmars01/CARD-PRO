/**
 * Telechargement.js
 * Déclenche le téléchargement d'un fichier généré dans le navigateur.
 */

/**
 * Télécharge un Blob sous un nom donné.
 * @param {Blob} blob - Contenu du fichier.
 * @param {string} nomFichier - Nom proposé (déjà nettoyé).
 */
export function telechargerBlob(blob, nomFichier) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  lien.rel = 'noopener';
  document.body.append(lien);
  lien.click();
  lien.remove();
  // Laisse le temps au navigateur (surtout iOS) de lire le fichier.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
