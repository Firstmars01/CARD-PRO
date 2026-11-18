/**
 * EtatEdition.js
 * État de l'éditeur de modèles : brouillon du modèle en cours, face
 * affichée, élément sélectionné, grille et historique (annuler / rétablir).
 * Toutes les modifications passent par ces fonctions et sont validées.
 */

import { normaliserModele, normaliserFace, SCHEMA_FOND, ELEMENTS_MAX } from '../../Metier/ModeleCarte.js';
import { normaliserElement, creerElementCarte } from '../../Metier/Elements.js';
import { normaliserObjet, nouvelId } from '../../Utilitaires/Schema.js';
import { nettoyerTexte } from '../../Utilitaires/Validation.js';

const HISTORIQUE_MAX = 60;
const LARGEUR_CARTE = 850;
const HAUTEUR_CARTE = 550;

const edition = { modele: null, cote: 'recto', selectionId: null, grille: true, modifie: false, personneApercuId: '' };
const historique = { passe: [], futur: [] };
const abonnes = new Set();

/**
 * Renvoie l'état de l'éditeur (à ne pas modifier directement).
 * @returns {object} État de l'édition.
 */
export function obtenirEdition() {
  return edition;
}

/**
 * Abonne une fonction aux changements de l'éditeur.
 * @param {Function} rappel - Reçoit le type : "tout", "modele", "selection", "cote", "options".
 * @returns {Function} Fonction pour se désabonner.
 */
export function abonnerEdition(rappel) {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

/**
 * Prévient les abonnés.
 * @param {string} type - Type de changement.
 */
function notifier(type) {
  abonnes.forEach((rappel) => rappel(type));
}

/**
 * Charge un modèle dans l'éditeur (copie de travail).
 * @param {object} modele - Modèle à éditer.
 * @param {boolean} [modifie=false] - true si le brouillon n'est pas encore enregistré.
 */
export function chargerModele(modele, modifie = false) {
  edition.modele = normaliserModele(structuredClone(modele));
  edition.selectionId = null;
  edition.modifie = modifie;
  historique.passe = [];
  historique.futur = [];
  notifier('tout');
}

/**
 * Marque le brouillon comme enregistré (après sauvegarde sur le serveur).
 * @param {object} modele - Modèle enregistré (identifiant définitif).
 */
export function marquerEnregistre(modele) {
  edition.modele.id = modele.id;
  edition.modifie = false;
  notifier('options');
}

/**
 * Renvoie les éléments de la face affichée.
 * @returns {object[]} Éléments.
 */
export function elementsFace() {
  return edition.modele[edition.cote].elements;
}

/**
 * Renvoie l'élément sélectionné.
 * @returns {object|undefined} Élément.
 */
export function elementSelectionne() {
  return elementsFace().find((e) => e.id === edition.selectionId);
}

/**
 * Change la face affichée.
 * @param {"recto"|"verso"} cote - Face.
 */
export function choisirCote(cote) {
  edition.cote = cote === 'verso' ? 'verso' : 'recto';
  edition.selectionId = null;
  notifier('cote');
}

/**
 * Sélectionne un élément (null pour désélectionner).
 * @param {string|null} id - Identifiant.
 */
export function selectionner(id) {
  if (edition.selectionId === id) return;
  edition.selectionId = id;
  notifier('selection');
}

/**
 * Change une option d'affichage (grille, personne de l'aperçu).
 * @param {object} options - { grille?, personneApercuId? }.
 */
export function modifierOptions(options) {
  if (typeof options.grille === 'boolean') edition.grille = options.grille;
  if (typeof options.personneApercuId === 'string') edition.personneApercuId = options.personneApercuId;
  notifier('options');
}

/**
 * Mémorise l'état actuel dans l'historique (avant une modification).
 */
export function memoriser() {
  historique.passe.push(JSON.stringify(edition.modele));
  if (historique.passe.length > HISTORIQUE_MAX) historique.passe.shift();
  historique.futur = [];
}

/**
 * Oublie la dernière mémorisation (geste sans effet, ex. simple clic).
 */
export function oublierDernierMemo() {
  historique.passe.pop();
}

/**
 * Indique un changement du modèle.
 */
function signalerModification() {
  edition.modifie = true;
  notifier('modele');
}

/**
 * Restaure un état sauvegardé de l'historique.
 * @param {string[]} source - Pile d'où l'état est retiré.
 * @param {string[]} cible - Pile où l'état actuel est rangé.
 */
function restaurer(source, cible) {
  if (!source.length) return;
  cible.push(JSON.stringify(edition.modele));
  edition.modele = normaliserModele(JSON.parse(source.pop()));
  if (!elementSelectionne()) edition.selectionId = null;
  edition.modifie = true;
  notifier('tout');
}

/** Annule la dernière modification. */
export function annuler() {
  restaurer(historique.passe, historique.futur);
}

/** Rétablit la modification annulée. */
export function retablir() {
  restaurer(historique.futur, historique.passe);
}

/**
 * Modifie un élément de la face affichée (valeurs revalidées).
 * @param {string} id - Identifiant de l'élément.
 * @param {object} changements - Réglages modifiés.
 */
export function modifierElement(id, changements) {
  const elements = elementsFace();
  const index = elements.findIndex((e) => e.id === id);
  if (index < 0) return;
  elements[index] = normaliserElement({ ...elements[index], ...changements, id, type: elements[index].type });
  signalerModification();
}

/**
 * Modifie le fond de la face affichée.
 * @param {object} changements - Réglages du fond modifiés.
 */
export function modifierFond(changements) {
  const face = edition.modele[edition.cote];
  face.fond = normaliserObjet(SCHEMA_FOND, { ...face.fond, ...changements }, face.fond);
  signalerModification();
}

/**
 * Modifie les réglages globaux du modèle (nom, arrondi).
 * @param {object} changements - Réglages modifiés.
 */
export function modifierModele(changements) {
  const { id } = edition.modele;
  const nom = changements.nom !== undefined ? nettoyerTexte(changements.nom, 50) : edition.modele.nom;
  edition.modele = normaliserModele({ ...edition.modele, ...changements, nom: nom || 'Modèle sans nom', id });
  signalerModification();
}

/**
 * Ajoute un élément au premier plan de la face affichée et le sélectionne.
 * @param {string} type - Type d'élément.
 * @param {object} [valeurs] - Valeurs initiales.
 * @returns {boolean} false si la face est pleine.
 */
export function ajouterElement(type, valeurs = {}) {
  if (elementsFace().length >= ELEMENTS_MAX) return false;
  memoriser();
  const element = creerElementCarte(type, valeurs);
  // Sans position imposée, l'élément est centré sur la carte.
  if (valeurs.x === undefined) element.x = Math.round((LARGEUR_CARTE - element.largeur) / 2);
  if (valeurs.y === undefined) element.y = Math.round((HAUTEUR_CARTE - element.hauteur) / 2);
  elementsFace().push(element);
  edition.selectionId = element.id;
  signalerModification();
  notifier('selection');
  return true;
}

/**
 * Supprime un élément.
 * @param {string} id - Identifiant.
 */
export function supprimerElement(id) {
  memoriser();
  const face = edition.modele[edition.cote];
  face.elements = face.elements.filter((e) => e.id !== id);
  if (edition.selectionId === id) edition.selectionId = null;
  signalerModification();
  notifier('selection');
}

/**
 * Duplique un élément (décalé de 2 mm) et sélectionne la copie.
 * @param {string} id - Identifiant.
 */
export function dupliquerElement(id) {
  const source = elementsFace().find((e) => e.id === id);
  if (!source || elementsFace().length >= ELEMENTS_MAX) return;
  memoriser();
  const copie = normaliserElement({ ...structuredClone(source), id: nouvelId('e'), x: source.x + 20, y: source.y + 20 });
  elementsFace().push(copie);
  edition.selectionId = copie.id;
  signalerModification();
  notifier('selection');
}

/**
 * Change l'ordre d'affichage d'un élément (calques).
 * @param {string} id - Identifiant.
 * @param {number} sens - +1 vers l'avant, -1 vers l'arrière.
 */
export function deplacerCalque(id, sens) {
  const elements = elementsFace();
  const index = elements.findIndex((e) => e.id === id);
  const cible = index + sens;
  if (index < 0 || cible < 0 || cible >= elements.length) return;
  memoriser();
  [elements[index], elements[cible]] = [elements[cible], elements[index]];
  signalerModification();
}

/**
 * Copie toute la face affichée sur l'autre face (remplace son contenu).
 */
export function copierSurAutreFace() {
  memoriser();
  const autre = edition.cote === 'recto' ? 'verso' : 'recto';
  const copie = structuredClone(edition.modele[edition.cote]);
  copie.elements.forEach((e) => { e.id = nouvelId('e'); });
  edition.modele[autre] = normaliserFace(copie);
  signalerModification();
}
