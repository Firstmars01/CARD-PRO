/**
 * Formats.js
 * Formats de carte disponibles (en dixièmes de millimètre) et calcul des
 * dimensions d'un modèle selon son format et son orientation.
 */

// Format : [libellé, largeur, hauteur] en paysage, unités de 0,1 mm.
export const FORMATS = {
  standard: ['85 × 55 mm (standard France)', 850, 550],
  iso: ['85 × 54 mm (format carte bancaire)', 856, 540],
  us: ['89 × 51 mm (format US)', 889, 508],
  long: ['90 × 50 mm', 900, 500],
  carre: ['65 × 65 mm (carré)', 650, 650],
};

export const OPTIONS_FORMATS = Object.entries(FORMATS).map(([cle, [libelle]]) => [cle, libelle]);
export const FOND_PERDU = 30; // 3 mm de chaque côté pour l'imprimeur
export const MARGE_SECURITE = 30; // 3 mm à l'intérieur du bord de coupe

/**
 * Renvoie les dimensions d'un modèle (format + orientation).
 * @param {{format?:string, orientation?:string}} modele - Modèle.
 * @returns {{largeur:number, hauteur:number}} Dimensions en dixièmes de mm.
 */
export function dimensionsModele(modele) {
  const [, largeur, hauteur] = FORMATS[modele?.format] || FORMATS.standard;
  return modele?.orientation === 'portrait' ? { largeur: hauteur, hauteur: largeur } : { largeur, hauteur };
}

/**
 * Convertit des dimensions en pixels pour une résolution donnée.
 * @param {{largeur:number, hauteur:number}} dimensions - Dimensions en dixièmes de mm.
 * @param {number} [dpi=300] - Résolution (points par pouce).
 * @returns {{largeur:number, hauteur:number}} Dimensions en pixels.
 */
export function enPixels({ largeur, hauteur }, dpi = 300) {
  const facteur = dpi / 254;
  return { largeur: Math.round(largeur * facteur), hauteur: Math.round(hauteur * facteur) };
}

/**
 * Replace les éléments quand le format ou l'orientation change : les
 * centres sont déplacés proportionnellement et les tailles réduites ou
 * agrandies du même facteur (sans déformation).
 * @param {object[]} elements - Éléments d'une face.
 * @param {{largeur:number, hauteur:number}} anciennes - Anciennes dimensions.
 * @param {{largeur:number, hauteur:number}} nouvelles - Nouvelles dimensions.
 * @returns {object[]} Nouveaux éléments (non validés).
 */
export function adapterElements(elements, anciennes, nouvelles) {
  const rx = nouvelles.largeur / anciennes.largeur;
  const ry = nouvelles.hauteur / anciennes.hauteur;
  // Même facteur sur les deux axes (la plus petite) : la disposition tient
  // dans la nouvelle carte sans chevauchement ni déformation.
  const echelle = Math.min(rx, ry);
  return elements.map((e) => {
    const largeur = Math.round(e.largeur * echelle);
    const hauteur = Math.round(e.hauteur * echelle);
    const adapte = {
      ...e,
      largeur,
      hauteur,
      x: Math.round((e.x + e.largeur / 2) * rx - largeur / 2),
      y: Math.round((e.y + e.hauteur / 2) * ry - hauteur / 2),
    };
    if (typeof e.taille === 'number') adapte.taille = Math.round(e.taille * echelle);
    return adapte;
  });
}
