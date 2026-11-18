/**
 * ZoneEdition.js
 * Zone centrale de l'éditeur : affiche la face en cours et permet de
 * sélectionner, déplacer (glisser) et redimensionner (poignée) les
 * éléments à la souris, au doigt ou au clavier. Aimantation au
 * millimètre et aux axes centraux quand la grille est active.
 */

import { creerElement, creerSvg, vider } from '../../Utilitaires/Dom.js';
import { PERSONNE_EXEMPLE } from '../../Metier/Personne.js';
import { genererQrPersonne } from '../../Metier/ContenuQr.js';
import { trouverPersonne } from '../../Metier/EtatApplication.js';
import { rendreFaceSvg, LARGEUR, HAUTEUR } from '../Rendu/RenduFaceSvg.js';
import {
  obtenirEdition, abonnerEdition, elementSelectionne, selectionner, modifierElement, memoriser, oublierDernierMemo,
  supprimerElement, dupliquerElement, annuler, retablir,
} from './EtatEdition.js';

const PAS_GRILLE = 10; // 1 mm
const AIMANT = 8; // distance d'aimantation aux axes (0,8 mm)
const TAILLE_POIGNEE = 22;

/**
 * Monte la zone d'édition.
 * @param {HTMLElement} conteneur - Zone d'accueil.
 */
export function monterZoneEdition(conteneur) {
  const zone = creerElement('div', { classe: 'ZoneEdition', attributs: { tabindex: 0, 'aria-label': "Zone d'édition de la carte. Flèches pour déplacer l'élément sélectionné." } });
  conteneur.append(zone);
  let geste = null;
  let rafEnAttente = false;
  let apercu = { id: null, personne: PERSONNE_EXEMPLE, qr: genererQrPersonne(PERSONNE_EXEMPLE).qr };

  // Dessine la face (au plus une fois par image affichée).
  const dessiner = () => {
    rafEnAttente = false;
    const edition = obtenirEdition();
    if (apercu.id !== edition.personneApercuId) {
      const personne = trouverPersonne(edition.personneApercuId)?.personne || PERSONNE_EXEMPLE;
      apercu = { id: edition.personneApercuId, personne, qr: genererQrPersonne(personne).qr };
    }
    const svg = rendreFaceSvg(edition.modele, edition.cote, apercu.personne, apercu.qr, { edition: true });
    dessinerSurcouche(svg, edition);
    vider(zone);
    zone.append(svg);
  };
  const demanderDessin = () => {
    if (!rafEnAttente) {
      rafEnAttente = true;
      requestAnimationFrame(dessiner);
    }
  };
  abonnerEdition(demanderDessin);

  zone.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const svg = zone.querySelector('svg');
    if (!svg) return;
    const point = versSvg(svg, e);
    const surPoignee = e.target.closest('[data-poignee]');
    const groupe = e.target.closest('[data-id]');
    if (!surPoignee && !groupe) {
      selectionner(null);
      return;
    }
    if (!surPoignee) selectionner(groupe.getAttribute('data-id'));
    const element = elementSelectionne();
    if (!element) return;
    memoriser();
    geste = { type: surPoignee ? 'taille' : 'deplacement', depart: point, initial: { ...element }, bouge: false };
    zone.setPointerCapture(e.pointerId);
    zone.focus();
    e.preventDefault();
  });

  zone.addEventListener('pointermove', (e) => {
    if (!geste) return;
    const point = versSvg(zone.querySelector('svg'), e);
    const dx = point.x - geste.depart.x;
    const dy = point.y - geste.depart.y;
    if (!geste.bouge && Math.hypot(dx, dy) < 2) return;
    geste.bouge = true;
    const { initial } = geste;
    modifierElement(initial.id, geste.type === 'deplacement' ? nouvellePosition(initial, dx, dy) : nouvelleTaille(initial, dx, dy));
  });

  const terminer = () => {
    if (geste && !geste.bouge) oublierDernierMemo();
    geste = null;
  };
  zone.addEventListener('pointerup', terminer);
  zone.addEventListener('pointercancel', terminer);
  zone.addEventListener('keydown', gererClavier);
  dessiner();
}

/**
 * Convertit la position du pointeur en coordonnées de la carte.
 * @param {SVGSVGElement} svg - Face affichée.
 * @param {PointerEvent} e - Événement.
 * @returns {{x:number, y:number}} Point en unités de la carte.
 */
function versSvg(svg, e) {
  const matrice = svg.getScreenCTM().inverse();
  return new DOMPoint(e.clientX, e.clientY).matrixTransform(matrice);
}

/**
 * Arrondit au millimètre si la grille est active.
 * @param {number} valeur - Valeur en dixièmes de mm.
 * @returns {number} Valeur aimantée.
 */
function aimanter(valeur) {
  return obtenirEdition().grille ? Math.round(valeur / PAS_GRILLE) * PAS_GRILLE : Math.round(valeur);
}

/**
 * Calcule la nouvelle position, aimantée aux axes centraux de la carte.
 * @param {object} initial - Élément au début du geste.
 * @param {number} dx - Déplacement horizontal.
 * @param {number} dy - Déplacement vertical.
 * @returns {{x:number, y:number}} Position.
 */
function nouvellePosition(initial, dx, dy) {
  let x = aimanter(initial.x + dx);
  let y = aimanter(initial.y + dy);
  if (obtenirEdition().grille) {
    if (Math.abs(x + initial.largeur / 2 - LARGEUR / 2) < AIMANT) x = Math.round(LARGEUR / 2 - initial.largeur / 2);
    if (Math.abs(y + initial.hauteur / 2 - HAUTEUR / 2) < AIMANT) y = Math.round(HAUTEUR / 2 - initial.hauteur / 2);
  }
  return { x, y };
}

/**
 * Calcule la nouvelle taille (le QR code reste carré).
 * @param {object} initial - Élément au début du geste.
 * @param {number} dx - Déplacement horizontal.
 * @param {number} dy - Déplacement vertical.
 * @returns {{largeur:number, hauteur:number}} Taille.
 */
function nouvelleTaille(initial, dx, dy) {
  const largeur = Math.max(10, aimanter(initial.largeur + dx));
  const hauteur = Math.max(5, aimanter(initial.hauteur + dy));
  if (initial.type === 'qr') {
    const cote = Math.max(largeur, hauteur);
    return { largeur: cote, hauteur: cote };
  }
  return { largeur, hauteur };
}

/**
 * Ajoute la grille, le cadre de sélection et la poignée par-dessus la face.
 * @param {SVGSVGElement} svg - Face affichée.
 * @param {object} edition - État de l'éditeur.
 */
function dessinerSurcouche(svg, edition) {
  const couche = creerSvg('g', { class: 'Surcouche' }, svg);
  if (edition.grille) {
    for (let x = 50; x < LARGEUR; x += 50) creerSvg('line', { x1: x, y1: 0, x2: x, y2: HAUTEUR, class: x === LARGEUR / 2 ? 'Grille Grille--axe' : 'Grille' }, couche);
    for (let y = 50; y < HAUTEUR; y += 50) creerSvg('line', { x1: 0, y1: y, x2: LARGEUR, y2: y, class: 'Grille' }, couche);
    creerSvg('line', { x1: 0, y1: HAUTEUR / 2, x2: LARGEUR, y2: HAUTEUR / 2, class: 'Grille Grille--axe' }, couche);
  }
  const element = elementSelectionne();
  if (!element) return;
  creerSvg('rect', { x: element.x, y: element.y, width: element.largeur, height: element.hauteur, class: 'Selection' }, couche);
  creerSvg('rect', {
    x: element.x + element.largeur - TAILLE_POIGNEE / 2, y: element.y + element.hauteur - TAILLE_POIGNEE / 2,
    width: TAILLE_POIGNEE, height: TAILLE_POIGNEE, class: 'Poignee', 'data-poignee': 'taille',
  }, couche);
}

/**
 * Raccourcis clavier de la zone d'édition.
 * @param {KeyboardEvent} e - Événement clavier.
 */
function gererClavier(e) {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) retablir(); else annuler();
    return;
  }
  if (ctrl && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    retablir();
    return;
  }
  const element = elementSelectionne();
  if (!element) return;
  const pas = e.shiftKey ? 50 : 10;
  const deplacements = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] };
  if (deplacements[e.key]) {
    e.preventDefault();
    memoriser();
    const [dx, dy] = deplacements[e.key];
    modifierElement(element.id, { x: element.x + dx, y: element.y + dy });
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    supprimerElement(element.id);
  } else if (ctrl && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    dupliquerElement(element.id);
  } else if (e.key === 'Escape') {
    selectionner(null);
  }
}
