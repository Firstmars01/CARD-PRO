/**
 * Main.js (portefeuille)
 * Point d'entrée de Card Pro Portefeuille : thème, écrans, chargement des
 * cartes du téléphone, fichiers partagés depuis une autre appli (e-mail)
 * et mode hors ligne (service worker).
 * Dans un navigateur (appli non installée) ou sur PC, seul l'écran
 * d'installation est affiché : les fonctions ne sont pas chargées.
 */

import { obtenirElement } from '../../src/Utilitaires/Dom.js';
import { notifier } from '../../src/Interface/Notifications.js';
import { initialiserTheme, creerBoutonTheme } from '../../src/Interface/Themes.js';
import { chargerCartes } from './Metier/Portefeuille.js';
import { declarerEcran, demarrerNavigation } from './Interface/Navigation.js';
import { creerVueListe, importerFichiers } from './Interface/VueListe.js';
import { creerVueCarte } from './Interface/VueCarte.js';
import { creerVueScanner } from './Interface/VueScanner.js';
import { afficherEcranInstallation } from './Interface/EcranInstallation.js';
import { estInstalle, systeme } from './Utilitaires/Plateforme.js';
import { estAppliAndroid, fichiersRecus } from './Utilitaires/PontAndroid.js';

const CACHE_PARTAGE = 'cardpro-partage';

/**
 * Enregistre le service worker (application installable et hors ligne).
 */
function enregistrerServiceWorker() {
  // Dans l'appli Android, les fichiers sont déjà dans l'APK : pas besoin de cache.
  if ('serviceWorker' in navigator && !estAppliAndroid()) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  }
}

/**
 * Importe les fichiers partagés vers l'appli (« Partager → Card Pro » sur Android).
 * Le service worker les a déposés dans un cache temporaire.
 */
async function importerFichiersPartages() {
  if (!new URLSearchParams(location.search).has('partage') || !('caches' in window)) return;
  history.replaceState(null, '', location.pathname);
  const cache = await caches.open(CACHE_PARTAGE);
  const requetes = await cache.keys();
  const fichiers = await Promise.all(requetes.map(async (requete) => {
    const reponse = await cache.match(requete);
    await cache.delete(requete);
    return new File([await reponse.blob()], 'partage', { type: reponse.headers.get('Content-Type') || '' });
  }));
  if (fichiers.length) await importerFichiers(fichiers);
}

/**
 * Importe les fichiers reçus par l'appli Android (« Ouvrir avec » / « Partager »).
 */
async function importerFichiersAndroid() {
  const fichiers = fichiersRecus();
  if (fichiers.length) await importerFichiers(fichiers);
}

/**
 * Démarre l'application.
 */
async function demarrer() {
  initialiserTheme();
  obtenirElement('entete').append(creerBoutonTheme());
  const principal = obtenirElement('principal');
  enregistrerServiceWorker();

  // Appli réservée aux téléphones, et seulement une fois installée.
  if (!estInstalle() || systeme() === 'pc') {
    obtenirElement('chargement').hidden = true;
    afficherEcranInstallation(principal);
    return;
  }

  [['liste', creerVueListe()], ['carte', creerVueCarte()], ['scanner', creerVueScanner()]].forEach(([nom, ecran]) => {
    ecran.element.hidden = true;
    principal.append(ecran.element);
    declarerEcran(nom, ecran);
  });
  await chargerCartes();
  obtenirElement('chargement').hidden = true;
  demarrerNavigation();
  await importerFichiersPartages();
  if (estAppliAndroid()) {
    // L'appli Android prévient quand un fichier arrive alors qu'elle est déjà ouverte.
    window.addEventListener('cardpro-fichiers', () => importerFichiersAndroid());
    await importerFichiersAndroid();
  }
}

demarrer().catch((erreur) => {
  obtenirElement('chargement').textContent = 'Impossible de démarrer le portefeuille.';
  notifier(erreur.message || 'Erreur au démarrage.', 'erreur');
});
