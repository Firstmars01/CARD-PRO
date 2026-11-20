/**
 * ListeModeles.js
 * Barre du haut de l'éditeur : choix du modèle, nom, et actions
 * (nouveau, dupliquer, enregistrer, supprimer, exporter, importer).
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { nomFichierSur, nettoyerTexte } from '../../Utilitaires/Validation.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { nouvelId } from '../../Utilitaires/Schema.js';
import { normaliserModele, estModeleDeBase, faceVide } from '../../Metier/ModeleCarte.js';
import { creerElementCarte } from '../../Metier/Elements.js';
import { MODELES_DE_BASE } from '../../Metier/ModelesDeBase.js';
import {
  obtenirEtat, abonner, tousLesModeles, trouverModele, enregistrerModele, supprimerModele,
} from '../../Metier/EtatApplication.js';
import { obtenirEdition, abonnerEdition, chargerModele, marquerEnregistre, modifierModele, memoriser } from './EtatEdition.js';
import { creerChamp } from '../Champs.js';
import { notifier } from '../Notifications.js';

const POIDS_MAX_IMPORT = 8 * 1024 * 1024;

/**
 * Demande confirmation avant de perdre des modifications non enregistrées.
 * @returns {boolean} true si on peut continuer.
 */
function confirmerPerte() {
  return !obtenirEdition().modifie || window.confirm('Le modèle a des modifications non enregistrées. Continuer sans enregistrer ?');
}

/**
 * Monte la barre de gestion des modèles.
 * @param {HTMLElement} conteneur - Zone de la barre.
 */
export function monterListeModeles(conteneur) {
  const liste = creerElement('select', { attributs: { id: 'modele-choix' } });
  const nom = creerElement('input', { attributs: { type: 'text', id: 'modele-nom', maxlength: 50 } });
  const etatEnregistrement = creerElement('span', { classe: 'Etat-enregistrement', attributs: { role: 'status' } });
  const entreeImport = creerElement('input', { classe: 'Masque', attributs: { type: 'file', accept: 'application/json,.json', 'aria-label': 'Importer un modèle' } });
  const bouton = (texte, action, classe = 'Bouton--secondaire') => creerElement('button', { classe: `Bouton ${classe}`, texte, attributs: { type: 'button' }, surClic: action });
  const boutonSupprimer = bouton('Supprimer', supprimer);

  liste.addEventListener('change', () => {
    if (!confirmerPerte()) {
      liste.value = obtenirEdition().modele.id;
      return;
    }
    chargerModele(trouverModele(liste.value));
  });
  let nomEnCours = false;
  nom.addEventListener('input', () => {
    if (!nomEnCours) memoriser();
    nomEnCours = true;
    modifierModele({ nom: nom.value });
  });
  nom.addEventListener('change', () => { nomEnCours = false; });
  entreeImport.addEventListener('change', () => importer(entreeImport));

  conteneur.append(
    creerChamp('Modèle', liste, 'Champ--modele').bloc,
    creerChamp('Nom du modèle', nom, 'Champ--modele').bloc,
    creerElement('div', { classe: 'BarreActions' }, [
      bouton('Enregistrer', enregistrer, 'Bouton--principal'),
      bouton('Nouveau', nouveau),
      bouton('Dupliquer', dupliquer),
      boutonSupprimer,
      bouton('Exporter (.json)', exporter),
      bouton('Importer (.json)', () => entreeImport.click()),
      entreeImport,
      etatEnregistrement,
    ]),
  );

  // Met à jour la liste, le nom et l'état d'enregistrement.
  const actualiser = () => {
    const { modele, modifie } = obtenirEdition();
    vider(liste);
    const groupe = (libelle, modeles) => creerElement('optgroup', { attributs: { label: libelle } },
      modeles.map((m) => creerElement('option', { texte: m.nom, attributs: { value: m.id } })));
    liste.append(groupe('Modèles de base', MODELES_DE_BASE));
    if (obtenirEtat().modeles.length) liste.append(groupe('Mes modèles', obtenirEtat().modeles));
    if (!tousLesModeles().some((m) => m.id === modele.id)) liste.append(creerElement('option', { texte: `${modele.nom} (non enregistré)`, attributs: { value: modele.id } }));
    liste.value = modele.id;
    if (document.activeElement !== nom) nom.value = modele.nom;
    const deBase = estModeleDeBase(modele);
    boutonSupprimer.disabled = deBase || !obtenirEtat().modeles.some((m) => m.id === modele.id);
    if (deBase) etatEnregistrement.textContent = modifie ? '● Modèle de base modifié : « Enregistrer » crée ta copie' : 'Modèle de base (lecture seule)';
    else etatEnregistrement.textContent = modifie ? 'Modifications non enregistrées' : 'Enregistré';
    etatEnregistrement.classList.toggle('Etat-enregistrement--modifie', modifie);
  };
  abonnerEdition((type) => { if (type !== 'selection' && type !== 'cote') actualiser(); });
  abonner((type) => { if (type === 'modeles') actualiser(); });
  window.addEventListener('beforeunload', (e) => { if (obtenirEdition().modifie) e.preventDefault(); });
  actualiser();
}

/**
 * Enregistre le brouillon (un modèle de base est enregistré comme copie).
 */
async function enregistrer() {
  const { modele } = obtenirEdition();
  const aEnregistrer = structuredClone(modele);
  if (estModeleDeBase(aEnregistrer)) {
    aEnregistrer.id = nouvelId('m');
    if (MODELES_DE_BASE.some((m) => m.nom === aEnregistrer.nom)) aEnregistrer.nom = nettoyerTexte(`${aEnregistrer.nom} (copie)`, 50);
  }
  try {
    const enregistre = await enregistrerModele(aEnregistrer);
    if (enregistre.nom !== modele.nom) modifierModele({ nom: enregistre.nom });
    marquerEnregistre(enregistre);
    notifier(`Modèle « ${enregistre.nom} » enregistré.`, 'succes');
  } catch (erreur) {
    notifier(erreur.message, 'erreur');
  }
}

/**
 * Crée un modèle vierge (nom + QR au recto).
 */
function nouveau() {
  if (!confirmerPerte()) return;
  const recto = faceVide();
  recto.elements.push(
    creerElementCarte('texte', { x: 60, y: 70, largeur: 460, hauteur: 60, champ: 'nomComplet', taille: 44, graisse: '700' }),
    creerElementCarte('qr', { x: 570, y: 145, largeur: 260, hauteur: 260 }),
  );
  chargerModele(normaliserModele({ id: nouvelId('m'), nom: 'Nouveau modèle', recto, verso: faceVide() }), true);
}

/**
 * Duplique le modèle affiché (copie non enregistrée).
 */
function dupliquer() {
  if (!confirmerPerte()) return;
  const copie = structuredClone(obtenirEdition().modele);
  copie.id = nouvelId('m');
  copie.nom = nettoyerTexte(`${copie.nom} (copie)`, 50);
  chargerModele(copie, true);
  notifier('Copie créée : pense à l\'enregistrer.', 'info');
}

/**
 * Supprime le modèle enregistré affiché.
 */
async function supprimer() {
  const { modele } = obtenirEdition();
  if (!window.confirm(`Supprimer le modèle « ${modele.nom} » ? Les cartes qui l'utilisent passeront sur le modèle « ${MODELES_DE_BASE[0].nom} ».`)) return;
  try {
    await supprimerModele(modele.id);
    chargerModele(MODELES_DE_BASE[0]);
    notifier('Modèle supprimé.', 'info');
  } catch (erreur) {
    notifier(erreur.message, 'erreur');
  }
}

/**
 * Télécharge le modèle affiché au format JSON.
 */
function exporter() {
  const { modele } = obtenirEdition();
  telechargerBlob(new Blob([JSON.stringify(modele, null, 2)], { type: 'application/json' }), `modele-${nomFichierSur(modele.nom, 'carte')}.json`);
}

/**
 * Importe un modèle JSON (revalidé) comme nouveau brouillon.
 * @param {HTMLInputElement} entree - Champ fichier.
 */
async function importer(entree) {
  const [fichier] = entree.files;
  entree.value = '';
  if (!fichier || !confirmerPerte()) return;
  if (fichier.size > POIDS_MAX_IMPORT) {
    notifier('Fichier trop lourd (8 Mo maximum).', 'erreur');
    return;
  }
  try {
    const modele = normaliserModele(JSON.parse(await fichier.text()));
    modele.id = nouvelId('m');
    chargerModele(modele, true);
    notifier(`Modèle « ${modele.nom} » importé : pense à l'enregistrer.`, 'succes');
  } catch {
    notifier('Fichier de modèle invalide.', 'erreur');
  }
}
