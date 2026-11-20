/**
 * SectionControle.js
 * Section « Contrôle avant export » : liste les cartes à vérifier (nom vide,
 * aucun contact, doublons, QR trop chargé, texte coupé…). Un clic sur une
 * carte la sélectionne pour la corriger.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { controlerCartes } from '../../Metier/ControleCartes.js';
import { obtenirEtat, carteEffective } from '../../Metier/EtatApplication.js';
import { creerSection } from '../Champs.js';
import { selectionnerPersonne } from './SelectionCarte.js';

/**
 * Contrôle toutes les cartes telles qu'elles s'affichent (avec leur entreprise).
 * @returns {{id:string, nom:string, problemes:string[]}[]} Cartes à vérifier.
 */
export function controlerToutesLesCartes() {
  return controlerCartes(obtenirEtat().personnes.map((entree) => ({ id: entree.id, ...carteEffective(entree) })));
}

/**
 * Monte la section de contrôle.
 * @param {HTMLElement} conteneur - Colonne de gauche.
 */
export function monterSectionControle(conteneur) {
  const { section, contenu } = creerSection('Contrôle avant export', false);
  const resultat = creerElement('div', { attributs: { role: 'status' } });
  const lancer = () => {
    vider(resultat);
    const aVerifier = controlerToutesLesCartes();
    if (!aVerifier.length) {
      resultat.append(creerElement('p', { classe: 'Aide', texte: `${obtenirEtat().personnes.length} carte(s) contrôlée(s) : rien à signaler.` }));
      return;
    }
    resultat.append(
      creerElement('p', { classe: 'Aide', texte: `${aVerifier.length} carte(s) à vérifier (clique pour corriger) :` }),
      creerElement('ul', { classe: 'Personnes' }, aVerifier.map(({ id, nom, problemes }) => creerElement('li', {}, [
        creerElement('button', { classe: 'Personne', attributs: { type: 'button' }, surClic: () => selectionnerPersonne(id) }, [
          creerElement('strong', { texte: nom }),
          ...problemes.map((p) => creerElement('span', { texte: `• ${p}` })),
        ]),
      ]))),
    );
  };
  contenu.append(creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: 'Contrôler toutes les cartes', attributs: { type: 'button' }, surClic: lancer }), resultat);
  conteneur.append(section);
}
