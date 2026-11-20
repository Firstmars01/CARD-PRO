/**
 * DialogueEntreprise.js
 * Fenêtre de modification d'une entreprise : nom, coordonnées, LinkedIn et
 * logo. Les valeurs sont validées comme partout ailleurs ; la suppression
 * est refusée tant que des cartes sont reliées à l'entreprise.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { CHAMPS_ENTREPRISE, normaliserEntreprise } from '../../Metier/Entreprise.js';
import { normaliserChamp } from '../../Metier/Personne.js';
import { obtenirEtat, enregistrerEntreprise, supprimerEntreprise } from '../../Metier/EtatApplication.js';
import { creerChamp, afficherErreur } from '../Champs.js';
import { creerControleImage } from '../Modeles/ControlesSchema.js';
import { notifier } from '../Notifications.js';

const TYPES_INPUT = { tel: 'tel', url: 'url', texte: 'text' };

/**
 * Nombre de cartes reliées à une entreprise.
 * @param {string} id - Identifiant de l'entreprise.
 * @returns {number} Cartes reliées.
 */
export function cartesReliees(id) {
  return obtenirEtat().personnes.filter((p) => p.entrepriseId === id).length;
}

/**
 * Crée le champ d'une information de l'entreprise.
 * @param {object} champ - Description du champ.
 * @param {string} valeur - Valeur actuelle.
 * @returns {{bloc:HTMLElement, element:HTMLInputElement, valide:Function}} Champ.
 */
function creerChampEntreprise(champ, valeur) {
  const element = creerElement('input', { attributs: { id: `entreprise-${champ.cle}`, type: TYPES_INPUT[champ.type], maxlength: champ.max, autocomplete: 'off' } });
  element.value = valeur;
  const { bloc, erreur } = creerChamp(champ.libelle, element);
  const valide = () => {
    const invalide = element.value.trim() !== '' && normaliserChamp(champ, element.value) === '';
    afficherErreur(erreur, element, invalide ? 'Valeur invalide.' : '');
    return !invalide;
  };
  element.addEventListener('input', valide);
  return { bloc, element, valide };
}

/**
 * Ouvre la fenêtre de modification d'une entreprise.
 * @param {object} entreprise - Entreprise à modifier.
 */
export function ouvrirDialogueEntreprise(entreprise) {
  let logo = entreprise.logo;
  const champs = CHAMPS_ENTREPRISE.map((champ) => ({ champ, ...creerChampEntreprise(champ, entreprise[champ.cle]) }));
  const controleLogo = creerControleImage({ libelle: "Logo (remplace le logo des cartes reliées)" }, 'entreprise-logo', (image) => {
    logo = image;
    controleLogo.afficher(logo);
  }, () => {});
  controleLogo.afficher(logo);

  const reliees = cartesReliees(entreprise.id);
  const supprimer = creerElement('button', {
    classe: 'Bouton Bouton--danger', texte: 'Supprimer', attributs: { type: 'button', disabled: reliees > 0, title: reliees ? `${reliees} carte(s) reliée(s) : détache-les d'abord.` : '' },
  });
  const annuler = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: 'Annuler', attributs: { type: 'button' } });
  const valider = creerElement('button', { classe: 'Bouton Bouton--principal', texte: 'Enregistrer', attributs: { type: 'button' } });

  const dialogue = creerElement('dialog', { classe: 'ImportCarte', attributs: { 'aria-label': "Modifier l'entreprise" } }, [
    creerElement('h2', { classe: 'Transfert-titre', texte: entreprise.nom || 'Entreprise' }),
    creerElement('p', { classe: 'Aide', texte: reliees ? `${reliees} carte(s) utilisent ces informations.` : 'Aucune carte reliée pour le moment.' }),
    creerElement('div', { classe: 'Formulaire' }, [...champs.map((c) => c.bloc), controleLogo.bloc]),
    creerElement('div', { classe: 'Transfert-actions' }, [supprimer, annuler, valider]),
  ]);

  valider.addEventListener('click', async () => {
    if (!champs.every((c) => c.valide())) return;
    const brute = { id: entreprise.id, logo };
    champs.forEach(({ champ, element }) => { brute[champ.cle] = element.value; });
    valider.disabled = true;
    try {
      await enregistrerEntreprise(normaliserEntreprise(brute));
      notifier('Entreprise enregistrée : les cartes reliées sont à jour.', 'succes');
      dialogue.close();
    } catch (erreur) {
      notifier(erreur.message, 'erreur');
      valider.disabled = false;
    }
  });
  supprimer.addEventListener('click', async () => {
    if (!window.confirm(`Supprimer l'entreprise « ${entreprise.nom} » ?`)) return;
    try {
      await supprimerEntreprise(entreprise.id);
      notifier('Entreprise supprimée.', 'info');
      dialogue.close();
    } catch (erreur) {
      notifier(erreur.message, 'erreur');
    }
  });
  annuler.addEventListener('click', () => dialogue.close());
  dialogue.addEventListener('close', () => dialogue.remove());
  document.body.append(dialogue);
  dialogue.showModal();
}
