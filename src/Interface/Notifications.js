/**
 * Notifications.js
 * Affiche de courts messages (succès, erreur) en bas de l'écran.
 * La zone est annoncée aux lecteurs d'écran (aria-live).
 */

import { creerElement, obtenirElement } from '../Utilitaires/Dom.js';

const DUREE = 3500;

/**
 * Affiche une notification temporaire.
 * @param {string} message - Texte à afficher.
 * @param {"succes"|"erreur"|"info"} [type="info"] - Style du message.
 */
export function notifier(message, type = 'info') {
  const zone = obtenirElement('notifications');
  const bulle = creerElement('div', { classe: `Notification Notification--${type}`, texte: message, attributs: { role: type === 'erreur' ? 'alert' : 'status' } });
  zone.append(bulle);
  setTimeout(() => bulle.remove(), DUREE);
}
