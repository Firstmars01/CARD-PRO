/**
 * ApercuPersonne.js
 * Aperçu en direct du recto et du verso de la carte sélectionnée (avec les
 * infos et le logo de son entreprise), et avertissements de lisibilité du QR.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { verifierLisibiliteQr } from '../../Utilitaires/Couleurs.js';
import { genererQrPersonne, qrPourElement, avertissementsQrElement } from '../../Metier/ContenuQr.js';
import { abonner, trouverPersonne, carteEffective } from '../../Metier/EtatApplication.js';
import { rendreFaceSvg } from '../Rendu/RenduFaceSvg.js';
import { controlerCartes } from '../../Metier/ControleCartes.js';
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
    const { modele, personne } = carteEffective(entree);
    const { qr, avertissements } = genererQrPersonne(personne);
    // Vérifie la lisibilité de chaque QR code du modèle.
    ['recto', 'verso'].forEach((cote) => modele[cote].elements
      .filter((e) => e.type === 'qr' && e.visible)
      .forEach((e) => {
        avertissements.push(...verifierLisibiliteQr(e.couleur, e.fond), ...verifierLisibiliteQr(e.couleurYeux, e.fond));
        avertissements.push(...avertissementsQrElement(qrPourElement(personne, e, qr), e));
      }));

    // Contrôle de cette carte (texte coupé, contact manquant…).
    controlerCartes([{ id: entree.id, modele, personne }]).forEach((r) => avertissements.push(...r.problemes));

    conteneur.append(
      creerElement('figure', { classe: 'Apercu-face' }, [rendreFaceSvg(modele, 'recto', personne, qr), creerElement('figcaption', { texte: 'Recto' })]),
      creerElement('figure', { classe: 'Apercu-face' }, [rendreFaceSvg(modele, 'verso', personne, qr), creerElement('figcaption', { texte: 'Verso' })]),
      ...[...new Set(avertissements)].map((m) => creerElement('p', { classe: 'Avertissement', texte: m, attributs: { role: 'status' } })),
    );
  };
  abonner((type, id) => { if (type !== 'personne' || id === personneSelectionnee()) actualiser(); });
  abonnerSelection(actualiser);
  actualiser();
}
