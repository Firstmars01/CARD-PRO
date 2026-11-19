/**
 * Main.js (portefeuille)
 * Point d'entrée de Card Pro Portefeuille : thème, écrans, chargement des
 * cartes du téléphone, fichiers partagés depuis une autre appli (e-mail)
 * et mode hors ligne (service worker).
 * Seules deux façons d'ouvrir l'appli donnent accès aux fonctions :
 *  - l'appli Android (APK) ;
 *  - l'appli web ajoutée à l'écran d'accueil d'un iPhone.
 * Partout ailleurs (navigateur, PC, ancienne appli web sur Android), seul
 * l'écran d'installation est affiché.
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
import { activerMisesAJourWeb } from './Utilitaires/MiseAJourWeb.js';

const CACHE_PARTAGE = 'cardpro-partage';

/**
 * Enregistre le service worker (hors ligne et mises à jour automatiques).
 */
function enregistrerServiceWorker() {
  // Dans l'appli Android, les fichiers sont dans l'APK, mise à jour par Android lui-même.
  if (!estAppliAndroid()) activerMisesAJourWeb((message) => notifier(message, 'succes'));
}

/**
 * Rend la page installable comme appli web, sur iPhone uniquement.
 * Sur Android, l'absence de manifeste empêche Chrome de proposer
 * « Installer l'application » : seule l'APK s'installe.
 */
function ajouterManifesteIphone() {
  if (systeme() !== 'ios') return;
  const lien = document.createElement('link');
  lien.rel = 'manifest';
  lien.href = 'manifest.webmanifest';
  document.head.append(lien);
}

/**
 * Indique si les fonctions de l'appli sont autorisées ici.
 * @returns {boolean} true dans l'APK Android ou l'appli web installée sur iPhone.
 */
function appliAutorisee() {
  return estAppliAndroid() || (systeme() === 'ios' && estInstalle());
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
  ajouterManifesteIphone();
  enregistrerServiceWorker();

  // Appli réservée à l'APK Android et à l'appli installée sur iPhone.
  if (!appliAutorisee()) {
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
