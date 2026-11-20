/**
 * ListePersonnes.js
 * Colonne de gauche de l'onglet « Cartes » : liste des personnes,
 * ajout d'une personne et export groupé de toutes les cartes.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { nomComplet } from '../../Metier/Personne.js';
import { MODELES_DE_BASE } from '../../Metier/ModelesDeBase.js';
import { obtenirEtat, abonner, ajouterPersonne, trouverModele, trouverEntreprise } from '../../Metier/EtatApplication.js';
import { personneSelectionnee, selectionnerPersonne, abonnerSelection } from './SelectionCarte.js';
import { fichierZipTous } from './GenerateurFichiers.js';
import { controlerToutesLesCartes } from './SectionControle.js';
import { notifier } from '../Notifications.js';

/**
 * Monte la liste des personnes.
 * @param {HTMLElement} conteneur - Colonne de gauche.
 */
export function monterListePersonnes(conteneur) {
  const liste = creerElement('ul', { classe: 'Personnes', attributs: { 'aria-label': 'Personnes' } });
  const compteur = creerElement('p', { classe: 'Aide' });
  const boutonZip = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: 'Toutes les cartes (ZIP)', attributs: { type: 'button' } });
  boutonZip.addEventListener('click', () => exporterTout(boutonZip));

  conteneur.append(
    creerElement('div', { classe: 'BarreActions' }, [
      creerElement('button', { classe: 'Bouton Bouton--principal', texte: '+ Ajouter une personne', attributs: { type: 'button' }, surClic: ajouter }),
      boutonZip,
    ]),
    compteur,
    liste,
  );

  // Affiche la liste triée par nom.
  const afficher = () => {
    vider(liste);
    const { personnes } = obtenirEtat();
    compteur.textContent = `${personnes.length} carte${personnes.length > 1 ? 's' : ''}`;
    boutonZip.disabled = personnes.length === 0;
    const triees = [...personnes].sort((a, b) => (nomComplet(a.personne) || '~').localeCompare(nomComplet(b.personne) || '~', 'fr'));
    triees.forEach(({ id, personne, modeleId, entrepriseId }) => {
      const actif = id === personneSelectionnee();
      liste.append(creerElement('li', {}, [creerElement('button', {
        classe: `Personne${actif ? ' Personne--active' : ''}`,
        attributs: { type: 'button', 'aria-pressed': String(actif) },
        surClic: () => selectionnerPersonne(id),
      }, [
        creerElement('strong', { texte: nomComplet(personne) || 'Sans nom' }),
        creerElement('span', { texte: [personne.poste, trouverEntreprise(entrepriseId)?.nom, trouverModele(modeleId).nom].filter(Boolean).join(' · ') }),
      ])]));
    });
    if (!personnes.length) liste.append(creerElement('li', { classe: 'Aide', texte: 'Aucune carte : ajoute une personne ou importe une liste.' }));
  };
  abonner(afficher);
  abonnerSelection(afficher);
  afficher();
}

/**
 * Ajoute une personne vide (modèle et entreprise de la personne sélectionnée par défaut) et la sélectionne.
 */
async function ajouter() {
  const courante = obtenirEtat().personnes.find((p) => p.id === personneSelectionnee());
  try {
    const entree = await ajouterPersonne(courante ? courante.modeleId : MODELES_DE_BASE[0].id, courante ? courante.entrepriseId : '');
    selectionnerPersonne(entree.id);
    document.getElementById('champ-prenom')?.focus();
  } catch (erreur) {
    notifier(erreur.message, 'erreur');
  }
}

/**
 * Génère et télécharge le ZIP de toutes les cartes.
 * @param {HTMLButtonElement} bouton - Bouton (désactivé pendant la génération).
 */
async function exporterTout(bouton) {
  const { personnes } = obtenirEtat();
  // Contrôle avant export : on prévient s'il reste des cartes à vérifier.
  const aVerifier = controlerToutesLesCartes();
  if (aVerifier.length && !window.confirm(`${aVerifier.length} carte(s) à vérifier (voir « Contrôle avant export »). Exporter quand même ?`)) return;
  bouton.disabled = true;
  const texte = bouton.textContent;
  try {
    const zip = await fichierZipTous(personnes, (fait, total) => { bouton.textContent = `Génération… ${fait}/${total}`; });
    telechargerBlob(zip, 'cartes-de-visite.zip');
    notifier(`${personnes.length} cartes exportées.`, 'succes');
  } catch (erreur) {
    notifier(erreur.message || 'Export impossible.', 'erreur');
  } finally {
    bouton.textContent = texte;
    bouton.disabled = false;
  }
}
