/**
 * EtatEdition.js
 * État de l'éditeur de modèles : brouillon du modèle, face affichée,
 * sélection (un ou plusieurs éléments, groupes), grille, repères
 * d'impression, historique (annuler / rétablir) et presse-papiers
 * (éléments et style). Toutes les modifications passent par ces
 * fonctions et sont validées.
 */

import { normaliserModele, normaliserFace, SCHEMA_FOND, ELEMENTS_MAX } from '../../Metier/ModeleCarte.js';
import {
  normaliserElement, creerElementCarte, extraireStyle, appliquerStyle,
} from '../../Metier/Elements.js';
import {
  aligner, centrerSurCarte, repartir, boiteEnglobante, zoneCarte,
} from '../../Metier/Alignement.js';
import { dimensionsModele, adapterElements } from '../../Metier/Formats.js';
import { remplacerCouleur, TAILLE_PALETTE } from '../../Metier/Palette.js';
import { normaliserObjet, nouvelId } from '../../Utilitaires/Schema.js';
import { nettoyerTexte } from '../../Utilitaires/Validation.js';

const HISTORIQUE_MAX = 60;
const DECALAGE_COPIE = 20; // 2 mm

const edition = { modele: null, cote: 'recto', selectionIds: [], grille: true, reperes: false, modifie: false, personneApercuId: '' };
const historique = { passe: [], futur: [] };
// Presse-papiers interne (conservé quand on change de face ou de modèle).
const pressePapiers = { elements: [], style: null };
const abonnes = new Set();
// Disposition d'origine avant un changement de format : chaque nouveau format
// est recalculé depuis elle (pas d'erreurs cumulées, retour exact au départ).
let referenceFormat = null;

/**
 * Renvoie l'état de l'éditeur (à ne pas modifier directement).
 * @returns {object} État de l'édition.
 */
export function obtenirEdition() {
  return edition;
}

/**
 * Indique ce que contient le presse-papiers.
 * @returns {{elements:boolean, style:boolean}} Disponibilité du collage.
 */
export function contenuPressePapiers() {
  return { elements: pressePapiers.elements.length > 0, style: Boolean(pressePapiers.style) };
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
  edition.selectionIds = [];
  edition.modifie = modifie;
  referenceFormat = null;
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
 * Renvoie les dimensions de la carte en cours d'édition.
 * @returns {{largeur:number, hauteur:number}} Dimensions en dixièmes de mm.
 */
export function dimensions() {
  return dimensionsModele(edition.modele);
}

/**
 * Ajoute à une liste d'identifiants tous les membres de leurs groupes.
 * @param {string[]} ids - Identifiants.
 * @returns {string[]} Identifiants complétés (sans doublon).
 */
function avecGroupes(ids) {
  const groupes = new Set(elementsFace().filter((e) => ids.includes(e.id) && e.groupe).map((e) => e.groupe));
  const membres = elementsFace().filter((e) => groupes.has(e.groupe)).map((e) => e.id);
  return [...new Set([...ids, ...membres])];
}

/**
 * Renvoie les éléments sélectionnés qui peuvent bouger (non verrouillés).
 * @returns {object[]} Éléments déplaçables.
 */
export function elementsDeplacables() {
  return elementsSelectionnes().filter((e) => !e.verrouille);
}

/**
 * Renvoie les éléments de la face affichée.
 * @returns {object[]} Éléments.
 */
export function elementsFace() {
  return edition.modele[edition.cote].elements;
}

/**
 * Renvoie les éléments sélectionnés (dans l'ordre des calques).
 * @returns {object[]} Éléments sélectionnés.
 */
export function elementsSelectionnes() {
  return elementsFace().filter((e) => edition.selectionIds.includes(e.id));
}

/**
 * Renvoie l'élément sélectionné s'il est seul.
 * @returns {object|undefined} Élément, ou undefined si 0 ou plusieurs sélectionnés.
 */
export function elementSelectionne() {
  const selection = elementsSelectionnes();
  return selection.length === 1 ? selection[0] : undefined;
}

/**
 * Change la face affichée (la sélection est vidée).
 * @param {"recto"|"verso"} cote - Face.
 */
export function choisirCote(cote) {
  edition.cote = cote === 'verso' ? 'verso' : 'recto';
  edition.selectionIds = [];
  notifier('cote');
}

/**
 * Sélectionne un élément.
 * @param {string|null} id - Identifiant (null pour tout désélectionner).
 * @param {boolean} [ajouter=false] - true (Ctrl + clic) pour ajouter / retirer de la sélection.
 */
export function selectionner(id, ajouter = false) {
  const membres = id ? avecGroupes([id]) : [];
  if (!id) edition.selectionIds = [];
  else if (!ajouter) edition.selectionIds = membres;
  else if (edition.selectionIds.includes(id)) edition.selectionIds = edition.selectionIds.filter((s) => !membres.includes(s));
  else edition.selectionIds = [...new Set([...edition.selectionIds, ...membres])];
  notifier('selection');
}

/**
 * Remplace (ou complète) la sélection par une liste d'éléments.
 * @param {string[]} ids - Identifiants.
 * @param {boolean} [ajouter=false] - true pour ajouter à la sélection actuelle.
 */
export function selectionnerPlusieurs(ids, ajouter = false) {
  const existants = new Set(elementsFace().map((e) => e.id));
  const valides = avecGroupes(ids.filter((id) => existants.has(id)));
  edition.selectionIds = ajouter ? [...new Set([...edition.selectionIds, ...valides])] : valides;
  notifier('selection');
}

/** Sélectionne tous les éléments de la face. */
export function toutSelectionner() {
  selectionnerPlusieurs(elementsFace().map((e) => e.id));
}

/**
 * Change une option d'affichage (grille, personne de l'aperçu).
 * @param {object} options - { grille?, personneApercuId? }.
 */
export function modifierOptions(options) {
  if (typeof options.grille === 'boolean') edition.grille = options.grille;
  if (typeof options.reperes === 'boolean') edition.reperes = options.reperes;
  if (typeof options.personneApercuId === 'string') edition.personneApercuId = options.personneApercuId;
  notifier('options');
}

/** Mémorise l'état actuel dans l'historique (avant une modification). */
export function memoriser() {
  historique.passe.push(JSON.stringify(edition.modele));
  if (historique.passe.length > HISTORIQUE_MAX) historique.passe.shift();
  historique.futur = [];
}

/** Oublie la dernière mémorisation (geste sans effet, ex. simple clic). */
export function oublierDernierMemo() {
  historique.passe.pop();
}

/** Signale un changement du modèle. */
function signalerModification(garderReferenceFormat = false) {
  if (!garderReferenceFormat) referenceFormat = null;
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
  referenceFormat = null;
  const existants = new Set(elementsFace().map((e) => e.id));
  edition.selectionIds = edition.selectionIds.filter((id) => existants.has(id));
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
  modifierElements([{ id, ...changements }]);
}

/**
 * Modifie plusieurs éléments en une seule fois (une seule mise à jour d'affichage).
 * @param {object[]} liste - Changements, chacun avec l'id de l'élément visé.
 */
export function modifierElements(liste) {
  const elements = elementsFace();
  liste.forEach(({ id, ...changements }) => {
    const index = elements.findIndex((e) => e.id === id);
    if (index >= 0) elements[index] = normaliserElement({ ...elements[index], ...changements, id, type: elements[index].type });
  });
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
  const avant = dimensionsModele(edition.modele);
  const nom = changements.nom !== undefined ? nettoyerTexte(changements.nom, 50) : edition.modele.nom;
  // Palette : la couleur remplacée change partout dans le modèle.
  for (let i = 1; i <= TAILLE_PALETTE; i++) {
    const cle = `palette${i}`;
    if (changements[cle] && /^#[0-9a-f]{6}$/i.test(changements[cle])) remplacerCouleur(edition.modele, edition.modele[cle], changements[cle].toLowerCase());
  }
  const modele = normaliserModele({ ...edition.modele, ...changements, nom: nom || 'Modèle sans nom', id });
  const apres = dimensionsModele(modele);
  const formatChange = apres.largeur !== avant.largeur || apres.hauteur !== avant.hauteur;
  if (formatChange) replacerSelonFormat(modele, avant, apres);
  edition.modele = modele;
  signalerModification(formatChange);
}

/**
 * Replace les éléments des deux faces pour un nouveau format, toujours à partir
 * de la disposition d'origine (mémorisée au premier changement de format).
 * @param {object} modele - Modèle déjà au nouveau format (modifié sur place).
 * @param {{largeur:number, hauteur:number}} avant - Dimensions actuelles.
 * @param {{largeur:number, hauteur:number}} apres - Nouvelles dimensions.
 */
function replacerSelonFormat(modele, avant, apres) {
  if (!referenceFormat) {
    referenceFormat = { dimensions: avant, recto: structuredClone(modele.recto.elements), verso: structuredClone(modele.verso.elements) };
  }
  const { dimensions: origine } = referenceFormat;
  const retourOrigine = origine.largeur === apres.largeur && origine.hauteur === apres.hauteur;
  ['recto', 'verso'].forEach((cote) => {
    const elements = structuredClone(referenceFormat[cote]);
    modele[cote] = normaliserFace({ ...modele[cote], elements: retourOrigine ? elements : adapterElements(elements, origine, apres) });
  });
}

/**
 * Ajoute des éléments au premier plan et les sélectionne.
 * @param {object[]} nouveaux - Éléments déjà validés.
 * @returns {boolean} false si la face serait trop pleine.
 */
function insererElements(nouveaux) {
  if (!nouveaux.length || elementsFace().length + nouveaux.length > ELEMENTS_MAX) return false;
  memoriser();
  elementsFace().push(...nouveaux);
  edition.selectionIds = nouveaux.map((e) => e.id);
  signalerModification();
  notifier('selection');
  return true;
}

/**
 * Ajoute un nouvel élément (centré sur la carte si aucune position n'est donnée).
 * @param {string} type - Type d'élément.
 * @param {object} [valeurs] - Valeurs initiales.
 * @returns {boolean} false si la face est pleine.
 */
export function ajouterElement(type, valeurs = {}) {
  const element = creerElementCarte(type, valeurs);
  const { largeur, hauteur } = dimensions();
  if (valeurs.x === undefined) element.x = Math.round((largeur - element.largeur) / 2);
  if (valeurs.y === undefined) element.y = Math.round((hauteur - element.hauteur) / 2);
  return insererElements([element]);
}

/**
 * Ajoute plusieurs nouveaux éléments d'un coup (ex. : QR des liens) et les sélectionne.
 * @param {Array<[string, object]>} definitions - Liste de [type, valeurs initiales].
 * @returns {boolean} false si la face serait trop pleine.
 */
export function ajouterGroupe(definitions) {
  return insererElements(definitions.map(([type, valeurs]) => creerElementCarte(type, valeurs)));
}

/**
 * Crée des copies d'éléments avec de nouveaux identifiants.
 * @param {object[]} elements - Éléments à copier.
 * @param {number} decalage - Décalage en dixièmes de mm.
 * @returns {object[]} Copies validées.
 */
function copierAvecNouveauxIds(elements, decalage) {
  // Les copies forment leurs propres groupes (sans rejoindre ceux d'origine).
  const nouveauxGroupes = new Map();
  const groupeCopie = (groupe) => {
    if (!groupe) return '';
    if (!nouveauxGroupes.has(groupe)) nouveauxGroupes.set(groupe, nouvelId('g'));
    return nouveauxGroupes.get(groupe);
  };
  return elements.map((e) => normaliserElement({
    ...structuredClone(e), id: nouvelId('e'), groupe: groupeCopie(e.groupe), x: e.x + decalage, y: e.y + decalage,
  }));
}

/**
 * Supprime des éléments.
 * @param {string[]} ids - Identifiants.
 */
export function supprimerElements(ids) {
  if (!ids.length) return;
  memoriser();
  const face = edition.modele[edition.cote];
  face.elements = face.elements.filter((e) => !ids.includes(e.id));
  edition.selectionIds = edition.selectionIds.filter((id) => !ids.includes(id));
  signalerModification();
  notifier('selection');
}

/** Supprime les éléments sélectionnés. */
export function supprimerSelection() {
  supprimerElements([...edition.selectionIds]);
}

/**
 * Duplique des éléments (décalés de 2 mm) et sélectionne les copies.
 * @param {string[]} [ids] - Identifiants (par défaut : la sélection).
 * @returns {boolean} false si la face est pleine.
 */
export function dupliquer(ids = edition.selectionIds) {
  return insererElements(copierAvecNouveauxIds(elementsFace().filter((e) => ids.includes(e.id)), DECALAGE_COPIE));
}

/**
 * Copie les éléments sélectionnés dans le presse-papiers.
 * @returns {number} Nombre d'éléments copiés.
 */
export function copierSelection() {
  pressePapiers.elements = structuredClone(elementsSelectionnes());
  pressePapiers.cote = edition.cote;
  notifier('options');
  return pressePapiers.elements.length;
}

/**
 * Colle les éléments du presse-papiers sur la face affichée (décalés
 * s'ils sont collés sur la même face, à la même place sinon).
 * @returns {boolean} false si rien à coller ou face pleine.
 */
export function coller() {
  const memeFace = pressePapiers.cote === edition.cote;
  const copies = copierAvecNouveauxIds(pressePapiers.elements, memeFace ? DECALAGE_COPIE : 0);
  // Collages successifs : chaque collage est décalé un peu plus.
  if (memeFace) pressePapiers.elements = pressePapiers.elements.map((e) => ({ ...e, x: e.x + DECALAGE_COPIE, y: e.y + DECALAGE_COPIE }));
  return insererElements(copies);
}

/**
 * Copie le style de l'élément sélectionné (couleurs, police, tailles…).
 * @returns {boolean} false si aucun élément unique n'est sélectionné.
 */
export function copierStyle() {
  const element = elementSelectionne();
  if (!element) return false;
  pressePapiers.style = extraireStyle(element);
  notifier('options');
  return true;
}

/**
 * Applique le style copié à tous les éléments sélectionnés.
 * @returns {boolean} false si rien à coller.
 */
export function collerStyle() {
  const selection = elementsSelectionnes();
  if (!pressePapiers.style || !selection.length) return false;
  memoriser();
  modifierElements(selection.map((e) => appliquerStyle(e, pressePapiers.style)));
  return true;
}

/**
 * Applique des positions calculées (alignement, centrage, répartition).
 * @param {{id:string, x:number, y:number}[]} positions - Nouvelles positions.
 */
function appliquerPositions(positions) {
  memoriser();
  modifierElements(positions);
}

/**
 * Aligne la sélection : sur la carte si un seul élément, sur la sélection sinon.
 * @param {string} mode - gauche, centreH, droite, haut, centreV ou bas.
 */
export function alignerSelection(mode) {
  const selection = elementsDeplacables();
  if (!selection.length) return;
  appliquerPositions(aligner(selection, mode, selection.length === 1 ? zoneCarte(dimensions()) : boiteEnglobante(selection)));
}

/**
 * Centre la sélection (d'un bloc) sur la carte.
 * @param {"horizontal"|"vertical"} axe - Axe de centrage.
 */
export function centrerSelection(axe) {
  const selection = elementsDeplacables();
  if (selection.length) appliquerPositions(centrerSurCarte(selection, axe, dimensions()));
}

/**
 * Répartit régulièrement la sélection (3 éléments minimum).
 * @param {"horizontal"|"vertical"} axe - Axe de répartition.
 */
export function repartirSelection(axe) {
  const selection = elementsDeplacables();
  if (selection.length >= 3) appliquerPositions(repartir(selection, axe));
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

/** Copie toute la face affichée sur l'autre face (remplace son contenu). */
export function copierSurAutreFace() {
  memoriser();
  const autre = edition.cote === 'recto' ? 'verso' : 'recto';
  const copie = structuredClone(edition.modele[edition.cote]);
  copie.elements.forEach((e) => { e.id = nouvelId('e'); });
  edition.modele[autre] = normaliserFace(copie);
  signalerModification();
}

/**
 * Regroupe les éléments sélectionnés : ils seront ensuite sélectionnés
 * et déplacés ensemble.
 * @returns {boolean} false s'il y a moins de 2 éléments sélectionnés.
 */
export function grouperSelection() {
  if (edition.selectionIds.length < 2) return false;
  memoriser();
  const groupe = nouvelId('g');
  modifierElements(edition.selectionIds.map((id) => ({ id, groupe })));
  return true;
}

/**
 * Dissocie les groupes des éléments sélectionnés.
 */
export function degrouperSelection() {
  if (!elementsSelectionnes().some((e) => e.groupe)) return;
  memoriser();
  modifierElements(edition.selectionIds.map((id) => ({ id, groupe: '' })));
}

/**
 * Verrouille ou déverrouille la sélection (un élément verrouillé ne bouge plus).
 * @returns {boolean} Nouvel état (true = verrouillé).
 */
export function basculerVerrouillage() {
  const selection = elementsSelectionnes();
  if (!selection.length) return false;
  const verrouiller = selection.some((e) => !e.verrouille);
  memoriser();
  modifierElements(selection.map((e) => ({ id: e.id, verrouille: verrouiller })));
  return verrouiller;
}
