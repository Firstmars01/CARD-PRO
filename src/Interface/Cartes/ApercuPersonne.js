/**
 * ApercuPersonne.js
 * Aperçu en direct du recto et du verso de la carte sélectionnée, avec
 * les avertissements de lisibilité du QR code.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { verifierLisibiliteQr } from '../../Utilitaires/Couleurs.js';
import { genererQrPersonne } from '../../Metier/ContenuQr.js';
import { abonner, trouverPersonne, trouverModele } from '../../Metier/EtatApplication.js';
import { rendreFaceSvg } from '../Rendu/RenduFaceSvg.js';
import { personneSelectionnee, abonnerSelection } from './SelectionCarte.js';

/**
 * Monte l'aperçu recto / verso.
 * @param {HTMLElement} conteneur - Zone d'aperçu.
 */
export function monterApercuPersonne(conteneur) {
  const actualiser = () => {
    vider(conteneur);
    const entree = trouverPersonne(personneSelectionnee());
    if (!entree) return;
    const modele = trouverModele(entree.modeleId);
    const { qr, avertissements } = genererQrPersonne(entree.personne);
    // Vérifie la lisibilité de chaque QR code du modèle.
    ['recto', 'verso'].forEach((cote) => modele[cote].elements
      .filter((e) => e.type === 'qr' && e.visible)
      .forEach((e) => avertissements.push(...verifierLisibiliteQr(e.couleur, e.fond))));

    conteneur.append(
      creerElement('figure', { classe: 'Apercu-face' }, [rendreFaceSvg(modele, 'recto', entree.personne, qr), creerElement('figcaption', { texte: 'Recto' })]),
      creerElement('figure', { classe: 'Apercu-face' }, [rendreFaceSvg(modele, 'verso', entree.personne, qr), creerElement('figcaption', { texte: 'Verso' })]),
      ...[...new Set(avertissements)].map((m) => creerElement('p', { classe: 'Avertissement', texte: m, attributs: { role: 'status' } })),
    );
  };
  abonner((type, id) => { if (type !== 'personne' || id === personneSelectionnee()) actualiser(); });
  abonnerSelection(actualiser);
  actualiser();
}
