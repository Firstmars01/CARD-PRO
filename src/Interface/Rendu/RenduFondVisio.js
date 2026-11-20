/**
 * RenduFondVisio.js
 * Fond d'écran Teams / Zoom (1920 × 1080) aux couleurs de la carte : logo,
 * nom, poste et entreprise en haut à gauche, QR « contact » en bas à
 * gauche. Le centre et la droite restent libres pour la personne filmée.
 */

import { creerSvg } from '../../Utilitaires/Dom.js';
import { svgVersImage } from '../../Utilitaires/ExportImages.js';
import { ajusterTexte } from '../../Utilitaires/MesureTexte.js';
import { familleCss } from '../../Metier/Polices.js';
import { nomComplet } from '../../Metier/Personne.js';
import { genererQrPersonne } from '../../Metier/ContenuQr.js';
import { couleurAccent, logoCarte, couleurTexteSur } from '../../Metier/IdentiteVisuelle.js';
import { dessinerQr } from './RenduQrSvg.js';

export const LARGEUR_VISIO = 1920;
export const HAUTEUR_VISIO = 1080;
const MARGE = 120;
const LARGEUR_TEXTE = 760; // Les textes restent dans le tiers gauche.

/**
 * Dessine le fond (couleur, dégradé ou image du recto, avec voile sur une image).
 * @param {SVGSVGElement} svg - SVG.
 * @param {object} fond - Fond du recto du modèle.
 * @returns {string} Couleur de référence pour choisir la couleur du texte.
 */
function dessinerFond(svg, fond) {
  const plein = { width: LARGEUR_VISIO, height: HAUTEUR_VISIO };
  if (fond.type === 'image' && fond.image) {
    creerSvg('image', { ...plein, href: fond.image, preserveAspectRatio: 'xMidYMid slice' }, svg);
    creerSvg('rect', { ...plein, fill: '#000000', opacity: 0.45 }, svg);
    return '#000000';
  }
  if (fond.type === 'degrade' || fond.type === 'radial') {
    const defs = creerSvg('defs', {}, svg);
    const degrade = creerSvg('linearGradient', { id: 'fond-visio', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    creerSvg('stop', { offset: 0, 'stop-color': fond.couleur1 }, degrade);
    creerSvg('stop', { offset: 1, 'stop-color': fond.couleur2 }, degrade);
    creerSvg('rect', { ...plein, fill: 'url(#fond-visio)' }, svg);
    return fond.couleur1;
  }
  creerSvg('rect', { ...plein, fill: fond.couleur1 }, svg);
  return fond.couleur1;
}

/**
 * Écrit une ligne de texte, rétrécie si elle dépasse la largeur prévue.
 * @param {SVGSVGElement} svg - SVG.
 * @param {string} texte - Texte.
 * @param {{y:number, taille:number, police:string, graisse:string, couleur:string, opacite?:number}} style - Style.
 */
function ecrire(svg, texte, style) {
  if (!texte) return;
  const { taille } = ajusterTexte(texte, { largeur: LARGEUR_TEXTE, hauteur: style.taille }, {
    taille: style.taille, police: style.police, graisse: style.graisse, italique: false, espacement: 0, interligne: 120,
  });
  creerSvg('text', {
    x: MARGE, y: style.y, 'font-family': style.police, 'font-size': taille, 'font-weight': style.graisse,
    fill: style.couleur, opacity: style.opacite ?? 1,
  }, svg).textContent = texte;
}

/**
 * Crée le SVG du fond Teams / Zoom d'une carte.
 * @param {{personne:object, modele:object}} carte - Carte préparée (infos d'entreprise appliquées).
 * @returns {SVGSVGElement} Fond 1920 × 1080.
 */
export function creerFondVisioSvg({ personne, modele }) {
  const svg = creerSvg('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${LARGEUR_VISIO} ${HAUTEUR_VISIO}`, width: LARGEUR_VISIO, height: HAUTEUR_VISIO });
  const couleurTexte = couleurTexteSur(dessinerFond(svg, modele.recto.fond));
  const elementNom = modele.recto.elements.find((e) => e.type === 'texte' && e.champ === 'nomComplet');
  const police = familleCss(elementNom?.police);

  // Logo, puis nom, trait d'accent, poste et entreprise.
  const logo = logoCarte(modele);
  if (logo) creerSvg('image', { x: MARGE, y: 100, width: 360, height: 140, href: logo, preserveAspectRatio: 'xMinYMin meet' }, svg);
  const haut = logo ? 340 : 200;
  ecrire(svg, nomComplet(personne), { y: haut, taille: 76, police, graisse: '700', couleur: couleurTexte });
  creerSvg('rect', { x: MARGE, y: haut + 30, width: 120, height: 8, rx: 4, fill: couleurAccent(modele) }, svg);
  ecrire(svg, personne.poste, { y: haut + 100, taille: 42, police, graisse: '600', couleur: couleurTexte, opacite: 0.9 });
  ecrire(svg, personne.entreprise, { y: haut + 155, taille: 36, police, graisse: '400', couleur: couleurTexte, opacite: 0.75 });

  // QR « contact » dans un cadre blanc, avec une invitation à le scanner.
  const { qr } = genererQrPersonne(personne);
  if (qr) {
    const taille = 280;
    const y = HAUTEUR_VISIO - MARGE - taille;
    dessinerQr(svg, qr, { x: MARGE, y, taille, couleur: '#000000', fond: '#ffffff', marge: 2, arrondi: 20 });
    const x = MARGE + taille + 40;
    const texte = (contenu, dy, tailleTexte, opacite) => {
      if (!contenu) return;
      creerSvg('text', { x, y: y + dy, 'font-family': police, 'font-size': tailleTexte, fill: couleurTexte, opacity: opacite }, svg).textContent = contenu;
    };
    texte('Scannez pour enregistrer', 110, 32, 0.95);
    texte('mon contact', 152, 32, 0.95);
    texte(personne.email, 215, 26, 0.75);
    texte(personne.telephoneMobile || personne.telephonePro, 255, 26, 0.75);
  }
  return svg;
}

/**
 * Fond Teams / Zoom en PNG.
 * @param {{personne:object, modele:object}} carte - Carte préparée.
 * @returns {Promise<Blob>} Image PNG 1920 × 1080.
 */
export function fichierFondVisio(carte) {
  return svgVersImage(creerFondVisioSvg(carte), LARGEUR_VISIO, HAUTEUR_VISIO, 'image/png');
}
