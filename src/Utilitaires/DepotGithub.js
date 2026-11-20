/**
 * DepotGithub.js
 * Retrouve le dépôt GitHub à partir de l'adresse GitHub Pages
 * (compte.github.io/depot/) et construit les liens de téléchargement.
 */

/**
 * Déduit le dépôt GitHub de l'adresse de la page.
 * @param {Location} [adresse=location] - Adresse de la page.
 * @returns {{compte:string, depot:string}|null} Dépôt, ou null hors GitHub Pages.
 */
export function depotGithub(adresse = location) {
  const compte = /^([a-z0-9-]+)\.github\.io$/i.exec(adresse.hostname)?.[1];
  const depot = /^\/([A-Za-z0-9._-]+)\//.exec(adresse.pathname)?.[1];
  return compte && depot ? { compte, depot } : null;
}

/**
 * Page de la dernière version publiée (Releases).
 * @param {{compte:string, depot:string}} depot - Dépôt.
 * @returns {string} Adresse de la page.
 */
export function pageVersions(depot) {
  return `https://github.com/${depot.compte}/${depot.depot}/releases/latest`;
}

/**
 * Lien direct vers DrawCard-Configurateur.exe (dernière version).
 * @param {{compte:string, depot:string}} depot - Dépôt.
 * @returns {string} Adresse du fichier.
 */
export function lienExeConfigurateur(depot) {
  return `${pageVersions(depot)}/download/DrawCard-Configurateur.exe`;
}
