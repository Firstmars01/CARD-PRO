/**
 * PartageNfc.js
 * Section « Partager par NFC » de l'écran d'une carte (appli Android
 * uniquement) : le téléphone se fait passer pour une puce NFC. Un autre
 * téléphone approché reçoit la fiche contact (Android) ou un lien qui
 * l'ouvre (iPhone). Le partage s'arrête en quittant la carte.
 */

import { creerElement, vider } from '../../../src/Utilitaires/Dom.js';
import { genererVCard } from '../../../src/Metier/GenerateurVCard.js';
import { creerLienContact } from '../../../src/Metier/LienContact.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { ADRESSE_SITE } from '../AdresseSite.js';
import {
  estAppliAndroid, etatNfc, activerNfc, desactiverNfc, ouvrirReglagesNfc, nfcActif,
} from '../Utilitaires/PontAndroid.js';

/**
 * Crée un bouton.
 * @param {string} texte - Libellé.
 * @param {string} classe - Classes CSS.
 * @param {() => void} action - Action au clic.
 * @returns {HTMLButtonElement} Bouton.
 */
function bouton(texte, classe, action) {
  const element = creerElement('button', { classe, texte, attributs: { type: 'button' } });
  element.addEventListener('click', action);
  return element;
}

/**
 * Crée la section NFC d'une carte.
 * @param {object} carte - Carte du portefeuille.
 * @returns {{element:HTMLElement|null, fermer:() => void}} Section (null hors appli Android) et fermeture (coupe le partage).
 */
export function creerSectionNfc(carte) {
  if (!estAppliAndroid() || etatNfc() === 'absent') return { element: null, fermer: () => {} };
  const element = creerElement('section', { classe: 'Nfc', attributs: { 'aria-live': 'polite' } });
  let actif = false;

  const dessiner = () => {
    vider(element);
    if (actif && !nfcActif()) actif = false; // Coupé par l'appli (arrière-plan)
    element.dataset.actif = String(actif);
    element.append(creerElement('h3', { classe: 'Nfc-titre', texte: 'Partager par NFC' }));
    if (etatNfc() === 'desactive') {
      actif = false;
      element.append(
        creerElement('p', { classe: 'Astuce', texte: 'Le NFC du téléphone est coupé.' }),
        creerElement('div', { classe: 'Actions' }, [bouton('Activer le NFC', 'PBouton', ouvrirReglagesNfc)]),
      );
      return;
    }
    if (actif) {
      element.append(
        creerElement('p', { texte: "NFC actif : approche le dos d'un autre téléphone (écran allumé et déverrouillé). Android ouvre la fiche contact, iPhone affiche une notification à toucher." }),
        creerElement('div', { classe: 'Actions' }, [bouton('Arrêter', 'PBouton', () => { arreter(); dessiner(); })]),
      );
      return;
    }
    element.append(
      creerElement('p', { classe: 'Astuce', texte: "Transmets le contact en approchant un autre téléphone, sans appli de son côté." }),
      creerElement('div', { classe: 'Actions' }, [bouton('Activer le partage NFC', 'PBouton PBouton--principal', demarrer)]),
    );
  };

  /** Active le partage NFC de cette carte. */
  async function demarrer() {
    const lien = await creerLienContact(ADRESSE_SITE, carte.personne);
    actif = activerNfc(genererVCard(carte.personne), lien);
    if (!actif) notifier('NFC indisponible : vérifie qu’il est activé.', 'erreur');
    dessiner();
  }

  /** Coupe le partage NFC. */
  function arreter() {
    if (actif) desactiverNfc();
    actif = false;
  }

  // En revenant des réglages, l'état du NFC a pu changer.
  const surRetour = () => { if (!document.hidden) dessiner(); };
  document.addEventListener('visibilitychange', surRetour);
  dessiner();
  return {
    element,
    fermer: () => {
      arreter();
      document.removeEventListener('visibilitychange', surRetour);
    },
  };
}
