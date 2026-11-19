/**
 * Peintures.js
 * Définitions SVG réutilisables du rendu : dégradés (linéaire et
 * circulaire), filtres (ombre portée, noir et blanc) et motifs de fond.
 * Chaque fonction ajoute sa définition dans <defs> et renvoie « url(#id) ».
 */

import { creerSvg } from '../../Utilitaires/Dom.js';

/**
 * Crée un dégradé couvrant une zone (coordonnées de la carte).
 * @param {SVGElement} defs - Définitions SVG.
 * @param {string} id - Identifiant unique.
 * @param {object} options - { type: "degrade"|"radial", couleur1, couleur2, angle, boite }.
 * @returns {string} Valeur pour fill (« url(#id) »).
 */
export function creerDegrade(defs, id, { type, couleur1, couleur2, angle = 0, boite }) {
  const cx = boite.x + boite.largeur / 2;
  const cy = boite.y + boite.hauteur / 2;
  let degrade;
  if (type === 'radial') {
    degrade = creerSvg('radialGradient', { id, gradientUnits: 'userSpaceOnUse', cx, cy, r: Math.hypot(boite.largeur, boite.hauteur) / 2 }, defs);
  } else {
    // Vecteur du dégradé selon l'angle, à travers toute la zone.
    const a = (angle * Math.PI) / 180;
    const demi = (Math.abs(boite.largeur * Math.cos(a)) + Math.abs(boite.hauteur * Math.sin(a))) / 2;
    degrade = creerSvg('linearGradient', {
      id, gradientUnits: 'userSpaceOnUse',
      x1: cx - Math.cos(a) * demi, y1: cy - Math.sin(a) * demi, x2: cx + Math.cos(a) * demi, y2: cy + Math.sin(a) * demi,
    }, defs);
  }
  creerSvg('stop', { offset: '0', 'stop-color': couleur1 }, degrade);
  creerSvg('stop', { offset: '1', 'stop-color': couleur2 }, degrade);
  return `url(#${id})`;
}

/**
 * Crée un filtre (ombre portée et / ou noir et blanc) si nécessaire.
 * @param {SVGElement} defs - Définitions SVG.
 * @param {string} id - Identifiant unique.
 * @param {object} element - Élément (réglages ombre*, noirEtBlanc).
 * @returns {string|null} Valeur pour l'attribut filter, ou null si aucun effet.
 */
export function creerFiltre(defs, id, element) {
  const gris = element.noirEtBlanc === true;
  if (!element.ombre && !gris) return null;
  const filtre = creerSvg('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%', 'color-interpolation-filters': 'sRGB' }, defs);
  if (gris) creerSvg('feColorMatrix', { type: 'saturate', values: '0', result: 'gris' }, filtre);
  if (element.ombre) {
    creerSvg('feDropShadow', {
      in: gris ? 'gris' : 'SourceGraphic',
      dx: element.ombreX, dy: element.ombreY, stdDeviation: element.ombreFlou / 2,
      'flood-color': element.ombreCouleur, 'flood-opacity': element.ombreOpacite / 100,
    }, filtre);
  }
  return `url(#${id})`;
}

/**
 * Crée le motif décoratif d'un fond.
 * @param {SVGElement} defs - Définitions SVG.
 * @param {string} id - Identifiant unique.
 * @param {object} fond - Réglages du fond (motif, motifCouleur, motifTaille).
 * @returns {string|null} Valeur pour fill, ou null si aucun motif.
 */
export function creerMotif(defs, id, fond) {
  if (fond.motif === 'aucun') return null;
  const t = fond.motifTaille;
  const couleur = fond.motifCouleur;
  const motif = creerSvg('pattern', {
    id, width: t, height: t, patternUnits: 'userSpaceOnUse',
    patternTransform: fond.motif === 'diagonales' ? 'rotate(45)' : undefined,
  }, defs);
  const trait = { fill: 'none', stroke: couleur, 'stroke-width': Math.max(1, t * 0.06) };
  switch (fond.motif) {
    case 'points':
      creerSvg('circle', { cx: t / 2, cy: t / 2, r: Math.max(1, t * 0.09), fill: couleur }, motif);
      break;
    case 'lignes':
    case 'diagonales':
      creerSvg('rect', { width: t, height: Math.max(1, t * 0.08), fill: couleur }, motif);
      break;
    case 'grille':
      creerSvg('path', { d: `M0 0H${t}M0 0V${t}`, ...trait }, motif);
      break;
    case 'cercles':
      creerSvg('circle', { cx: t / 2, cy: t / 2, r: t * 0.32, ...trait }, motif);
      break;
    case 'vagues':
      creerSvg('path', { d: `M0 ${t / 2}Q${t / 4} ${t * 0.2} ${t / 2} ${t / 2}T${t} ${t / 2}`, ...trait }, motif);
      break;
    default:
      return null;
  }
  return `url(#${id})`;
}
