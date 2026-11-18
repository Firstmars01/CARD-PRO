/**
 * PanneauProprietes.js
 * Panneau de droite de l'éditeur : réglages de l'élément sélectionné,
 * ou, sans sélection, réglages du fond de la face et du modèle.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { schemaElement, decrireElement } from '../../Metier/Elements.js';
import { SCHEMA_FOND, SCHEMA_MODELE, COTES } from '../../Metier/ModeleCarte.js';
import {
  obtenirEdition, abonnerEdition, elementSelectionne, memoriser, modifierElement, modifierFond, modifierModele,
  supprimerElement, dupliquerElement, deplacerCalque,
} from './EtatEdition.js';
import { creerFormulaireSchema } from './ControlesSchema.js';

/**
 * Monte le panneau des propriétés.
 * @param {HTMLElement} conteneur - Zone du panneau.
 */
export function monterPanneauProprietes(conteneur) {
  let formulaires = [];
  let cleAffichee = '';

  // Reconstruit le panneau quand la sélection, la face ou le modèle changent.
  const construire = () => {
    const edition = obtenirEdition();
    const element = elementSelectionne();
    cleAffichee = element ? `e:${element.id}` : `f:${edition.cote}`;
    vider(conteneur);
    formulaires = element ? construireElement(conteneur, element) : construireFace(conteneur, edition);
  };

  // Met seulement à jour les valeurs (ex. : pendant un déplacement à la souris).
  const actualiser = () => {
    const element = elementSelectionne();
    const cle = element ? `e:${element.id}` : `f:${obtenirEdition().cote}`;
    if (cle !== cleAffichee) {
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
  const bouton = (texte, action, titre) => creerElement('button', { classe: 'Bouton Bouton--secondaire Bouton--petit', texte, attributs: { type: 'button', title: titre }, surClic: action });
  const formulaire = creerFormulaireSchema(schemaElement(element.type), element, {
    surChangement: (cle, valeur) => modifierElement(element.id, { [cle]: valeur }),
    avantModification: memoriser,
  });
  conteneur.append(
    creerElement('h3', { classe: 'Panneau-titre', texte: decrireElement(element) }),
    creerElement('div', { classe: 'BarreActions' }, [
      bouton('Dupliquer', () => dupliquerElement(element.id), 'Ctrl + D'),
      bouton('Avant', () => deplacerCalque(element.id, 1), 'Passer devant'),
      bouton('Arrière', () => deplacerCalque(element.id, -1), 'Passer derrière'),
      bouton('Supprimer', () => supprimerElement(element.id), 'Touche Suppr'),
    ]),
    formulaire.element,
  );
  return [{ formulaire, source: () => elementSelectionne() || element }];
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
    creerElement('p', { classe: 'Aide', texte: "Clique sur un élément de la carte pour le régler. Glisse-le pour le déplacer, tire la poignée bleue pour le redimensionner. Flèches : déplacer (Maj = 5 mm), Suppr : effacer, Ctrl + Z : annuler." }),
  );
  return [
    { formulaire: fond, source: () => obtenirEdition().modele[obtenirEdition().cote].fond },
    { formulaire: modele, source: () => obtenirEdition().modele },
  ];
}
