/**
 * VueScanner.js
 * Écran de scan : la caméra lit le QR code animé affiché par les RH et
 * reconstitue la carte complète. Une barre montre l'avancement.
 */

import { creerElement } from '../../../src/Utilitaires/Dom.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { AssembleurTransfert } from '../../../src/Metier/TransfertQr.js';
import { ajouterDepuisPaquet, titreCarte } from '../Metier/Portefeuille.js';
import { demarrerLecture } from '../Utilitaires/LecteurQr.js';
import { allerA } from './Navigation.js';

/**
 * Crée l'écran « scanner ».
 * @returns {{element:HTMLElement, afficher:() => void, masquer:() => void}} Écran.
 */
export function creerVueScanner() {
  const video = creerElement('video', { classe: 'Scanner-video', attributs: { playsinline: true, muted: true, 'aria-label': 'Caméra' } });
  const barre = creerElement('progress', { classe: 'Scanner-progression', attributs: { max: 1, value: 0 } });
  const etat = creerElement('p', { classe: 'Scanner-etat', attributs: { 'aria-live': 'polite' } });
  const annuler = creerElement('button', { classe: 'PBouton', texte: 'Annuler', attributs: { type: 'button' } });
  annuler.addEventListener('click', () => history.back());

  const element = creerElement('section', { classe: 'Ecran', attributs: { 'aria-label': 'Scanner' } }, [
    creerElement('h2', { classe: 'Titre-ecran', texte: 'Scanner une carte' }),
    creerElement('div', { classe: 'Scanner-cadre' }, [video]),
    barre,
    etat,
    creerElement('p', { classe: 'Astuce', texte: "Vise le QR animé affiché sur l'écran des RH et garde le téléphone stable jusqu'à 100 %." }),
    creerElement('div', { classe: 'Actions' }, [annuler]),
  ]);

  let arreter = null;
  let assembleur = null;
  let termine = false;

  /**
   * Traite un QR code lu.
   * @param {string} texte - Contenu du QR code.
   */
  const surLecture = async (texte) => {
    if (termine) return;
    let resultat;
    try {
      resultat = assembleur.ajouter(texte);
    } catch (erreur) {
      etat.textContent = erreur.message;
      return;
    }
    if (resultat.etat === 'ignore') {
      if (!resultat.total) etat.textContent = "Ce QR code n'est pas un QR de transfert Card Pro.";
      return;
    }
    barre.max = resultat.total;
    barre.value = resultat.recus;
    etat.textContent = `${Math.round((resultat.recus / resultat.total) * 100)} % (${resultat.recus} / ${resultat.total})`;
    if (resultat.etat !== 'termine') return;

    termine = true;
    arreterCamera();
    try {
      const carte = await ajouterDepuisPaquet(resultat.paquet);
      notifier(`Carte de ${titreCarte(carte)} ajoutée.`, 'succes');
      history.replaceState(null, '', location.pathname + location.search);
      allerA('carte', carte.id);
    } catch (erreur) {
      etat.textContent = erreur.message || 'Carte illisible.';
    }
  };

  /** Arrête la caméra si elle tourne. */
  const arreterCamera = () => {
    arreter?.();
    arreter = null;
  };

  const afficher = async () => {
    termine = false;
    assembleur = new AssembleurTransfert();
    barre.max = 1;
    barre.value = 0;
    etat.textContent = 'Ouverture de la caméra…';
    try {
      arreter = await demarrerLecture(video, surLecture);
      if (element.hidden) arreterCamera(); // Écran quitté pendant l'ouverture
      else etat.textContent = 'Recherche du QR code…';
    } catch (erreur) {
      etat.textContent = erreur.message;
    }
  };

  return { element, afficher, masquer: arreterCamera };
}
