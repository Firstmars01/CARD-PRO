/**
 * Navigation.js
 * Navigation entre les écrans du portefeuille (liste, carte, scanner) avec
 * l'adresse de la page (#carte/…, #scanner) : le bouton « retour » du
 * téléphone fonctionne naturellement.
 */

const ecrans = new Map();
let ecranActif = null;

/**
 * Déclare un écran.
 * @param {string} nom - Nom de l'écran ("liste", "carte", "scanner").
 * @param {{element:HTMLElement, afficher:(parametre:string) => void, masquer?:() => void}} ecran - Écran.
 */
export function declarerEcran(nom, ecran) {
  ecrans.set(nom, ecran);
}

/**
 * Lit l'écran demandé dans l'adresse.
 * @returns {{nom:string, parametre:string}} Écran et paramètre (ex. identifiant de carte).
 */
function lireAdresse() {
  const [nom, parametre = ''] = location.hash.replace(/^#/, '').split('/');
  return ecrans.has(nom) ? { nom, parametre: decodeURIComponent(parametre) } : { nom: 'liste', parametre: '' };
}

/**
 * Affiche l'écran correspondant à l'adresse actuelle.
 */
function actualiser() {
  const { nom, parametre } = lireAdresse();
  if (ecranActif && ecranActif !== ecrans.get(nom)) ecranActif.masquer?.();
  ecrans.forEach((ecran, cle) => { ecran.element.hidden = cle !== nom; });
  ecranActif = ecrans.get(nom);
  ecranActif.afficher(parametre);
  window.scrollTo(0, 0);
}

/**
 * Va vers un écran (ajoute une étape à l'historique).
 * @param {string} nom - Nom de l'écran.
 * @param {string} [parametre=""] - Paramètre (identifiant de carte).
 */
export function allerA(nom, parametre = '') {
  const cible = nom === 'liste' ? '#' : `#${nom}${parametre ? `/${encodeURIComponent(parametre)}` : ''}`;
  if (location.hash === cible || (cible === '#' && !location.hash)) actualiser();
  else location.hash = cible;
}

/**
 * Revient à la liste des cartes (en remplaçant l'étape actuelle de l'historique).
 */
export function revenirALaListe() {
  history.replaceState(null, '', location.pathname + location.search);
  actualiser();
}

/**
 * Démarre la navigation.
 */
export function demarrerNavigation() {
  window.addEventListener('hashchange', actualiser);
  actualiser();
}
