/**
 * ZoneEdition.js
 * Zone centrale de l'éditeur : affiche la face en cours et permet de
 * sélectionner (clic, Ctrl + clic, cadre tracé à la souris), déplacer
 * un ou plusieurs éléments (glisser ou flèches) et redimensionner
 * (poignée). Aimantation au millimètre et aux axes centraux.
 */

import { creerElement, creerSvg, vider } from '../../Utilitaires/Dom.js';
import { PERSONNE_EXEMPLE } from '../../Metier/Personne.js';
import { genererQrPersonne } from '../../Metier/ContenuQr.js';
import { boiteEnglobante, toucheCadre } from '../../Metier/Alignement.js';
import { trouverPersonne } from '../../Metier/EtatApplication.js';
import { rendreFaceSvg, LARGEUR, HAUTEUR } from '../Rendu/RenduFaceSvg.js';
import {
  obtenirEdition, abonnerEdition, elementsFace, elementsSelectionnes, elementSelectionne, selectionner, selectionnerPlusieurs,
  modifierElements, memoriser, oublierDernierMemo,
} from './EtatEdition.js';
import { gererRaccourci } from './Raccourcis.js';

const PAS_GRILLE = 10; // 1 mm
const AIMANT = 8; // distance d'aimantation aux axes (0,8 mm)
const TAILLE_POIGNEE = 22;

/**
 * Monte la zone d'édition.
 * @param {HTMLElement} conteneur - Zone d'accueil.
 */
export function monterZoneEdition(conteneur) {
  const zone = creerElement('div', {
    classe: 'ZoneEdition',
    attributs: { tabindex: 0, 'aria-label': "Zone d'édition de la carte. Ctrl + clic pour sélectionner plusieurs éléments, flèches pour les déplacer." },
  });
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
  abonnerEdition(() => {
    if (!rafEnAttente) {
      rafEnAttente = true;
      requestAnimationFrame(dessiner);
    }
  });

  zone.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const svg = zone.querySelector('svg');
    if (!svg) return;
    zone.focus({ preventScroll: true });
    geste = commencerGeste(e, versSvg(svg, e));
    if (geste) {
      zone.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  zone.addEventListener('pointermove', (e) => {
    if (!geste) return;
    const svg = zone.querySelector('svg');
    const point = versSvg(svg, e);
    const dx = point.x - geste.depart.x;
    const dy = point.y - geste.depart.y;
    if (!geste.bouge && Math.hypot(dx, dy) < 2) return;
    geste.bouge = true;
    if (geste.type === 'cadre') dessinerCadre(svg, geste.depart, point);
    else if (geste.type === 'taille') modifierElements([{ id: geste.initiaux[0].id, ...nouvelleTaille(geste.initiaux[0], dx, dy) }]);
    else modifierElements(nouvellesPositions(geste.initiaux, geste.principal, dx, dy));
  });

  const terminer = (e) => {
    if (!geste) return;
    if (geste.type === 'cadre') {
      if (geste.bouge) {
        const cadre = rectangle(geste.depart, versSvg(zone.querySelector('svg'), e));
        selectionnerPlusieurs(elementsFace().filter((el) => toucheCadre(el, cadre)).map((el) => el.id), geste.ajouter);
      } else if (!geste.ajouter) {
        selectionner(null);
      }
    } else if (!geste.bouge) {
      oublierDernierMemo();
    }
    geste = null;
  };
  zone.addEventListener('pointerup', terminer);
  zone.addEventListener('pointercancel', terminer);

  // Raccourcis clavier actifs quand l'onglet est affiché, hors champs de saisie.
  document.addEventListener('keydown', (e) => {
    const champ = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if (!champ && zone.offsetParent !== null) gererRaccourci(e);
  });
  dessiner();
}

/**
 * Démarre un geste selon l'endroit cliqué : poignée (taille),
 * élément (déplacement, Ctrl = ajout à la sélection) ou vide (cadre).
 * @param {PointerEvent} e - Événement.
 * @param {{x:number, y:number}} point - Point en unités de la carte.
 * @returns {object|null} Geste en cours.
 */
function commencerGeste(e, point) {
  const ajouter = e.ctrlKey || e.metaKey || e.shiftKey;
  const poignee = e.target.closest('[data-poignee]');
  const groupe = e.target.closest('[data-id]');

  if (poignee && elementSelectionne()) {
    memoriser();
    return { type: 'taille', depart: point, initiaux: [{ ...elementSelectionne() }], bouge: false };
  }
  if (!groupe) return { type: 'cadre', depart: point, ajouter, bouge: false };

  const id = groupe.getAttribute('data-id');
  const dejaSelectionne = obtenirEdition().selectionIds.includes(id);
  if (ajouter) {
    selectionner(id, true);
    if (dejaSelectionne) return null; // Ctrl + clic sur un élément sélectionné : on le retire.
  } else if (!dejaSelectionne) {
    selectionner(id);
  }
  memoriser();
  const initiaux = elementsSelectionnes().map((el) => ({ ...el }));
  return { type: 'deplacement', depart: point, initiaux, principal: initiaux.find((el) => el.id === id), bouge: false };
}

/**
 * Convertit la position du pointeur en coordonnées de la carte.
 * @param {SVGSVGElement} svg - Face affichée.
 * @param {PointerEvent} e - Événement.
 * @returns {{x:number, y:number}} Point en unités de la carte.
 */
function versSvg(svg, e) {
  return new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
}

/**
 * Construit un rectangle à partir de deux coins.
 * @param {{x:number, y:number}} a - Premier coin.
 * @param {{x:number, y:number}} b - Coin opposé.
 * @returns {{x:number, y:number, largeur:number, hauteur:number}} Rectangle.
 */
function rectangle(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), largeur: Math.abs(a.x - b.x), hauteur: Math.abs(a.y - b.y) };
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
 * Calcule les nouvelles positions d'un groupe déplacé : l'élément saisi
 * est aimanté (grille, axes centraux) et les autres suivent du même décalage.
 * @param {object[]} initiaux - Éléments au début du geste.
 * @param {object} principal - Élément saisi à la souris.
 * @param {number} dx - Déplacement horizontal.
 * @param {number} dy - Déplacement vertical.
 * @returns {{id:string, x:number, y:number}[]} Positions.
 */
function nouvellesPositions(initiaux, principal, dx, dy) {
  const reference = initiaux.length > 1 ? boiteEnglobante(initiaux) : principal;
  let x = aimanter(reference.x + dx);
  let y = aimanter(reference.y + dy);
  if (obtenirEdition().grille) {
    if (Math.abs(x + reference.largeur / 2 - LARGEUR / 2) < AIMANT) x = Math.round(LARGEUR / 2 - reference.largeur / 2);
    if (Math.abs(y + reference.hauteur / 2 - HAUTEUR / 2) < AIMANT) y = Math.round(HAUTEUR / 2 - reference.hauteur / 2);
  }
  const decalageX = x - reference.x;
  const decalageY = y - reference.y;
  return initiaux.map((el) => ({ id: el.id, x: el.x + decalageX, y: el.y + decalageY }));
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
 * Affiche (ou met à jour) le cadre de sélection tracé à la souris.
 * @param {SVGSVGElement} svg - Face affichée.
 * @param {{x:number, y:number}} depart - Point de départ.
 * @param {{x:number, y:number}} point - Point actuel.
 */
function dessinerCadre(svg, depart, point) {
  const r = rectangle(depart, point);
  let cadre = svg.querySelector('.CadreSelection');
  if (!cadre) cadre = creerSvg('rect', { class: 'CadreSelection' }, svg.querySelector('.Surcouche'));
  cadre.setAttribute('x', r.x);
  cadre.setAttribute('y', r.y);
  cadre.setAttribute('width', r.largeur);
  cadre.setAttribute('height', r.hauteur);
}

/**
 * Ajoute la grille, les cadres de sélection et la poignée par-dessus la face.
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
  const selection = elementsSelectionnes();
  selection.forEach((el) => creerSvg('rect', { x: el.x, y: el.y, width: el.largeur, height: el.hauteur, class: 'Selection' }, couche));
  if (selection.length > 1) {
    const boite = boiteEnglobante(selection);
    creerSvg('rect', { x: boite.x - 6, y: boite.y - 6, width: boite.largeur + 12, height: boite.hauteur + 12, class: 'Selection Selection--groupe' }, couche);
  }
  if (selection.length === 1) {
    const [el] = selection;
    creerSvg('rect', {
      x: el.x + el.largeur - TAILLE_POIGNEE / 2, y: el.y + el.hauteur - TAILLE_POIGNEE / 2,
      width: TAILLE_POIGNEE, height: TAILLE_POIGNEE, class: 'Poignee', 'data-poignee': 'taille',
    }, couche);
  }
}
