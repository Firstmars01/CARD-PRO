/**
 * Plateforme.js
 * Reconnaît l'appareil (iPhone, Android, PC), le navigateur, et si Card Pro
 * est ouvert comme appli installée (écran d'accueil) ou dans un navigateur.
 * Garde aussi l'invitation à installer proposée par Android (Chrome, Edge…).
 */

const AGENT = navigator.userAgent || '';
let invitation = null;
const abonnes = new Set();

// Android annonce qu'il peut installer l'appli : on garde l'invitation pour notre bouton.
window.addEventListener('beforeinstallprompt', (evenement) => {
  evenement.preventDefault();
  invitation = evenement;
  abonnes.forEach((rappel) => rappel('invitation'));
});
window.addEventListener('appinstalled', () => {
  invitation = null;
  abonnes.forEach((rappel) => rappel('installee'));
});

/**
 * Indique si Card Pro est ouvert comme appli installée.
 * @returns {boolean} true depuis l'écran d'accueil (Android, iPhone ou PC).
 */
export function estInstalle() {
  const modes = ['standalone', 'fullscreen', 'minimal-ui'];
  return modes.some((mode) => matchMedia(`(display-mode: ${mode})`).matches) || navigator.standalone === true;
}

/**
 * Système de l'appareil.
 * @returns {"ios"|"android"|"pc"} Système (les iPad récents se présentent comme des Mac tactiles).
 */
export function systeme() {
  if (/iPhone|iPad|iPod/.test(AGENT) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(AGENT)) return 'android';
  return 'pc';
}

/**
 * Indique si le navigateur actuel sait installer l'appli.
 * Sur iPhone : Safari uniquement. Sur Android : pas les navigateurs intégrés
 * aux applis (Gmail, Outlook, Facebook…).
 * @returns {boolean} true si l'installation est possible ici.
 */
export function navigateurCompatible() {
  if (systeme() === 'ios') return /Safari/.test(AGENT) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line\//.test(AGENT);
  if (systeme() === 'android') return !/; wv\)|FBAN|FBAV|Instagram|Line\//.test(AGENT);
  return true;
}

/**
 * Invitation à installer (Android) si le navigateur l'a proposée.
 * @returns {Event|null} Invitation, à utiliser une seule fois.
 */
export function invitationInstallation() {
  return invitation;
}

/**
 * Affiche la fenêtre d'installation d'Android.
 * @returns {Promise<boolean>} true si la personne a accepté.
 */
export async function lancerInstallation() {
  if (!invitation) return false;
  const evenement = invitation;
  invitation = null;
  evenement.prompt();
  const { outcome } = await evenement.userChoice;
  return outcome === 'accepted';
}

/**
 * S'abonne aux événements d'installation.
 * @param {(type:"invitation"|"installee") => void} rappel - Appelé quand l'invitation arrive ou quand l'appli est installée.
 */
export function abonnerInstallation(rappel) {
  abonnes.add(rappel);
}
