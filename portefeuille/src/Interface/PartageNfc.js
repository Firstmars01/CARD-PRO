/**
 * PartageNfc.js
 * Section « Partager par NFC » de l'écran d'une carte (appli Android
 * uniquement) : le téléphone se fait passer pour une puce NFC. Un autre
 * téléphone approché reçoit la fiche contact (Android) ou un lien qui
 * l'ouvre (iPhone). Le partage s'arrête en quittant la carte.
 * Ailleurs, la section explique pourquoi le NFC n'est pas disponible
 * (appli web sur Android → télécharger l'APK ; téléphone sans NFC).
 */

import { creerElement, vider } from '../../../src/Utilitaires/Dom.js';
import { genererVCard } from '../../../src/Metier/GenerateurVCard.js';
import { creerLienContact } from '../../../src/Metier/LienContact.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { ADRESSE_SITE } from '../AdresseSite.js';
import { systeme } from '../Utilitaires/Plateforme.js';
import { creerAnimationNfc } from './AnimationNfc.js';
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
 * Section d'information quand le partage NFC est impossible ici.
 * @returns {HTMLElement|null} Section, ou null sur iPhone / PC (pas d'envoi NFC possible).
 */
function sectionIndisponible() {
  let contenu;
  if (estAppliAndroid()) {
    contenu = [creerElement('p', { classe: 'Astuce', texte: "Ce téléphone n'a pas de NFC compatible avec le partage de carte." })];
  } else if (systeme() === 'android') {
    contenu = [
      creerElement('p', { classe: 'Astuce', texte: "Le partage NFC fonctionne dans l'appli Android DrawCard (APK), pas dans la version web. Installe-la, puis réimporte tes cartes." }),
      creerElement('div', { classe: 'Actions' }, [creerElement('a', {
        classe: 'PBouton', texte: "Télécharger l'appli Android",
        attributs: { href: '../telechargement/DrawCard.apk', download: 'DrawCard.apk', type: 'application/vnd.android.package-archive' },
      })]),
    ];
  } else {
    return null;
  }
  return creerElement('section', { classe: 'Nfc' }, [creerElement('h3', { classe: 'Nfc-titre', texte: 'Partager par NFC' }), ...contenu]);
}

/**
 * Crée la section NFC d'une carte.
 * @param {object} carte - Carte du portefeuille.
 * @returns {{element:HTMLElement|null, fermer:() => void}} Section (null hors appli Android) et fermeture (coupe le partage).
 */
export function creerSectionNfc(carte) {
  if (!estAppliAndroid() || etatNfc() === 'absent') return { element: sectionIndisponible(), fermer: () => {} };
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
        creerElement('p', { classe: 'Nfc-etat', texte: 'NFC actif' }),
        creerAnimationNfc(),
        creerElement('p', { classe: 'Astuce', texte: "L'autre téléphone doit être allumé et déverrouillé. Android ouvre la fiche contact ; iPhone affiche une notification à toucher." }),
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
