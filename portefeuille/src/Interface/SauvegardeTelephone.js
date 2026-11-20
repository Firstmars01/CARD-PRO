/**
 * SauvegardeTelephone.js
 * Boutons « Sauvegarder » et « Restaurer » du portefeuille : la sauvegarde
 * (.json) passe par le menu de partage (Drive, e-mail, Fichiers…) ou un
 * téléchargement ; la restauration ajoute les cartes absentes du téléphone.
 */

import { telechargerBlob } from '../../../src/Utilitaires/Telechargement.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { obtenirCartes, ajouterCartesRestaurees } from '../Metier/Portefeuille.js';
import { creerSauvegarde, lireSauvegarde, TAILLE_MAX_SAUVEGARDE } from '../Metier/SauvegardePortefeuille.js';
import { estAppliAndroid, partagerFichier } from '../Utilitaires/PontAndroid.js';

const TYPE_JSON = 'application/json';

/**
 * true si le fichier ressemble à une sauvegarde du portefeuille.
 * @param {File} fichier - Fichier choisi.
 * @returns {boolean} true pour un .json.
 */
export function estSauvegarde(fichier) {
  return /\.json$/i.test(fichier.name) || fichier.type === TYPE_JSON;
}

/**
 * Enregistre tout le portefeuille dans un fichier .json.
 * @returns {Promise<void>}
 */
export async function sauvegarderPortefeuille() {
  const cartes = obtenirCartes();
  if (!cartes.length) {
    notifier('Aucune carte à sauvegarder.', 'info');
    return;
  }
  const texte = creerSauvegarde(cartes);
  const nom = `sauvegarde-drawcard-${new Date().toISOString().slice(0, 10)}.json`;
  if (estAppliAndroid()) {
    partagerFichier(nom, TYPE_JSON, texte);
    return;
  }
  const fichier = new File([texte], nom, { type: TYPE_JSON });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: 'Sauvegarde DrawCard' });
      return;
    } catch (erreur) {
      if (erreur.name === 'AbortError') return;
    }
  }
  telechargerBlob(fichier, nom);
}

/**
 * Restaure une sauvegarde : ajoute les cartes qui ne sont pas déjà sur le téléphone.
 * @param {File} fichier - Fichier .json choisi.
 * @returns {Promise<void>}
 */
export async function restaurerPortefeuille(fichier) {
  if (fichier.size > TAILLE_MAX_SAUVEGARDE) throw new Error('Fichier trop volumineux.');
  const cartes = lireSauvegarde(await fichier.text());
  const ajoutees = await ajouterCartesRestaurees(cartes);
  notifier(ajoutees ? `${ajoutees} carte(s) restaurée(s).` : 'Toutes les cartes de la sauvegarde sont déjà sur le téléphone.', 'succes');
}
