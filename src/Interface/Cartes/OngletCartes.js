/**
 * OngletCartes.js
 * Onglet « Cartes » : liste des personnes, entreprises, design en lot, contrôle, imports (CSV, carte)
 * et sauvegarde à gauche ; formulaire,
 * aperçu recto / verso et téléchargements de la personne sélectionnée à droite.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { obtenirEtat } from '../../Metier/EtatApplication.js';
import { monterListePersonnes } from './ListePersonnes.js';
import { monterImportPersonnes } from './SectionImport.js';
import { monterSectionSauvegarde } from './SectionSauvegarde.js';
import { monterSectionEntreprises } from './SectionEntreprises.js';
import { monterSectionDesignLot } from './SectionDesignLot.js';
import { monterSectionControle } from './SectionControle.js';
import { monterSectionImportCarte } from './SectionImportCarte.js';
import { monterFormulairePersonne } from './FormulairePersonne.js';
import { monterApercuPersonne } from './ApercuPersonne.js';
import { monterPanneauExportCarte } from './PanneauExportCarte.js';
import { monterSectionSignature } from './SectionSignature.js';
import { selectionnerPersonne } from './SelectionCarte.js';

/**
 * Construit l'onglet « Cartes ».
 * @param {HTMLElement} conteneur - Panneau de l'onglet.
 */
export function monterOngletCartes(conteneur) {
  const colonneListe = creerElement('div', { classe: 'Cartes-liste' });
  const formulaire = creerElement('div', { classe: 'Cartes-formulaire' });
  const apercu = creerElement('div', { classe: 'Cartes-apercu' });
  const signature = creerElement('div');
  const exports = creerElement('div');

  conteneur.append(creerElement('div', { classe: 'Cartes' }, [
    colonneListe,
    formulaire,
    creerElement('div', { classe: 'Cartes-droite' }, [apercu, signature, exports]),
  ]));

  monterListePersonnes(colonneListe);
  monterSectionEntreprises(colonneListe);
  monterSectionDesignLot(colonneListe);
  monterSectionControle(colonneListe);
  monterImportPersonnes(colonneListe);
  monterSectionImportCarte(colonneListe);
  monterSectionSauvegarde(colonneListe);
  monterFormulairePersonne(formulaire);
  monterApercuPersonne(apercu);
  monterSectionSignature(signature);
  monterPanneauExportCarte(exports);

  // Sélectionne la première personne s'il y en a.
  const [premiere] = obtenirEtat().personnes;
  if (premiere) selectionnerPersonne(premiere.id);
}
