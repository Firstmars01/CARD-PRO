/**
 * ListeCalques.js
 * Liste des éléments de la face (du premier plan à l'arrière-plan) :
 * sélection (Ctrl + clic pour en choisir plusieurs), ordre, visibilité,
 * verrouillage et suppression. Icône cadenas = verrouillé, icône groupe =
 * fait partie d'un groupe.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { decrireElement } from '../../Metier/Elements.js';
import { icone } from '../Icones.js';
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
    const bouton = (nomIcone, titre, action) => creerElement('button', {
      classe: 'Bouton Bouton--icone Bouton--petit', attributs: { type: 'button', title: titre, 'aria-label': titre },
      surClic: (e) => { e.stopPropagation(); action(); },
    }, [icone(nomIcone)]);
    conteneur.append(creerElement('ul', { classe: 'Calques' }, elements.map((element) => creerElement('li', {
      classe: `Calque${selectionIds.includes(element.id) ? ' Calque--actif' : ''}${element.visible ? '' : ' Calque--masque'}`,
    }, [
      creerElement('button', {
        classe: 'Calque-nom',
        attributs: { type: 'button', title: 'Clic : sélectionner · Ctrl + clic : ajouter à la sélection' },
        surClic: (e) => selectionner(element.id, e.ctrlKey || e.metaKey || e.shiftKey),
      }, [
        element.verrouille ? icone('cadenas') : null,
        element.groupe ? icone('grouper') : null,
        creerElement('span', { texte: decrireElement(element) }),
      ]),
      bouton('monter', 'Passer devant', () => deplacerCalque(element.id, 1)),
      bouton('descendre', 'Passer derrière', () => deplacerCalque(element.id, -1)),
      bouton(element.visible ? 'oeil' : 'oeilBarre', element.visible ? 'Masquer' : 'Afficher', () => { memoriser(); modifierElement(element.id, { visible: !element.visible }); }),
      bouton(element.verrouille ? 'cadenas' : 'cadenasOuvert', element.verrouille ? 'Déverrouiller' : 'Verrouiller', () => { memoriser(); modifierElement(element.id, { verrouille: !element.verrouille }); }),
      bouton('fermer', 'Supprimer', () => supprimerElements([element.id])),
    ]))));
  };
  abonnerEdition((type) => { if (type !== 'options') afficher(); });
  afficher();
}
