/**
 * ListeCalques.js
 * Liste des éléments de la face (du premier plan à l'arrière-plan) :
 * sélection, ordre, visibilité et suppression.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { decrireElement } from '../../Metier/Elements.js';
import {
  obtenirEdition, abonnerEdition, elementsFace, selectionner, modifierElement, memoriser, deplacerCalque, supprimerElement,
} from './EtatEdition.js';

/**
 * Monte la liste des calques.
 * @param {HTMLElement} conteneur - Zone de la liste.
 */
export function monterListeCalques(conteneur) {
  const afficher = () => {
    vider(conteneur);
    const { selectionId } = obtenirEdition();
    const elements = [...elementsFace()].reverse();
    if (!elements.length) {
      conteneur.append(creerElement('p', { classe: 'Aide', texte: 'Aucun élément : ajoute-en avec la barre d\'outils.' }));
      return;
    }
    const bouton = (texte, titre, action) => creerElement('button', {
      classe: 'Bouton Bouton--icone Bouton--petit', texte, attributs: { type: 'button', title: titre, 'aria-label': titre },
      surClic: (e) => { e.stopPropagation(); action(); },
    });
    conteneur.append(creerElement('ul', { classe: 'Calques' }, elements.map((element) => creerElement('li', {
      classe: `Calque${element.id === selectionId ? ' Calque--actif' : ''}${element.visible ? '' : ' Calque--masque'}`,
    }, [
      creerElement('button', { classe: 'Calque-nom', texte: decrireElement(element), attributs: { type: 'button' }, surClic: () => selectionner(element.id) }),
      bouton('↑', 'Passer devant', () => deplacerCalque(element.id, 1)),
      bouton('↓', 'Passer derrière', () => deplacerCalque(element.id, -1)),
      bouton(element.visible ? '◉' : '○', element.visible ? 'Masquer' : 'Afficher', () => { memoriser(); modifierElement(element.id, { visible: !element.visible }); }),
      bouton('✕', 'Supprimer', () => supprimerElement(element.id)),
    ]))));
  };
  abonnerEdition((type) => { if (type !== 'options') afficher(); });
  afficher();
}
