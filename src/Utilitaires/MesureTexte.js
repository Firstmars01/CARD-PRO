/**
 * MesureTexte.js
 * Mesure la largeur d'un texte avec un canvas pour le découper en lignes.
 * Un texte trop long pour sa zone est d'abord rétréci (jusqu'à la moitié de
 * sa taille), puis coupé proprement avec « … » en dernier recours.
 * Les polices étant intégrées à l'appli, le résultat est le même partout.
 */

// Rétrécissement : pas de 4 % par essai, jusqu'à 50 % de la taille choisie.
const PAS_REDUCTION = 0.96;
const REDUCTION_MAX = 0.5;

let contexte = null;

/**
 * Renvoie un contexte 2D réutilisable pour mesurer le texte.
 * @returns {CanvasRenderingContext2D|null} Contexte (null hors navigateur).
 */
function obtenirContexte() {
  if (!contexte && typeof document !== 'undefined') {
    contexte = document.createElement('canvas').getContext('2d');
  }
  return contexte;
}

/**
 * Crée une fonction de mesure pour un style de texte donné.
 * @param {object} style - { taille, police, graisse, italique, espacement }.
 * @returns {(texte:string) => number} Fonction renvoyant la largeur d'un texte.
 */
function creerMesure({ taille, police, graisse = 400, italique = false, espacement = 0 }) {
  const ctx = obtenirContexte();
  if (!ctx) return (texte) => texte.length * taille * 0.55;
  const font = `${italique ? 'italic ' : ''}${graisse} ${taille}px ${police}`;
  return (texte) => {
    ctx.font = font;
    return ctx.measureText(texte).width + espacement * texte.length;
  };
}

/**
 * Coupe un texte avec « … » pour qu'il tienne dans une largeur.
 * @param {string} texte - Texte.
 * @param {number} largeurMax - Largeur disponible.
 * @param {Function} mesurer - Fonction de mesure.
 * @returns {string} Texte ajusté.
 */
function couperAvecPoints(texte, largeurMax, mesurer) {
  if (mesurer(texte) <= largeurMax) return texte;
  let fin = texte.length;
  while (fin > 0 && mesurer(`${texte.slice(0, fin)}…`) > largeurMax) fin--;
  return fin > 0 ? `${texte.slice(0, fin).trimEnd()}…` : '';
}

/**
 * Découpe un texte en lignes (retour à la ligne aux espaces et aux \n),
 * sans limite de nombre de lignes ni coupure.
 * @param {string} texte - Texte complet.
 * @param {number} largeurMax - Largeur de la zone.
 * @param {Function} mesurer - Fonction de mesure.
 * @returns {string[]} Lignes.
 */
function couperEnLignes(texte, largeurMax, mesurer) {
  const lignes = [];
  for (const paragraphe of String(texte).split('\n')) {
    let courante = '';
    for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (mesurer(essai) <= largeurMax || !courante) {
        courante = essai;
      } else {
        lignes.push(courante);
        courante = mot;
      }
    }
    lignes.push(courante);
  }
  return lignes;
}

/**
 * Découpe un texte en lignes (retour à la ligne aux espaces et aux \n).
 * La dernière ligne est terminée par « … » si le texte ne tient pas.
 * @param {string} texte - Texte complet.
 * @param {number} largeurMax - Largeur de la zone.
 * @param {number} lignesMax - Nombre de lignes maximum.
 * @param {object} style - { taille, police, graisse, italique, espacement }.
 * @returns {string[]} Lignes à afficher.
 */
export function decouperTexte(texte, largeurMax, lignesMax, style) {
  const mesurer = creerMesure(style);
  const lignes = couperEnLignes(texte, largeurMax, mesurer);
  const deborde = lignes.length > lignesMax;
  if (deborde) lignes.length = lignesMax;
  // Chaque ligne trop large (mot très long) est coupée ; la dernière reçoit « … » si besoin.
  return lignes.map((ligne, i) => {
    const derniere = i === lignes.length - 1;
    return couperAvecPoints(derniere && deborde ? `${ligne}…` : ligne, largeurMax, mesurer);
  });
}

/**
 * Nombre de lignes qui tiennent dans une hauteur.
 * @param {number} hauteur - Hauteur de la zone.
 * @param {number} taille - Taille du texte.
 * @param {number} interligne - Interligne en % de la taille.
 * @returns {number} Lignes possibles (au moins 1).
 */
export function lignesPossibles(hauteur, taille, interligne) {
  const pas = (taille * interligne) / 100;
  return Math.max(1, Math.floor((hauteur - taille) / pas) + 1);
}

/**
 * Ajuste un texte à sa zone : retour à la ligne, puis rétrécissement si le
 * texte ne tient toujours pas, puis « … » si même rétréci il dépasse.
 * Le nombre de lignes reste celui prévu à la taille choisie : un nom prévu
 * sur une ligne reste sur une ligne (le design ne change pas).
 * @param {string} texte - Texte complet.
 * @param {{largeur:number, hauteur:number}} zone - Taille de la zone.
 * @param {object} style - { taille, police, graisse, italique, espacement, interligne }.
 * @returns {{lignes:string[], taille:number}} Lignes et taille finale du texte.
 */
export function ajusterTexte(texte, zone, style) {
  const tailleMin = style.taille * REDUCTION_MAX;
  const lignesMax = lignesPossibles(zone.hauteur, style.taille, style.interligne);
  for (let taille = style.taille; taille >= tailleMin; taille *= PAS_REDUCTION) {
    const mesurer = creerMesure({ ...style, taille });
    const lignes = couperEnLignes(texte, zone.largeur, mesurer);
    const tient = lignes.length <= lignesMax
      && lignes.every((ligne) => mesurer(ligne) <= zone.largeur);
    if (tient) return { lignes, taille };
  }
  return { lignes: decouperTexte(texte, zone.largeur, lignesMax, { ...style, taille: tailleMin }), taille: tailleMin };
}
