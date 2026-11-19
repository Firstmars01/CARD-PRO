/**
 * ListeCalques.js
 * Liste des éléments de la face (du premier plan à l'arrière-plan) :
 * sélection (Ctrl + clic pour en choisir plusieurs), ordre, visibilité,
 * verrouillage et suppression. 🔒 = verrouillé, ▣ = fait partie d'un groupe.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { decrireElement } from '../../Metier/Elements.js';
import {
  obtenirEdition, abonnerEdition, elementsFace, selectionner, modifierElement, memoriser, deplacerCalque, supprimerElements,
} from './EtatEdition.js';

/**
 * Monte la liste des calques.
 * @param {HTMLElement} conteneur - Zone de la liste.
 */
export function monterListeCalques(conteneur) {
  const afficher = () => {
    vider(conteneur);
    const { selectionIds } = obtenirEdition();
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
      classe: `Calque${selectionIds.includes(element.id) ? ' Calque--actif' : ''}${element.visible ? '' : ' Calque--masque'}`,
    }, [
      creerElement('button', {
        classe: 'Calque-nom',
        texte: `${element.verrouille ? '🔒 ' : ''}${element.groupe ? '▣ ' : ''}${decrireElement(element)}`,
        attributs: { type: 'button', title: 'Clic : sélectionner · Ctrl + clic : ajouter à la sélection' },
        surClic: (e) => selectionner(element.id, e.ctrlKey || e.metaKey || e.shiftKey),
      }),
      bouton('↑', 'Passer devant', () => deplacerCalque(element.id, 1)),
      bouton('↓', 'Passer derrière', () => deplacerCalque(element.id, -1)),
      bouton(element.visible ? '◉' : '○', element.visible ? 'Masquer' : 'Afficher', () => { memoriser(); modifierElement(element.id, { visible: !element.visible }); }),
      bouton(element.verrouille ? '🔒' : '🔓', element.verrouille ? 'Déverrouiller' : 'Verrouiller', () => { memoriser(); modifierElement(element.id, { verrouille: !element.verrouille }); }),
      bouton('✕', 'Supprimer', () => supprimerElements([element.id])),
    ]))));
  };
  abonnerEdition((type) => { if (type !== 'options') afficher(); });
  afficher();
}
