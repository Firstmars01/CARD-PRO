/**
 * MesureTexte.js
 * Mesure la largeur d'un texte avec un canvas pour le découper en lignes
 * et couper proprement (avec « … ») ce qui dépasse de sa zone sur la carte.
 */

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
  const lignes = [];
  let deborde = false;

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
  if (lignes.length > lignesMax) {
    deborde = true;
    lignes.length = lignesMax;
  }
  // Chaque ligne trop large (mot très long) est coupée ; la dernière reçoit « … » si besoin.
  return lignes.map((ligne, i) => {
    const derniere = i === lignes.length - 1;
    return couperAvecPoints(derniere && deborde ? `${ligne}…` : ligne, largeurMax, mesurer);
  });
}
