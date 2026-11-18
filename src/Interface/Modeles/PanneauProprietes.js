/**
 * PanneauProprietes.js
 * Panneau de droite de l'éditeur :
 * - un élément sélectionné : tous ses réglages ;
 * - plusieurs éléments : résumé et actions groupées ;
 * - aucune sélection : fond de la face et réglages du modèle.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { schemaElement, decrireElement } from '../../Metier/Elements.js';
import { SCHEMA_FOND, SCHEMA_MODELE, COTES } from '../../Metier/ModeleCarte.js';
import {
  obtenirEdition, abonnerEdition, elementSelectionne, elementsSelectionnes, memoriser, modifierElement, modifierFond,
  modifierModele, supprimerSelection, dupliquer, deplacerCalque, copierStyle, collerStyle,
} from './EtatEdition.js';
import { creerFormulaireSchema } from './ControlesSchema.js';
import { notifier } from '../Notifications.js';

const AIDE = 'Clic : sélectionner · Ctrl + clic ou cadre tracé à la souris : sélection multiple · Glisser : déplacer · Poignée bleue : redimensionner · Flèches : 1 mm (Maj : 5 mm) · Ctrl + C / V : copier / coller · Ctrl + Z : annuler.';

/**
 * Crée un petit bouton d'action.
 * @param {string} texte - Libellé.
 * @param {Function} action - Action au clic.
 * @param {string} [titre] - Info-bulle.
 * @returns {HTMLButtonElement} Bouton.
 */
function bouton(texte, action, titre = texte) {
  return creerElement('button', { classe: 'Bouton Bouton--secondaire Bouton--petit', texte, attributs: { type: 'button', title: titre }, surClic: action });
}

/**
 * Monte le panneau des propriétés.
 * @param {HTMLElement} conteneur - Zone du panneau.
 */
export function monterPanneauProprietes(conteneur) {
  let formulaires = [];
  let cleAffichee = '';

  // Clé qui identifie ce qui est affiché (élément, sélection multiple ou face).
  const cleCourante = () => {
    const { selectionIds, cote } = obtenirEdition();
    return selectionIds.length ? `s:${selectionIds.join(',')}` : `f:${cote}`;
  };

  // Reconstruit le panneau (changement de sélection, de face ou annulation).
  const construire = () => {
    cleAffichee = cleCourante();
    vider(conteneur);
    const selection = elementsSelectionnes();
    if (selection.length === 1) formulaires = construireElement(conteneur, selection[0]);
    else if (selection.length > 1) formulaires = construireMultiple(conteneur, selection);
    else formulaires = construireFace(conteneur, obtenirEdition());
  };

  // Met seulement à jour les valeurs (ex. : pendant un déplacement à la souris).
  const actualiser = () => {
    if (cleCourante() !== cleAffichee) {
      construire();
      return;
    }
    formulaires.forEach(({ formulaire, source }) => formulaire.actualiser(source()));
  };

  abonnerEdition((type) => {
    if (type === 'modele') actualiser();
    else if (type !== 'options') construire();
  });
  construire();
}

/**
 * Construit les réglages de l'élément sélectionné.
 * @param {HTMLElement} conteneur - Zone du panneau.
 * @param {object} element - Élément sélectionné.
 * @returns {object[]} Formulaires à actualiser.
 */
function construireElement(conteneur, element) {
  const formulaire = creerFormulaireSchema(schemaElement(element.type), element, {
    surChangement: (cle, valeur) => modifierElement(element.id, { [cle]: valeur }),
    avantModification: memoriser,
  });
  conteneur.append(
    creerElement('h3', { classe: 'Panneau-titre', texte: decrireElement(element) }),
    creerElement('div', { classe: 'BarreActions' }, [
      bouton('Dupliquer', () => dupliquer(), 'Ctrl + D'),
      bouton('Devant', () => deplacerCalque(element.id, 1), 'Passer devant'),
      bouton('Derrière', () => deplacerCalque(element.id, -1), 'Passer derrière'),
      bouton('Copier le style', () => { if (copierStyle()) notifier('Style copié : sélectionne d\'autres éléments puis « Coller le style ».', 'info'); }, 'Ctrl + Maj + C'),
      bouton('Supprimer', supprimerSelection, 'Suppr'),
    ]),
    formulaire.element,
  );
  return [{ formulaire, source: () => elementSelectionne() || element }];
}

/**
 * Construit le résumé d'une sélection multiple.
 * @param {HTMLElement} conteneur - Zone du panneau.
 * @param {object[]} selection - Éléments sélectionnés.
 * @returns {object[]} Aucun formulaire à actualiser.
 */
function construireMultiple(conteneur, selection) {
  conteneur.append(
    creerElement('h3', { classe: 'Panneau-titre', texte: `${selection.length} éléments sélectionnés` }),
    creerElement('div', { classe: 'BarreActions' }, [
      bouton('Dupliquer', () => dupliquer(), 'Ctrl + D'),
      bouton('Coller le style', () => { if (!collerStyle()) notifier('Copie d\'abord le style d\'un élément.', 'info'); }, 'Ctrl + Maj + V'),
      bouton('Supprimer', supprimerSelection, 'Suppr'),
    ]),
    creerElement('ul', { classe: 'ListeSelection' }, selection.map((e) => creerElement('li', { texte: decrireElement(e) }))),
    creerElement('p', { classe: 'Aide', texte: "Glisse un des éléments pour déplacer tout le groupe. Utilise la barre « Aligner » / « Centrer sur la carte » au-dessus de la carte. Ctrl + clic sur un élément pour le retirer de la sélection." }),
  );
  return [];
}

/**
 * Construit les réglages du fond de la face et du modèle.
 * @param {HTMLElement} conteneur - Zone du panneau.
 * @param {object} edition - État de l'éditeur.
 * @returns {object[]} Formulaires à actualiser.
 */
function construireFace(conteneur, edition) {
  const fond = creerFormulaireSchema(SCHEMA_FOND, edition.modele[edition.cote].fond, {
    surChangement: (cle, valeur) => modifierFond({ [cle]: valeur }),
    avantModification: memoriser,
  });
  const modele = creerFormulaireSchema(SCHEMA_MODELE, edition.modele, {
    surChangement: (cle, valeur) => modifierModele({ [cle]: valeur }),
    avantModification: memoriser,
  });
  conteneur.append(
    creerElement('h3', { classe: 'Panneau-titre', texte: `Fond du ${COTES[edition.cote].toLowerCase()}` }),
    fond.element,
    creerElement('h3', { classe: 'Panneau-titre', texte: 'Modèle' }),
    modele.element,
    creerElement('p', { classe: 'Aide', texte: AIDE }),
  );
  return [
    { formulaire: fond, source: () => obtenirEdition().modele[obtenirEdition().cote].fond },
    { formulaire: modele, source: () => obtenirEdition().modele },
  ];
}
