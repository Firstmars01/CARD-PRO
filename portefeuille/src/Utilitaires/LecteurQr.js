/**
 * LecteurQr.js
 * Lit les QR codes vus par la caméra du téléphone.
 * Utilise le lecteur intégré au navigateur (BarcodeDetector, Android) ou,
 * à défaut, la bibliothèque jsQR (iPhone), ajoutée lors de la publication et
 * chargée seulement au premier scan.
 */

const INTERVALLE = 90; // Millisecondes entre deux analyses d'image
const LARGEUR_ANALYSE = 960; // Image réduite pour jsQR (plus rapide)

/**
 * Charge jsQR (seulement quand le lecteur intégré manque, ex. sur iPhone).
 * @returns {Promise<boolean>} true si jsQR est disponible.
 */
function chargerJsQr() {
  if (typeof window.jsQR === 'function') return Promise.resolve(true);
  return new Promise((resoudre) => {
    const script = document.createElement('script');
    script.src = 'vendor/jsQR.js';
    script.onload = () => resoudre(typeof window.jsQR === 'function');
    script.onerror = () => resoudre(false);
    document.head.append(script);
  });
}

/**
 * Crée la fonction de détection disponible sur cet appareil.
 * @returns {Promise<((video:HTMLVideoElement) => Promise<string[]>)|null>} Détecteur, ou null si aucun.
 */
async function creerDetecteur() {
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) {
        const detecteur = new window.BarcodeDetector({ formats: ['qr_code'] });
        return async (video) => (await detecteur.detect(video)).map((r) => r.rawValue);
      }
    } catch {
      // On passe à jsQR.
    }
  }
  if (await chargerJsQr()) {
    const canvas = document.createElement('canvas');
    const contexte = canvas.getContext('2d', { willReadFrequently: true });
    return async (video) => {
      const echelle = Math.min(1, LARGEUR_ANALYSE / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * echelle);
      canvas.height = Math.round(video.videoHeight * echelle);
      contexte.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = contexte.getImageData(0, 0, canvas.width, canvas.height);
      const resultat = window.jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
      return resultat ? [resultat.data] : [];
    };
  }
  return null;
}

/**
 * Démarre la caméra arrière et lit les QR codes en continu.
 * @param {HTMLVideoElement} video - Élément vidéo où afficher la caméra.
 * @param {(texte:string) => void} surLecture - Appelée pour chaque QR code lu.
 * @returns {Promise<() => void>} Fonction qui arrête la caméra.
 * @throws {Error} Si la caméra ou la lecture de QR code est indisponible.
 */
export async function demarrerLecture(video, surLecture) {
  const detecter = await creerDetecteur();
  if (!detecter) throw new Error("La lecture de QR code n'est pas disponible sur ce navigateur. Importe plutôt le GIF ou le fichier .cardpro.");
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Caméra indisponible (la page doit être ouverte en HTTPS).');

  let flux;
  try {
    flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch {
    throw new Error("Accès à la caméra refusé : autorise-le dans les réglages du téléphone.");
  }
  video.srcObject = flux;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play();

  let actif = true;
  const boucle = async () => {
    if (!actif) return;
    try {
      if (video.readyState >= 2 && video.videoWidth) (await detecter(video)).forEach(surLecture);
    } catch {
      // Image illisible : on réessaie à l'image suivante.
    }
    if (actif) setTimeout(boucle, INTERVALLE);
  };
  boucle();

  return () => {
    actif = false;
    flux.getTracks().forEach((piste) => piste.stop());
    video.srcObject = null;
  };
}
