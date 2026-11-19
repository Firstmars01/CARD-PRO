/**
 * Plateforme.js
 * Reconnaît l'appareil (iPhone, Android, PC), le navigateur, et si Card Pro
 * est ouvert comme appli installée (APK Android, ou écran d'accueil iPhone)
 * ou simplement dans un navigateur.
 */

import { estAppliAndroid } from './PontAndroid.js';

const AGENT = navigator.userAgent || '';

// Sur Android, l'appli s'installe par l'APK : on masque la proposition d'installation web de Chrome.
window.addEventListener('beforeinstallprompt', (evenement) => evenement.preventDefault());

/**
 * Indique si Card Pro est ouvert comme appli installée.
 * @returns {boolean} true dans l'APK Android ou depuis l'écran d'accueil (iPhone).
 */
export function estInstalle() {
  if (estAppliAndroid()) return true;
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
 * aux applis (Gmail, Outlook, Facebook…), qui bloquent les téléchargements.
 * @returns {boolean} true si l'installation est possible ici.
 */
export function navigateurCompatible() {
  if (systeme() === 'ios') return /Safari/.test(AGENT) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line\//.test(AGENT);
  if (systeme() === 'android') return !/; wv\)|FBAN|FBAV|Instagram|Line\//.test(AGENT);
  return true;
}
