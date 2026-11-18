/**
 * OngletCartes.js
 * Onglet « Cartes » : liste des personnes et import à gauche ; formulaire,
 * aperçu recto / verso et téléchargements de la personne sélectionnée à droite.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { obtenirEtat } from '../../Metier/EtatApplication.js';
import { monterListePersonnes } from './ListePersonnes.js';
import { monterImportPersonnes } from './SectionImport.js';
import { monterFormulairePersonne } from './FormulairePersonne.js';
import { monterApercuPersonne } from './ApercuPersonne.js';
import { monterPanneauExportCarte } from './PanneauExportCarte.js';
import { selectionnerPersonne } from './SelectionCarte.js';

/**
 * Construit l'onglet « Cartes ».
 * @param {HTMLElement} conteneur - Panneau de l'onglet.
 */
export function monterOngletCartes(conteneur) {
  const colonneListe = creerElement('div', { classe: 'Cartes-liste' });
  const formulaire = creerElement('div', { classe: 'Cartes-formulaire' });
  const apercu = creerElement('div', { classe: 'Cartes-apercu' });
  const exports = creerElement('div');

  conteneur.append(creerElement('div', { classe: 'Cartes' }, [
    colonneListe,
    formulaire,
    creerElement('div', { classe: 'Cartes-droite' }, [apercu, exports]),
  ]));

  monterListePersonnes(colonneListe);
  monterImportPersonnes(colonneListe);
  monterFormulairePersonne(formulaire);
  monterApercuPersonne(apercu);
  monterPanneauExportCarte(exports);

  // Sélectionne la première personne s'il y en a.
  const [premiere] = obtenirEtat().personnes;
  if (premiere) selectionnerPersonne(premiere.id);
}
