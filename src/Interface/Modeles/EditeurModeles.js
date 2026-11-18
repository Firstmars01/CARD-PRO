/**
 * EditeurModeles.js
 * Onglet « Modèles » : assemble la barre des modèles, la barre d'outils,
 * la zone d'édition, le panneau des propriétés et la liste des calques.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { MODELES_DE_BASE } from '../../Metier/ModelesDeBase.js';
import { chargerModele } from './EtatEdition.js';
import { monterListeModeles } from './ListeModeles.js';
import { monterBarreOutils } from './BarreOutils.js';
import { monterZoneEdition } from './ZoneEdition.js';
import { monterPanneauProprietes } from './PanneauProprietes.js';
import { monterListeCalques } from './ListeCalques.js';

/**
 * Construit l'éditeur de modèles dans l'onglet.
 * @param {HTMLElement} conteneur - Panneau de l'onglet « Modèles ».
 */
export function monterEditeurModeles(conteneur) {
  chargerModele(MODELES_DE_BASE[0]);

  const entete = creerElement('div', { classe: 'Editeur-entete' });
  const outils = creerElement('div', { classe: 'Outils' });
  const zone = creerElement('div', { classe: 'Editeur-zone' });
  const proprietes = creerElement('div', { classe: 'Editeur-proprietes' });
  const calques = creerElement('div');

  conteneur.append(
    entete,
    creerElement('div', { classe: 'Editeur-corps' }, [
      creerElement('div', { classe: 'Editeur-centre' }, [outils, zone]),
      creerElement('aside', { classe: 'Editeur-cote', attributs: { 'aria-label': 'Réglages' } }, [
        creerElement('section', { classe: 'Carte-panneau' }, [proprietes]),
        creerElement('section', { classe: 'Carte-panneau' }, [creerElement('h3', { classe: 'Panneau-titre', texte: 'Calques' }), calques]),
      ]),
    ]),
  );

  monterListeModeles(entete);
  monterBarreOutils(outils);
  monterZoneEdition(zone);
  monterPanneauProprietes(proprietes);
  monterListeCalques(calques);
}
