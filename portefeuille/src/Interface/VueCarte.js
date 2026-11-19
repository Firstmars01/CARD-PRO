/**
 * VueCarte.js
 * Écran d'une carte : recto et verso en grand (on touche la carte pour la
 * retourner), coordonnées cliquables, transmission du contact (QR plein
 * écran, partage, NFC dans l'appli Android), ajout aux contacts et suppression.
 */

import { creerElement, vider } from '../../../src/Utilitaires/Dom.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { trouverCarte, retirerCarte, titreCarte } from '../Metier/Portefeuille.js';
import { dessinerFace } from './RenduCarte.js';
import { revenirALaListe } from './Navigation.js';
import { montrerContact, envoyerContact, ajouterAuxContacts } from './PartageContact.js';
import { creerCoordonnees } from './Coordonnees.js';
import { creerSectionNfc } from './PartageNfc.js';

/**
 * Crée l'écran « carte ».
 * @returns {{element:HTMLElement, afficher:(id:string) => void, masquer:() => void}} Écran.
 */
export function creerVueCarte() {
  const element = creerElement('section', { classe: 'Ecran', attributs: { 'aria-label': 'Carte' } });
  let nfc = { fermer: () => {} };

  /** Quitte la carte : coupe le partage NFC éventuel. */
  const masquer = () => {
    nfc.fermer();
    nfc = { fermer: () => {} };
  };

  /**
   * Affiche une carte.
   * @param {string} id - Identifiant de la carte.
   */
  const afficher = (id) => {
    masquer();
    vider(element);
    const carte = trouverCarte(id);
    if (!carte) {
      revenirALaListe();
      return;
    }
    const { personne } = carte;

    // Carte retournable : recto devant, verso derrière.
    const retournable = creerElement('button', {
      classe: 'Retournable',
      attributs: { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Retourner la carte' },
    }, [
      creerElement('div', { classe: 'Retournable-face Retournable-face--recto' }, [dessinerFace(carte, 'recto')]),
      creerElement('div', { classe: 'Retournable-face Retournable-face--verso' }, [dessinerFace(carte, 'verso')]),
    ]);
    retournable.addEventListener('click', () => {
      const verso = retournable.getAttribute('aria-pressed') !== 'true';
      retournable.setAttribute('aria-pressed', String(verso));
    });

    const supprimer = creerElement('button', { classe: 'PBouton PBouton--danger', texte: 'Supprimer la carte', attributs: { type: 'button' } });
    supprimer.addEventListener('click', async () => {
      if (!window.confirm(`Supprimer la carte de ${titreCarte(carte)} ?`)) return;
      try {
        await retirerCarte(carte.id);
        notifier('Carte supprimée.', 'succes');
        revenirALaListe();
      } catch (erreur) {
        notifier(erreur.message, 'erreur');
      }
    });
    // Boutons d'action : [libellé, style, action].
    const [montrer, envoyer, contact] = [
      ['Montrer le contact', 'PBouton PBouton--principal', montrerContact],
      ['Envoyer le contact', 'PBouton', envoyerContact],
      ['Ajouter à mes contacts', 'PBouton', ajouterAuxContacts],
    ].map(([texte, classe, action]) => {
      const bouton = creerElement('button', { classe, texte, attributs: { type: 'button' } });
      bouton.addEventListener('click', () => action(carte).catch(() => notifier('Action impossible.', 'erreur')));
      return bouton;
    });
    nfc = creerSectionNfc(carte);
    const retour = creerElement('button', { classe: 'PBouton', texte: '← Mes cartes', attributs: { type: 'button' } });
    retour.addEventListener('click', () => history.back());

    element.append(
      creerElement('div', { classe: 'BarreEcran' }, [retour]),
      retournable,
      creerElement('p', { classe: 'Astuce', texte: 'Touche la carte pour voir le recto ou le verso.' }),
      creerElement('h2', { classe: 'Carte-nom', texte: titreCarte(carte) }),
      creerElement('p', { classe: 'Carte-poste', texte: [personne.poste, personne.entreprise].filter(Boolean).join(' · ') }),
      creerElement('div', { classe: 'Actions' }, [montrer, envoyer]),
      ...(nfc.element ? [nfc.element] : []),
      creerCoordonnees(personne),
      creerElement('div', { classe: 'Actions' }, [contact, supprimer]),
    );
  };

  return { element, afficher, masquer };
}
