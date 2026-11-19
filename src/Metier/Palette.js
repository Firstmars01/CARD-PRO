/**
 * Palette.js
 * Palette de couleurs d'un modèle : remplacement d'une couleur partout
 * dans le modèle, et calcul des couleurs les plus utilisées (palette
 * proposée par défaut aux modèles de base).
 */

export const TAILLE_PALETTE = 5;
const COULEUR = /^#[0-9a-f]{6}$/;

/**
 * Parcourt toutes les couleurs d'un modèle (fonds et éléments).
 * @param {object} modele - Modèle.
 * @param {(objet:object, cle:string) => void} visiteur - Appelé pour chaque valeur de couleur.
 */
function parcourirCouleurs(modele, visiteur) {
  ['recto', 'verso'].forEach((cote) => {
    const face = modele[cote];
    if (!face) return;
    [face.fond, ...face.elements].forEach((objet) => {
      Object.keys(objet).forEach((cle) => {
        if (typeof objet[cle] === 'string' && COULEUR.test(objet[cle])) visiteur(objet, cle);
      });
    });
  });
}

/**
 * Remplace une couleur par une autre dans tout le modèle (modifie le modèle).
 * @param {object} modele - Modèle à modifier.
 * @param {string} ancienne - Couleur à remplacer (#rrggbb).
 * @param {string} nouvelle - Nouvelle couleur (#rrggbb).
 * @returns {number} Nombre de valeurs remplacées.
 */
export function remplacerCouleur(modele, ancienne, nouvelle) {
  let nombre = 0;
  if (!COULEUR.test(ancienne) || !COULEUR.test(nouvelle) || ancienne === nouvelle) return 0;
  parcourirCouleurs(modele, (objet, cle) => {
    if (objet[cle] === ancienne) {
      objet[cle] = nouvelle;
      nombre += 1;
    }
  });
  return nombre;
}

/**
 * Liste les couleurs réellement visibles d'un fond ou d'un élément
 * (une couleur d'ombre désactivée, par exemple, n'est pas comptée).
 * @param {object} o - Fond ou élément.
 * @returns {string[]} Couleurs utilisées.
 */
function couleursVisibles(o) {
  const degrade = (type) => type === 'degrade' || type === 'radial';
  const liste = [];
  if (Object.hasOwn(o, 'couleur1')) {
    // Fond d'une face.
    liste.push(o.couleur1);
    if (degrade(o.type)) liste.push(o.couleur2);
    if (o.motif && o.motif !== 'aucun') liste.push(o.motifCouleur);
    if (o.voileOpacite > 0) liste.push(o.voileCouleur);
  } else if (o.type === 'texte') {
    liste.push(o.couleur);
    if (o.typeCouleur === 'degrade') liste.push(o.couleur2);
    if (o.epaisseurContourTexte > 0) liste.push(o.contourTexte);
    if (o.fondTexte) liste.push(o.fondCouleur);
  } else if (o.type === 'forme') {
    if (o.forme === 'ligne' || o.epaisseurContour > 0) liste.push(o.contour);
    if (o.forme !== 'ligne' && o.typeRemplissage !== 'aucun') liste.push(o.remplissage);
    if (degrade(o.typeRemplissage)) liste.push(o.remplissage2);
  } else if (o.type === 'qr') {
    liste.push(o.couleur, o.couleurYeux, o.fond);
  } else if (o.type === 'icone') {
    liste.push(o.couleur);
  } else if (o.type === 'image' && o.bordure > 0) {
    liste.push(o.bordureCouleur);
  }
  if (o.ombre) liste.push(o.ombreCouleur);
  return liste.filter((c) => typeof c === 'string' && COULEUR.test(c));
}

/**
 * Renvoie les couleurs les plus utilisées d'un modèle.
 * @param {object} modele - Modèle.
 * @returns {string[]} Couleurs (au plus TAILLE_PALETTE), de la plus fréquente à la moins fréquente.
 */
export function couleursPrincipales(modele) {
  const compteur = new Map();
  ['recto', 'verso'].forEach((cote) => {
    const face = modele[cote];
    if (!face) return;
    [face.fond, ...face.elements].flatMap(couleursVisibles).forEach((c) => compteur.set(c, (compteur.get(c) || 0) + 1));
  });
  return [...compteur.entries()].sort((a, b) => b[1] - a[1]).slice(0, TAILLE_PALETTE).map(([c]) => c);
}
