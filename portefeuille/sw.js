/**
 * sw.js (portefeuille)
 * Service worker de DrawCard Portefeuille :
 *  - garde les fichiers de l'appli sur le téléphone (fonctionne hors ligne) ;
 *  - reçoit les fichiers partagés depuis une autre appli (« Partager → DrawCard »)
 *    et les dépose dans un cache temporaire lu par la page.
 * VERSION est remplacée automatiquement à chaque publication (voir
 * .github/workflows/Portefeuille.yml) : le téléphone voit qu'une nouvelle
 * version existe, la télécharge et l'appli se recharge toute seule.
 */

const VERSION = 'v6';
const CACHE_APPLI = `drawcard-portefeuille-${VERSION}`;
const CACHE_PARTAGE = 'drawcard-partage';
const TAILLE_MAX_PARTAGE = 20 * 1024 * 1024;

// Fichiers de l'application (chemins relatifs à ce fichier).
// La liste est vérifiée par les tests (tests/Portefeuille.test.js).
const FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/Portefeuille.css',
  './vendor/jsQR.js',
  './src/Main.js',
  './src/Donnees/StockageCartes.js',
  './src/Metier/Portefeuille.js',
  './src/Metier/TriCartes.js',
  './src/Metier/SauvegardePortefeuille.js',
  './src/Interface/AnimationNfc.js',
  './src/Interface/Coordonnees.js',
  './src/Interface/VueEdition.js',
  './src/Interface/BoutonIcone.js',
  './src/Interface/SauvegardeTelephone.js',
  './src/Interface/EcranInstallation.js',
  './src/Interface/Navigation.js',
  './src/Interface/PartageContact.js',
  './src/Interface/PartageNfc.js',
  './src/Interface/RenduCarte.js',
  './src/Interface/VueCarte.js',
  './src/Interface/VueListe.js',
  './src/Interface/VueScanner.js',
  './src/Utilitaires/LecteurQr.js',
  './src/Utilitaires/MiseAJourWeb.js',
  './src/Utilitaires/Plateforme.js',
  './src/Utilitaires/PontAndroid.js',
  './src/AdresseSite.js',
  '../assets/styles/Themes.css',
  '../assets/icons/Icone.svg',
  '../assets/icons/Icone192.png',
  '../assets/icons/Icone512.png',
  '../assets/icons/IconeApple.png',
  '../assets/polices/Anton-R.woff',
  '../assets/polices/Cardo-B.woff',
  '../assets/polices/Cardo-I.woff',
  '../assets/polices/Cardo-R.woff',
  '../assets/polices/CrimsonText-B.woff',
  '../assets/polices/CrimsonText-BI.woff',
  '../assets/polices/CrimsonText-I.woff',
  '../assets/polices/CrimsonText-R.woff',
  '../assets/polices/DMSans-B.woff',
  '../assets/polices/DMSans-BI.woff',
  '../assets/polices/DMSans-I.woff',
  '../assets/polices/DMSans-R.woff',
  '../assets/polices/FiraSans-B.woff',
  '../assets/polices/FiraSans-BI.woff',
  '../assets/polices/FiraSans-I.woff',
  '../assets/polices/FiraSans-R.woff',
  '../assets/polices/Gelasio-B.woff',
  '../assets/polices/Gelasio-BI.woff',
  '../assets/polices/Gelasio-I.woff',
  '../assets/polices/Gelasio-R.woff',
  '../assets/polices/Inter-300.woff',
  '../assets/polices/Inter-300I.woff',
  '../assets/polices/Inter-600.woff',
  '../assets/polices/Inter-600I.woff',
  '../assets/polices/Inter-800.woff',
  '../assets/polices/Inter-800I.woff',
  '../assets/polices/Inter-B.woff',
  '../assets/polices/Inter-BI.woff',
  '../assets/polices/Inter-I.woff',
  '../assets/polices/Inter-R.woff',
  '../assets/polices/LiberationMono-B.woff',
  '../assets/polices/LiberationMono-BI.woff',
  '../assets/polices/LiberationMono-I.woff',
  '../assets/polices/LiberationMono-R.woff',
  '../assets/polices/LiberationSans-B.woff',
  '../assets/polices/LiberationSans-BI.woff',
  '../assets/polices/LiberationSans-I.woff',
  '../assets/polices/LiberationSans-R.woff',
  '../assets/polices/LiberationSerif-B.woff',
  '../assets/polices/LiberationSerif-BI.woff',
  '../assets/polices/LiberationSerif-I.woff',
  '../assets/polices/LiberationSerif-R.woff',
  '../assets/polices/OpenSans-300.woff',
  '../assets/polices/OpenSans-300I.woff',
  '../assets/polices/OpenSans-600.woff',
  '../assets/polices/OpenSans-600I.woff',
  '../assets/polices/OpenSans-800.woff',
  '../assets/polices/OpenSans-800I.woff',
  '../assets/polices/OpenSans-B.woff',
  '../assets/polices/OpenSans-BI.woff',
  '../assets/polices/OpenSans-I.woff',
  '../assets/polices/OpenSans-R.woff',
  '../assets/polices/Roboto-300.woff',
  '../assets/polices/Roboto-300I.woff',
  '../assets/polices/Roboto-600.woff',
  '../assets/polices/Roboto-600I.woff',
  '../assets/polices/Roboto-800.woff',
  '../assets/polices/Roboto-800I.woff',
  '../assets/polices/Roboto-B.woff',
  '../assets/polices/Roboto-BI.woff',
  '../assets/polices/Roboto-I.woff',
  '../assets/polices/Roboto-R.woff',
  '../assets/polices/RobotoCondensed-B.woff',
  '../assets/polices/RobotoCondensed-BI.woff',
  '../assets/polices/RobotoCondensed-I.woff',
  '../assets/polices/RobotoCondensed-R.woff',
  '../src/Interface/Notifications.js',
  '../src/Interface/Icones.js',
  '../src/Interface/Themes.js',
  '../src/Interface/Rendu/Peintures.js',
  '../src/Interface/Rendu/QrLien.js',
  '../src/Interface/Rendu/RenduFaceSvg.js',
  '../src/Interface/Rendu/RenduQrSvg.js',
  '../src/Metier/ContenuQr.js',
  '../src/Metier/Elements.js',
  '../src/Metier/Formats.js',
  '../src/Metier/GenerateurVCard.js',
  '../src/Metier/IconesCarte.js',
  '../src/Metier/LienContact.js',
  '../src/Metier/ModeleCarte.js',
  '../src/Metier/PaquetCarte.js',
  '../src/Metier/Palette.js',
  '../src/Metier/Personne.js',
  '../src/Metier/ReglagesSignature.js',
  '../src/Metier/Polices.js',
  '../src/Metier/TransfertQr.js',
  '../src/Utilitaires/Base45.js',
  '../src/Utilitaires/Base64Url.js',
  '../src/Utilitaires/ChargementPolices.js',
  '../src/Utilitaires/Compression.js',
  '../src/Utilitaires/DataUrl.js',
  '../src/Utilitaires/Dom.js',
  '../src/Utilitaires/EncodeurQr.js',
  '../src/Utilitaires/Formes.js',
  '../src/Utilitaires/LectureGif.js',
  '../src/Utilitaires/MesureTexte.js',
  '../src/Utilitaires/Schema.js',
  '../src/Utilitaires/Telechargement.js',
  '../src/Utilitaires/Validation.js',
  '../src/Utilitaires/Image.js',
  '../src/Utilitaires/Zip.js',
];

// Installation : copie des fichiers (un fichier manquant, comme jsQR en local, n'empêche pas l'installation).
self.addEventListener('install', (evenement) => {
  evenement.waitUntil((async () => {
    const cache = await caches.open(CACHE_APPLI);
    await Promise.all(FICHIERS.map((f) => cache.add(new Request(f, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

// Activation : suppression des anciennes versions.
self.addEventListener('activate', (evenement) => {
  evenement.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => n.startsWith('drawcard-portefeuille-') && n !== CACHE_APPLI).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

/**
 * Reçoit des fichiers partagés et redirige vers l'appli qui les importera.
 * @param {Request} requete - Requête POST du partage.
 * @returns {Promise<Response>} Redirection vers l'accueil.
 */
async function recevoirPartage(requete) {
  try {
    const formulaire = await requete.formData();
    const cache = await caches.open(CACHE_PARTAGE);
    const fichiers = formulaire.getAll('fichiers').filter((f) => f instanceof File && f.size <= TAILLE_MAX_PARTAGE).slice(0, 10);
    await Promise.all(fichiers.map((fichier, i) => cache.put(
      new Request(`./partage-${Date.now()}-${i}`),
      new Response(fichier, { headers: { 'Content-Type': fichier.type || 'application/octet-stream' } }),
    )));
  } catch {
    // Partage illisible : l'appli s'ouvre simplement.
  }
  return Response.redirect('./?partage=1', 303);
}

/**
 * Répond depuis le cache, et met le fichier à jour en arrière-plan.
 * @param {Request} requete - Requête GET.
 * @returns {Promise<Response>} Réponse.
 */
async function depuisCache(requete) {
  const cache = await caches.open(CACHE_APPLI);
  const enCache = await cache.match(requete, { ignoreSearch: true });
  const reseau = fetch(requete).then((reponse) => {
    if (reponse.ok) cache.put(requete, reponse.clone());
    return reponse;
  }).catch(() => null);
  return enCache || (await reseau) || new Response('Hors ligne', { status: 503 });
}

self.addEventListener('fetch', (evenement) => {
  const url = new URL(evenement.request.url);
  if (url.origin !== location.origin) return;
  if (evenement.request.method === 'POST' && url.pathname.endsWith('/partage')) {
    evenement.respondWith(recevoirPartage(evenement.request));
  } else if (evenement.request.method === 'GET') {
    evenement.respondWith(depuisCache(evenement.request));
  }
});
