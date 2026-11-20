/**
 * FormulairePersonne.js
 * Formulaire de la personne sélectionnée : modèle de carte, entreprise
 * reliée (ou réglage personnalisé), informations, liens ajoutables et
 * suppression. Sauvegarde automatique. Quand la carte est reliée à une
 * entreprise, les infos de l'entreprise sont affichées et non modifiables.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { CHAMPS_PERSONNE, LIENS_MAX, normaliserChamp, nomComplet } from '../../Metier/Personne.js';
import { MODELES_DE_BASE } from '../../Metier/ModelesDeBase.js';
import { CHAMPS_PERSONNE_ENTREPRISE, appliquerEntreprisePersonne } from '../../Metier/Entreprise.js';
import {
  obtenirEtat, abonner, trouverPersonne, trouverEntreprise, modifierPersonne, supprimerPersonne,
} from '../../Metier/EtatApplication.js';
import { personneSelectionnee, selectionnerPersonne, abonnerSelection } from './SelectionCarte.js';
import { creerChamp, afficherErreur, creerSection } from '../Champs.js';
import { notifier } from '../Notifications.js';

const TYPES_INPUT = { tel: 'tel', email: 'email', url: 'url', texte: 'text' };
const MESSAGES = {
  email: 'Adresse e-mail invalide.',
  tel: 'Numéro invalide (chiffres, espaces, + . - ( ) uniquement).',
  url: 'Lien invalide : seuls les liens http(s) sont acceptés.',
};
const SECTIONS = [
  { titre: 'Identité', cles: ['prenom', 'nom', 'poste', 'entreprise'] },
  { titre: 'Coordonnées', cles: ['telephoneMobile', 'telephonePro', 'telephoneStandard', 'whatsapp', 'email', 'siteWeb'] },
  { titre: 'Réseaux et rendez-vous', cles: ['linkedin', 'linkedinEntreprise', 'rendezVous'], fermee: true },
  { titre: 'Adresse', cles: ['rue', 'codePostal', 'ville', 'pays'], fermee: true },
  { titre: 'Note', cles: ['note'], fermee: true },
];
const LIENS_RAPIDES = ['Instagram', 'Facebook', 'X', 'YouTube', 'GitHub', 'Portfolio'];
const PERSONNALISE = '';

/**
 * Monte le formulaire (reconstruit à chaque changement de sélection).
 * @param {HTMLElement} conteneur - Zone du formulaire.
 */
export function monterFormulairePersonne(conteneur) {
  let choixModele = null;
  let entrepriseAffichee = null;
  const construire = () => {
    vider(conteneur);
    const entree = trouverPersonne(personneSelectionnee());
    if (!entree) {
      conteneur.append(creerElement('p', { classe: 'Aide', texte: 'Sélectionne une personne dans la liste ou ajoute-en une.' }));
      choixModele = null;
      return;
    }
    entrepriseAffichee = entree.entrepriseId;
    choixModele = construireFormulaire(conteneur, entree);
  };
  abonnerSelection(construire);
  abonner((type, id) => {
    if (type === 'modeles' && choixModele) choixModele.remplir();
    // Entreprise modifiée, ou carte reliée / détachée : les champs verrouillés changent.
    if (type === 'entreprises') construire();
    if (type === 'personne' && id === personneSelectionnee() && trouverPersonne(id)?.entrepriseId !== entrepriseAffichee) construire();
    if (type === 'personnes' && !trouverPersonne(personneSelectionnee())) selectionnerPersonne('');
  });
  construire();
}

/**
 * Construit le formulaire d'une personne.
 * @param {HTMLElement} conteneur - Zone du formulaire.
 * @param {{id:string, modeleId:string, personne:object}} entree - Personne.
 * @returns {{remplir:Function}} Contrôle du choix de modèle.
 */
function construireFormulaire(conteneur, entree) {
  const { id } = entree;
  const choixModele = creerChoixModele(entree);
  const entreprise = trouverEntreprise(entree.entrepriseId);
  // Valeurs affichées : celles de l'entreprise pour les champs qu'elle impose.
  const affichee = appliquerEntreprisePersonne(entree.personne, entreprise);
  const controles = [];
  // Un bloc neuf par personne : ses écouteurs disparaissent avec lui.
  const formulaire = creerElement('div', { classe: 'Formulaire' });
  conteneur.append(formulaire);

  formulaire.append(choixModele.bloc, creerChoixEntreprise(entree, entreprise));
  SECTIONS.forEach(({ titre, cles, fermee }) => {
    const { section, contenu } = creerSection(titre, !fermee);
    cles.forEach((cle) => {
      const champ = CHAMPS_PERSONNE.find((c) => c.cle === cle);
      const attributs = { id: `champ-${cle}`, name: cle, maxlength: champ.max, autocomplete: 'off' };
      const element = champ.type === 'multiligne'
        ? creerElement('textarea', { attributs: { ...attributs, rows: 3 } })
        : creerElement('input', { attributs: { ...attributs, type: TYPES_INPUT[champ.type], inputmode: champ.type === 'tel' ? 'tel' : undefined } });
      element.value = affichee[cle];
      const impose = Boolean(entreprise) && CHAMPS_PERSONNE_ENTREPRISE.includes(cle);
      if (impose) {
        element.disabled = true;
        element.title = `Info de l'entreprise « ${entreprise.nom} » : passe la carte en réglage personnalisé pour la changer.`;
      }
      const { bloc, erreur } = creerChamp(champ.libelle, element, champ.type === 'multiligne' ? 'Champ--large' : '');
      // Champ imposé : la valeur propre de la personne est conservée telle quelle.
      if (!impose) controles.push({ champ, element, erreur });
      contenu.append(bloc);
    });
    formulaire.append(section);
  });
  const liens = creerSectionLiens(formulaire, entree.personne.liens);

  // Toute saisie met à jour la personne (validée par le modèle).
  const enregistrer = (cible) => {
    const personne = { ...trouverPersonne(id).personne, liens: liens.lire() };
    controles.forEach(({ champ, element, erreur }) => {
      personne[champ.cle] = element.value;
      if (element === cible) verifierChamp(champ, element, erreur);
    });
    modifierPersonne(id, { personne });
  };
  formulaire.addEventListener('input', (e) => { if (!['carte-modele', 'carte-entreprise'].includes(e.target.id)) enregistrer(e.target); });
  liens.surSuppression(() => enregistrer(null));

  formulaire.append(creerElement('div', { classe: 'BarreActions' }, [creerElement('button', {
    classe: 'Bouton Bouton--danger', texte: 'Supprimer cette carte', attributs: { type: 'button' },
    surClic: async () => {
      const nom = nomComplet(trouverPersonne(id)?.personne || {}) || 'cette personne';
      if (!window.confirm(`Supprimer la carte de ${nom} ?`)) return;
      try {
        await supprimerPersonne(id);
        selectionnerPersonne('');
        notifier('Carte supprimée.', 'info');
      } catch (erreur) {
        notifier(erreur.message, 'erreur');
      }
    },
  })]));
  return choixModele;
}

/**
 * Crée la liste déroulante du modèle de carte.
 * @param {{id:string, modeleId:string}} entree - Personne.
 * @returns {{bloc:HTMLElement, remplir:Function}} Contrôle.
 */
function creerChoixModele(entree) {
  const liste = creerElement('select', { attributs: { id: 'carte-modele' } });
  const remplir = () => {
    vider(liste);
    const groupe = (libelle, modeles) => creerElement('optgroup', { attributs: { label: libelle } },
      modeles.map((m) => creerElement('option', { texte: m.nom, attributs: { value: m.id } })));
    liste.append(groupe('Modèles de base', MODELES_DE_BASE));
    if (obtenirEtat().modeles.length) liste.append(groupe('Mes modèles', obtenirEtat().modeles));
    liste.value = trouverPersonne(entree.id)?.modeleId || MODELES_DE_BASE[0].id;
  };
  liste.addEventListener('change', () => modifierPersonne(entree.id, { modeleId: liste.value }));
  remplir();
  return { bloc: creerChamp('Modèle de la carte', liste, 'Champ--large Champ--modele').bloc, remplir };
}

/**
 * Crée la liste déroulante de l'entreprise de la carte. Passer en réglage
 * personnalisé recopie les infos de l'entreprise dans la carte (rien ne
 * change à l'écran, mais elles deviennent modifiables).
 * @param {{id:string, entrepriseId:string, personne:object}} entree - Carte.
 * @param {object|null} entreprise - Entreprise reliée.
 * @returns {HTMLElement} Bloc du champ.
 */
function creerChoixEntreprise(entree, entreprise) {
  const liste = creerElement('select', { attributs: { id: 'carte-entreprise' } }, [
    creerElement('option', { texte: 'Réglage personnalisé (infos propres à la carte)', attributs: { value: PERSONNALISE } }),
    ...obtenirEtat().entreprises.map((e) => creerElement('option', { texte: e.nom || 'Sans nom', attributs: { value: e.id } })),
  ]);
  liste.value = entreprise ? entreprise.id : PERSONNALISE;
  liste.addEventListener('change', () => {
    const carte = trouverPersonne(entree.id);
    if (liste.value === PERSONNALISE) {
      modifierPersonne(entree.id, { entrepriseId: PERSONNALISE, personne: appliquerEntreprisePersonne(carte.personne, trouverEntreprise(carte.entrepriseId)) });
    } else {
      modifierPersonne(entree.id, { entrepriseId: liste.value });
    }
  });
  const { bloc } = creerChamp('Entreprise de la carte', liste, 'Champ--large Champ--modele');
  if (entreprise) bloc.append(creerElement('p', { classe: 'Aide', texte: `Adresse, site, standard, LinkedIn de l'entreprise et logo viennent de « ${entreprise.nom} ».` }));
  return bloc;
}

/**
 * Affiche une erreur si la valeur saisie est refusée par la validation.
 * @param {object} champ - Description du champ.
 * @param {HTMLInputElement} element - Contrôle saisi.
 * @param {HTMLElement} erreur - Zone d'erreur.
 */
function verifierChamp(champ, element, erreur) {
  const invalide = element.value.trim() !== '' && normaliserChamp(champ, element.value) === '';
  afficherErreur(erreur, element, invalide ? MESSAGES[champ.type] || 'Valeur invalide.' : '');
}

/**
 * Construit la section des liens personnalisés (ajout / suppression).
 * @param {HTMLElement} conteneur - Formulaire.
 * @param {object[]} liensInitiaux - Liens enregistrés.
 * @returns {{lire:Function, surSuppression:Function}} Accès aux liens saisis.
 */
function creerSectionLiens(conteneur, liensInitiaux) {
  const { section, contenu } = creerSection('Liens (réseaux, portfolio…) — chaque lien peut avoir son QR code', true);
  const liste = creerElement('div', { classe: 'Liens' });
  const boutonAjout = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: '+ Ajouter un lien', attributs: { type: 'button' } });
  const rapides = creerElement('div', { classe: 'Puces' });
  let apresSuppression = () => {};
  let compteur = 0;

  const rafraichir = () => {
    const plein = liste.children.length >= LIENS_MAX;
    boutonAjout.disabled = plein;
    rapides.querySelectorAll('button').forEach((b) => { b.disabled = plein; });
  };
  const ajouterLigne = (libelle = '', url = '', focus = false) => {
    if (liste.children.length >= LIENS_MAX) return;
    compteur += 1;
    const champLibelle = creerElement('input', { attributs: { type: 'text', id: `lien-libelle-${compteur}`, maxlength: 30, placeholder: 'LinkedIn', 'aria-label': 'Nom du lien' } });
    const champUrl = creerElement('input', { attributs: { type: 'url', id: `lien-url-${compteur}`, maxlength: 300, placeholder: 'https://…', 'aria-label': 'Adresse du lien', inputmode: 'url' } });
    champLibelle.value = libelle;
    champUrl.value = url;
    const erreur = creerElement('p', { classe: 'Champ-erreur', attributs: { hidden: true } });
    champUrl.addEventListener('input', () => verifierChamp({ type: 'url' }, champUrl, erreur));
    const ligne = creerElement('div', { classe: 'Lien' }, [champLibelle, champUrl, creerElement('button', {
      classe: 'Bouton Bouton--icone', texte: '✕', attributs: { type: 'button', 'aria-label': 'Supprimer ce lien' },
      surClic: () => { ligne.remove(); rafraichir(); apresSuppression(); },
    }), erreur]);
    liste.append(ligne);
    rafraichir();
    if (focus) (libelle ? champUrl : champLibelle).focus();
  };

  LIENS_RAPIDES.forEach((nom) => rapides.append(creerElement('button', {
    classe: 'Puce', texte: `+ ${nom}`, attributs: { type: 'button' }, surClic: () => ajouterLigne(nom, '', true),
  })));
  boutonAjout.addEventListener('click', () => ajouterLigne('', '', true));
  liensInitiaux.forEach((l) => ajouterLigne(l.libelle, l.url));
  contenu.append(liste, boutonAjout, rapides);
  conteneur.append(section);
  rafraichir();
  return {
    lire: () => Array.from(liste.children, (ligne) => {
      const [libelle, url] = ligne.querySelectorAll('input');
      return { libelle: libelle.value, url: url.value };
    }),
    surSuppression: (rappel) => { apresSuppression = rappel; },
  };
}
