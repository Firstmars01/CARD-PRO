/**
 * VueEdition.js
 * Écran « Modifier ma carte » : la personne corrige ses propres infos sur le
 * téléphone (nom, poste, téléphones, e-mail, liens, photo) sans repasser par
 * le Configurateur. Le design ne change pas. Mêmes contrôles que sur PC ; les
 * modifications restent sur ce téléphone.
 */

import { creerElement, vider } from '../../../src/Utilitaires/Dom.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { chargerPhotoProfil } from '../../../src/Utilitaires/Image.js';
import {
  CHAMPS_PERSONNE, LIENS_MAX, PERSONNE_EXEMPLE, normaliserChamp, normaliserPersonne,
} from '../../../src/Metier/Personne.js';
import { trouverCarte, modifierCarte } from '../Metier/Portefeuille.js';
import { revenirALaListe } from './Navigation.js';
import { boutonIcone } from './BoutonIcone.js';

// Infos modifiables sur le téléphone, dans l'ordre affiché.
const CLES = ['prenom', 'nom', 'poste', 'telephoneMobile', 'telephoneSupport', 'whatsapp', 'email', 'siteWeb', 'linkedin', 'rendezVous'];
const TYPES_INPUT = { tel: 'tel', email: 'email', url: 'url', texte: 'text' };
const MESSAGES = { tel: 'Numéro invalide.', email: 'Adresse e-mail invalide.', url: 'Lien invalide (https://…).' };

/**
 * Crée un champ de saisie avec son libellé et sa zone d'erreur.
 * @param {object} champ - Description du champ (CHAMPS_PERSONNE).
 * @param {string} valeur - Valeur actuelle.
 * @returns {{bloc:HTMLElement, element:HTMLInputElement, valide:() => boolean}} Champ.
 */
function creerChampMobile(champ, valeur) {
  const exemple = PERSONNE_EXEMPLE[champ.cle];
  const element = creerElement('input', {
    attributs: {
      id: `edition-${champ.cle}`, type: TYPES_INPUT[champ.type] || 'text', maxlength: champ.max, autocomplete: 'off',
      inputmode: champ.type === 'tel' ? 'tel' : undefined, placeholder: exemple ? `Ex. : ${exemple}` : undefined,
    },
  });
  element.value = valeur;
  const erreur = creerElement('p', { classe: 'Edition-erreur', attributs: { hidden: true } });
  const valide = () => {
    const invalide = element.value.trim() !== '' && normaliserChamp(champ, element.value) === '';
    erreur.hidden = !invalide;
    erreur.textContent = invalide ? MESSAGES[champ.type] || 'Valeur invalide.' : '';
    return !invalide;
  };
  element.addEventListener('input', valide);
  const bloc = creerElement('label', { classe: 'Edition-champ' }, [creerElement('span', { texte: champ.libelle }), element, erreur]);
  return { bloc, element, valide };
}

/**
 * Crée la liste des liens personnalisés (ajout / suppression).
 * @param {{libelle:string, url:string}[]} liens - Liens actuels.
 * @returns {{bloc:HTMLElement, lire:() => object[]}} Section des liens.
 */
function creerLiens(liens) {
  const liste = creerElement('div', { classe: 'Edition-liens' });
  const ajouter = boutonIcone('ajouter', 'Ajouter un lien');
  const ligne = (libelle = '', url = '') => {
    if (liste.children.length >= LIENS_MAX) return;
    const nom = creerElement('input', { attributs: { type: 'text', maxlength: 30, placeholder: 'Ex. : Instagram', 'aria-label': 'Nom du lien' } });
    const adresse = creerElement('input', { attributs: { type: 'url', maxlength: 300, placeholder: 'https://…', 'aria-label': 'Adresse du lien', inputmode: 'url' } });
    nom.value = libelle;
    adresse.value = url;
    const element = creerElement('div', { classe: 'Edition-lien' }, [nom, adresse, boutonIcone('fermer', '', {
      aideLecture: 'Supprimer ce lien', surClic: () => { element.remove(); ajouter.disabled = false; },
    })]);
    liste.append(element);
    ajouter.disabled = liste.children.length >= LIENS_MAX;
  };
  liens.forEach((l) => ligne(l.libelle, l.url));
  ajouter.addEventListener('click', () => ligne());
  return {
    bloc: creerElement('fieldset', { classe: 'Edition-groupe' }, [creerElement('legend', { texte: 'Liens (réseaux, portfolio…)' }), liste, ajouter]),
    lire: () => Array.from(liste.children, (l) => {
      const [nom, adresse] = l.querySelectorAll('input');
      return { libelle: nom.value, url: adresse.value };
    }).filter((l) => l.url.trim()),
  };
}

/**
 * Crée le choix de la photo de profil (recadrée et allégée comme sur PC).
 * @param {string} photo - Photo actuelle ('' si aucune).
 * @returns {{bloc:HTMLElement, lire:() => string}} Section photo.
 */
function creerPhoto(photo) {
  let actuelle = photo;
  const apercu = creerElement('img', { classe: 'Edition-photo', attributs: { alt: 'Photo de profil' } });
  const entree = creerElement('input', { attributs: { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true } });
  const retirer = boutonIcone('supprimer', 'Retirer');
  const afficher = () => {
    apercu.hidden = !actuelle;
    retirer.hidden = !actuelle;
    if (actuelle) apercu.src = actuelle;
  };
  entree.addEventListener('change', async () => {
    const [fichier] = entree.files;
    entree.value = '';
    if (!fichier) return;
    try {
      actuelle = await chargerPhotoProfil(fichier);
      afficher();
    } catch (erreur) {
      notifier(erreur.message, 'erreur');
    }
  });
  retirer.addEventListener('click', () => { actuelle = ''; afficher(); });
  afficher();
  return {
    bloc: creerElement('fieldset', { classe: 'Edition-groupe' }, [
      creerElement('legend', { texte: 'Photo de profil' }), apercu, entree,
      creerElement('div', { classe: 'Actions' }, [boutonIcone('image', 'Choisir une photo', { surClic: () => entree.click() }), retirer]),
    ]),
    lire: () => actuelle,
  };
}

/**
 * Crée l'écran « modifier ma carte ».
 * @returns {{element:HTMLElement, afficher:(id:string) => void}} Écran.
 */
export function creerVueEdition() {
  const element = creerElement('section', { classe: 'Ecran', attributs: { 'aria-label': 'Modifier ma carte' } });

  /**
   * Affiche le formulaire d'une carte.
   * @param {string} id - Identifiant de la carte.
   */
  const afficher = (id) => {
    vider(element);
    const carte = trouverCarte(id);
    if (!carte || !carte.maCarte) {
      revenirALaListe();
      return;
    }
    const champs = CLES.map((cle) => CHAMPS_PERSONNE.find((c) => c.cle === cle)).map((champ) => ({ champ, ...creerChampMobile(champ, carte.personne[champ.cle]) }));
    const liens = creerLiens(carte.personne.liens);
    const photo = creerPhoto(carte.personne.photo);
    const enregistrer = boutonIcone('coche', 'Enregistrer', { classe: 'PBouton PBouton--principal' });
    enregistrer.addEventListener('click', async () => {
      if (!champs.every((c) => c.valide())) {
        notifier('Corrige les champs en rouge.', 'erreur');
        return;
      }
      const saisie = Object.fromEntries(champs.map(({ champ, element: e }) => [champ.cle, e.value]));
      try {
        await modifierCarte(id, { personne: normaliserPersonne({ ...carte.personne, ...saisie, liens: liens.lire(), photo: photo.lire() }) });
        notifier('Ta carte est à jour sur ce téléphone.', 'succes');
        history.back();
      } catch (erreur) {
        notifier(erreur.message, 'erreur');
      }
    });
    const annuler = boutonIcone('retour', 'Annuler', { surClic: () => history.back() });
    element.append(
      creerElement('h2', { classe: 'Titre-ecran', texte: 'Modifier ma carte' }),
      creerElement('p', { classe: 'Astuce', texte: 'Le design ne change pas. Les modifications restent sur ce téléphone (elles ne remontent pas au Configurateur).' }),
      creerElement('div', { classe: 'Edition' }, champs.map((c) => c.bloc)),
      liens.bloc,
      photo.bloc,
      creerElement('div', { classe: 'Actions' }, [annuler, enregistrer]),
    );
  };

  return { element, afficher };
}
