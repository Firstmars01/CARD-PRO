/**
 * SectionSauvegarde.js
 * Section « Sauvegarde » : télécharge toutes les données (modèles et
 * personnes) dans un fichier, ou les restaure depuis un fichier.
 * La restauration remplace tout, après confirmation.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { lireSauvegarde, restaurerSauvegarde } from '../../Donnees/DepotSauvegarde.js';
import { creerSection } from '../Champs.js';
import { notifier } from '../Notifications.js';

const POIDS_MAX = 64 * 1024 * 1024;

/**
 * Télécharge la sauvegarde complète.
 * @param {HTMLButtonElement} bouton - Bouton (désactivé pendant l'opération).
 */
async function sauvegarder(bouton) {
  bouton.disabled = true;
  try {
    const donnees = await lireSauvegarde();
    const date = new Date().toISOString().slice(0, 10);
    telechargerBlob(new Blob([JSON.stringify(donnees)], { type: 'application/json' }), `cardpro-sauvegarde-${date}.json`);
    notifier('Sauvegarde téléchargée.', 'succes');
  } catch (erreur) {
    notifier(erreur.message || 'Sauvegarde impossible.', 'erreur');
  } finally {
    bouton.disabled = false;
  }
}

/**
 * Restaure une sauvegarde choisie par la personne.
 * @param {File} fichier - Fichier de sauvegarde (.json).
 */
async function restaurer(fichier) {
  if (fichier.size > POIDS_MAX) {
    notifier('Fichier trop volumineux.', 'erreur');
    return;
  }
  if (!window.confirm('Restaurer cette sauvegarde ? Toutes les cartes et tous les modèles actuels seront remplacés.')) return;
  try {
    const resultat = await restaurerSauvegarde(JSON.parse(await fichier.text()));
    notifier(`Restauré : ${resultat.personnes} personne(s), ${resultat.modeles} modèle(s).`, 'succes');
    setTimeout(() => location.reload(), 800);
  } catch (erreur) {
    notifier(erreur instanceof SyntaxError ? "Ce fichier n'est pas une sauvegarde Card Pro." : erreur.message, 'erreur');
  }
}

/**
 * Monte la section de sauvegarde.
 * @param {HTMLElement} conteneur - Zone d'accueil.
 */
export function monterSectionSauvegarde(conteneur) {
  const { section, contenu } = creerSection('Sauvegarde des données', false);
  const boutonSauver = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: 'Sauvegarder', attributs: { type: 'button' } });
  boutonSauver.addEventListener('click', () => sauvegarder(boutonSauver));
  const entree = creerElement('input', { attributs: { type: 'file', accept: '.json,application/json', hidden: true } });
  entree.addEventListener('change', () => {
    const [fichier] = entree.files;
    entree.value = '';
    if (fichier) restaurer(fichier);
  });
  const boutonRestaurer = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: 'Restaurer…', attributs: { type: 'button' } });
  boutonRestaurer.addEventListener('click', () => entree.click());
  contenu.append(
    creerElement('div', { classe: 'GrilleBoutons' }, [boutonSauver, boutonRestaurer, entree]),
    creerElement('p', { classe: 'Aide', texte: "Un seul fichier avec toutes les cartes et tous les modèles. Garde-le en lieu sûr (clé USB, cloud). « Restaurer » remplace toutes les données actuelles." }),
  );
  conteneur.append(section);
}
