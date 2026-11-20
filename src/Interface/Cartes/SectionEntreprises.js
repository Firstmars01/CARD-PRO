/**
 * SectionEntreprises.js
 * Section « Entreprises » de la colonne de gauche : liste des entreprises
 * (avec le nombre de cartes reliées), ajout et ouverture de la fiche.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { entrepriseVide } from '../../Metier/Entreprise.js';
import { obtenirEtat, abonner, ajouterEntreprise } from '../../Metier/EtatApplication.js';
import { creerSection } from '../Champs.js';
import { notifier } from '../Notifications.js';
import { ouvrirDialogueEntreprise, cartesReliees } from './DialogueEntreprise.js';

/**
 * Monte la section des entreprises.
 * @param {HTMLElement} conteneur - Colonne de gauche.
 */
export function monterSectionEntreprises(conteneur) {
  const { section, contenu } = creerSection('Entreprises (infos communes à plusieurs cartes)', false);
  const liste = creerElement('ul', { classe: 'Personnes', attributs: { 'aria-label': 'Entreprises' } });
  const ajouter = creerElement('button', {
    classe: 'Bouton Bouton--secondaire', texte: '+ Ajouter une entreprise', attributs: { type: 'button' },
    surClic: async () => {
      try {
        ouvrirDialogueEntreprise(await ajouterEntreprise(entrepriseVide('e-nouvelle')));
      } catch (erreur) {
        notifier(erreur.message, 'erreur');
      }
    },
  });

  const afficher = () => {
    vider(liste);
    obtenirEtat().entreprises.forEach((entreprise) => {
      const nombre = cartesReliees(entreprise.id);
      liste.append(creerElement('li', {}, [creerElement('button', {
        classe: 'Personne', attributs: { type: 'button' }, surClic: () => ouvrirDialogueEntreprise(entreprise),
      }, [
        creerElement('strong', { texte: entreprise.nom || 'Sans nom' }),
        creerElement('span', { texte: `${nombre} carte${nombre > 1 ? 's' : ''} reliée${nombre > 1 ? 's' : ''}` }),
      ])]));
    });
    if (!obtenirEtat().entreprises.length) {
      liste.append(creerElement('li', { classe: 'Aide', texte: "Ajoute une entreprise pour saisir une seule fois son adresse, son site, son standard et son logo." }));
    }
  };
  abonner((type) => { if (type === 'entreprises' || type === 'personnes' || type === 'personne') afficher(); });
  contenu.append(ajouter, liste);
  conteneur.append(section);
  afficher();
}
