/**
 * ZoneEdition.js
 * Zone centrale de l'éditeur : affiche la face en cours et permet de
 * sélectionner (clic, Ctrl + clic, cadre tracé à la souris), déplacer
 * un ou plusieurs éléments (glisser ou flèches) et redimensionner
 * (poignée, y compris pour un élément tourné). Les éléments verrouillés
 * ne bougent pas. Aimantation au millimètre et aux axes centraux ;
 * repères d'impression (zone de sécurité et fond perdu) en option.
 */

import { creerElement, creerSvg, vider } from '../../Utilitaires/Dom.js';
import { PERSONNE_EXEMPLE } from '../../Metier/Personne.js';
import { genererQrPersonne } from '../../Metier/ContenuQr.js';
import { boiteEnglobante, toucheCadre } from '../../Metier/Alignement.js';
import { trouverPersonne } from '../../Metier/EtatApplication.js';
import { FOND_PERDU, MARGE_SECURITE } from '../../Metier/Formats.js';
import { rendreFaceSvg } from '../Rendu/RenduFaceSvg.js';
import {
  obtenirEdition, abonnerEdition, elementsFace, elementsSelectionnes, elementsDeplacables, elementSelectionne, selectionner,
  selectionnerPlusieurs, modifierElements, memoriser, oublierDernierMemo, dimensions,
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
    // Proportions de la carte (formats paysage, portrait, carré).
    const { largeur, hauteur } = dimensions();
    zone.style.setProperty('--ratio', String(largeur / hauteur));
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
    else if (!geste.initiaux.length) return;
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

  if (poignee && elementSelectionne() && !elementSelectionne().verrouille) {
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
  // Les éléments verrouillés restent sélectionnables mais ne bougent pas.
  const initiaux = elementsDeplacables().map((el) => ({ ...el }));
  if (!initiaux.length) return null;
  memoriser();
  return { type: 'deplacement', depart: point, initiaux, principal: initiaux.find((el) => el.id === id) || initiaux[0], bouge: false };
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
  const { largeur, hauteur } = dimensions();
  let x = aimanter(reference.x + dx);
  let y = aimanter(reference.y + dy);
  if (obtenirEdition().grille) {
    if (Math.abs(x + reference.largeur / 2 - largeur / 2) < AIMANT) x = Math.round(largeur / 2 - reference.largeur / 2);
    if (Math.abs(y + reference.hauteur / 2 - hauteur / 2) < AIMANT) y = Math.round(hauteur / 2 - reference.hauteur / 2);
  }
  const decalageX = x - reference.x;
  const decalageY = y - reference.y;
  return initiaux.map((el) => ({ id: el.id, x: el.x + decalageX, y: el.y + decalageY }));
}

/**
 * Calcule la nouvelle taille (le QR code reste carré). Pour un élément
 * tourné, le déplacement de la souris est ramené dans son propre repère.
 * @param {object} initial - Élément au début du geste.
 * @param {number} dx - Déplacement horizontal.
 * @param {number} dy - Déplacement vertical.
 * @returns {{largeur:number, hauteur:number}} Taille.
 */
function nouvelleTaille(initial, dx, dy) {
  const angle = (-initial.rotation * Math.PI) / 180;
  const dxLocal = dx * Math.cos(angle) - dy * Math.sin(angle);
  const dyLocal = dx * Math.sin(angle) + dy * Math.cos(angle);
  const largeur = Math.max(10, aimanter(initial.largeur + dxLocal));
  const hauteur = Math.max(5, aimanter(initial.hauteur + dyLocal));
  if (initial.type === 'qr' || initial.type === 'icone') {
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
 * Ajoute la grille, les repères d'impression, les cadres de sélection et
 * la poignée par-dessus la face (les cadres suivent la rotation).
 * @param {SVGSVGElement} svg - Face affichée.
 * @param {object} edition - État de l'éditeur.
 */
function dessinerSurcouche(svg, edition) {
  const { largeur, hauteur } = dimensions();
  const couche = creerSvg('g', { class: 'Surcouche' }, svg);
  if (edition.grille) {
    for (let x = 50; x < largeur; x += 50) creerSvg('line', { x1: x, y1: 0, x2: x, y2: hauteur, class: 'Grille' }, couche);
    for (let y = 50; y < hauteur; y += 50) creerSvg('line', { x1: 0, y1: y, x2: largeur, y2: y, class: 'Grille' }, couche);
    creerSvg('line', { x1: largeur / 2, y1: 0, x2: largeur / 2, y2: hauteur, class: 'Grille Grille--axe' }, couche);
    creerSvg('line', { x1: 0, y1: hauteur / 2, x2: largeur, y2: hauteur / 2, class: 'Grille Grille--axe' }, couche);
  }
  if (edition.reperes) {
    creerSvg('rect', { x: MARGE_SECURITE, y: MARGE_SECURITE, width: largeur - 2 * MARGE_SECURITE, height: hauteur - 2 * MARGE_SECURITE, class: 'Repere Repere--securite' }, couche);
    creerSvg('rect', { x: -FOND_PERDU, y: -FOND_PERDU, width: largeur + 2 * FOND_PERDU, height: hauteur + 2 * FOND_PERDU, class: 'Repere Repere--perdu' }, couche);
  }
  const selection = elementsSelectionnes();
  selection.forEach((el) => {
    const cadre = creerSvg('g', { transform: el.rotation ? `rotate(${el.rotation} ${el.x + el.largeur / 2} ${el.y + el.hauteur / 2})` : undefined }, couche);
    creerSvg('rect', { x: el.x, y: el.y, width: el.largeur, height: el.hauteur, class: el.verrouille ? 'Selection Selection--verrouille' : 'Selection' }, cadre);
    if (selection.length === 1 && !el.verrouille) {
      creerSvg('rect', {
        x: el.x + el.largeur - TAILLE_POIGNEE / 2, y: el.y + el.hauteur - TAILLE_POIGNEE / 2,
        width: TAILLE_POIGNEE, height: TAILLE_POIGNEE, class: 'Poignee', 'data-poignee': 'taille',
      }, cadre);
    }
  });
  if (selection.length > 1) {
    const boite = boiteEnglobante(selection);
    creerSvg('rect', { x: boite.x - 6, y: boite.y - 6, width: boite.largeur + 12, height: boite.hauteur + 12, class: 'Selection Selection--groupe' }, couche);
  }
}
