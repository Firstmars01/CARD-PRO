/**
 * MiseAJourWeb.js
 * Mise à jour automatique de l'appli web (iPhone) : le service worker
 * vérifie s'il existe une nouvelle version à chaque ouverture et à chaque
 * retour dans l'appli (si le téléphone est en ligne). Dès qu'elle est
 * installée, la page se recharge toute seule (sauf pendant un scan).
 */

const CLE_MESSAGE = 'drawcard-mis-a-jour';

/**
 * Indique si un rechargement peut avoir lieu maintenant (pas pendant un scan).
 * @returns {boolean} true si la page peut être rechargée.
 */
function rechargementPossible() {
  return !location.hash.startsWith('#scanner');
}

/**
 * Recharge la page pour utiliser la nouvelle version.
 */
function recharger() {
  try {
    sessionStorage.setItem(CLE_MESSAGE, '1');
  } catch {
    // Sans stockage, pas de message après le rechargement.
  }
  location.reload();
}

/**
 * Enregistre le service worker et active les mises à jour automatiques.
 * @param {(message:string) => void} annoncer - Affiche un message à la personne.
 */
export async function activerMisesAJourWeb(annoncer) {
  if (!('serviceWorker' in navigator)) return;
  try {
    if (sessionStorage.getItem(CLE_MESSAGE)) {
      sessionStorage.removeItem(CLE_MESSAGE);
      annoncer('DrawCard a été mis à jour.');
    }
  } catch {
    // Stockage indisponible : sans conséquence.
  }

  // Version qui contrôle la page (aucune lors de la toute première ouverture).
  let controleur = navigator.serviceWorker.controller;
  let enregistrement;
  try {
    enregistrement = await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch {
    return; // Hors ligne ou navigation privée : l'appli fonctionne sans.
  }

  // Nouvelle version active : rechargement (après le scan s'il y en a un en cours).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const premiereInstallation = !controleur;
    controleur = navigator.serviceWorker.controller;
    if (premiereInstallation) return; // Rien à recharger : la page est déjà à jour.
    if (rechargementPossible()) recharger();
    else window.addEventListener('hashchange', () => { if (rechargementPossible()) recharger(); });
  });

  // Vérifie les nouvelles versions à l'ouverture et à chaque retour dans l'appli.
  const verifier = () => {
    if (navigator.onLine) enregistrement.update().catch(() => {});
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) verifier(); });
  verifier();
}
