/**
 * Icones.js
 * Petites icônes vectorielles (tracés SVG) utilisées dans les boutons du
 * Configurateur et du portefeuille (pas d'emoji : rendu identique partout).
 * Elles prennent la couleur du texte du bouton (currentColor).
 */

import { creerSvg } from '../Utilitaires/Dom.js';

// Tracés en 24 × 24.
const TRACES = {
  information: 'M3 5h18v14H3z M7 10a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M5.5 16c.7-2 2-3 3.5-3s2.8 1 3.5 3 M14 9h5 M14 13h4',
  texte: 'M5 7V4h14v3 M12 4v16 M9 20h6',
  qr: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M18 18h3v3h-3z',
  image: 'M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M14 9.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  forme: 'M3 11h8v8H3z M13 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  annuler: 'M9 13L4 8l5-5 M4 8h10a6 6 0 0 1 0 12h-3',
  retablir: 'M15 13l5-5-5-5 M20 8H10a6 6 0 0 0 0 12h3',
  copier: 'M9 9h11v11H9z M15 9V4H4v11h5',
  coller: 'M9 3h6v3H9z M7 5H4v16h16V5h-3',
  dupliquer: 'M9 9h11v11H9z M15 9V4H4v11h5 M14.5 12v5 M12 14.5h5',
  supprimer: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  copierStyle: 'M4 4h12v5H4z M16 6h3v5h-8v3 M10 14h2v7h-2z',
  collerStyle: 'M4 4h12v5H4z M16 6h3v5h-8v3 M10 14h2v7h-2z M17 17l2 2 3-4',
  gauche: 'M4 3v18 M8 7h11v4H8z M8 14h6v4H8z',
  centreH: 'M12 3v18 M6 7h12v4H6z M8 14h8v4H8z',
  droite: 'M20 3v18 M5 7h11v4H5z M10 14h6v4h-6z',
  haut: 'M3 4h18 M7 8h4v11H7z M14 8h4v6h-4z',
  centreV: 'M3 12h18 M7 6h4v12H7z M14 8h4v8h-4z',
  bas: 'M3 20h18 M7 5h4v11H7z M14 10h4v6h-4z',
  centrerCarteH: 'M2 5h20v14H2z M12 5v14 M8 10h8v4H8z',
  centrerCarteV: 'M2 5h20v14H2z M2 12h20 M10 8h4v8h-4z',
  repartirH: 'M3 4v16 M21 4v16 M7 9h3v6H7z M14 9h3v6h-3z',
  repartirV: 'M4 3h16 M4 21h16 M9 7h6v3H9z M9 14h6v3H9z',
  autreFace: 'M4 8h13l-3-3 M20 16H7l3 3',
  icone: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  grouper: 'M3 3h8v8H3z M13 13h8v8h-8z M11 7h6v6 M7 11v6h6',
  degrouper: 'M3 3h8v8H3z M13 13h8v8h-8z',
  cadenas: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4',
  etoile: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  personne: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7',
  coche: 'M4 12l5 5L20 6',
  crayon: 'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',
  retour: 'M10 6l-6 6 6 6 M4 12h16',
  fermer: 'M6 6l12 12 M18 6L6 18',
  sauvegarder: 'M12 3v12 M7 10l5 5 5-5 M4 17v3h16v-3',
  importer: 'M12 15V3 M7 8l5-5 5 5 M4 17v3h16v-3',
  ajouter: 'M12 5v14 M5 12h14',
  scanner: 'M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M7 12h10',
  monter: 'M12 19V5 M6 11l6-6 6 6',
  descendre: 'M12 5v14 M6 13l6 6 6-6',
  oeil: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  oeilBarre: 'M2 12s3.5-7 10-7c2 0 3.7.7 5.1 1.6 M22 12s-3.5 7-10 7c-2 0-3.7-.7-5.1-1.6 M3 3l18 18',
  cadenasOuvert: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 7.5-2',
  soleil: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  lune: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  rond: 'M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12',
};

/**
 * Crée une icône.
 * @param {string} nom - Nom de l'icône (clé de TRACES).
 * @param {boolean} [pleine=false] - Remplie (ex. étoile d'un favori).
 * @returns {SVGSVGElement} Icône de 18 px.
 */
export function icone(nom, pleine = false) {
  const svg = creerSvg('svg', {
    viewBox: '0 0 24 24', width: 18, height: 18, fill: pleine ? 'currentColor' : 'none', stroke: 'currentColor',
    'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'Icone',
  });
  creerSvg('path', { d: TRACES[nom] }, svg);
  return svg;
}
