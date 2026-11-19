/**
 * Alignement.js
 * Calculs d'alignement des éléments d'une carte : aligner sur la carte
 * ou sur la sélection, centrer un groupe, répartir régulièrement.
 * Fonctions pures : elles renvoient les nouvelles positions sans rien modifier.
 */

/**
 * Zone de la carte entière (référence d'alignement pour un seul élément).
 * @param {{largeur:number, hauteur:number}} dimensions - Dimensions de la carte.
 * @returns {{x:number, y:number, largeur:number, hauteur:number}} Zone.
 */
export function zoneCarte({ largeur, hauteur }) {
  return { x: 0, y: 0, largeur, hauteur };
}

/**
 * Calcule le rectangle qui englobe plusieurs éléments.
 * @param {object[]} elements - Éléments (x, y, largeur, hauteur).
 * @returns {{x:number, y:number, largeur:number, hauteur:number}} Boîte englobante.
 */
export function boiteEnglobante(elements) {
  const x = Math.min(...elements.map((e) => e.x));
  const y = Math.min(...elements.map((e) => e.y));
  const droite = Math.max(...elements.map((e) => e.x + e.largeur));
  const bas = Math.max(...elements.map((e) => e.y + e.hauteur));
  return { x, y, largeur: droite - x, hauteur: bas - y };
}

/**
 * Aligne chaque élément sur une référence (la carte ou la sélection).
 * @param {object[]} elements - Éléments à aligner.
 * @param {"gauche"|"centreH"|"droite"|"haut"|"centreV"|"bas"} mode - Type d'alignement.
 * @param {{x:number, y:number, largeur:number, hauteur:number}} reference - Zone de référence.
 * @returns {{id:string, x:number, y:number}[]} Nouvelles positions.
 */
export function aligner(elements, mode, reference) {
  return elements.map((e) => {
    let { x, y } = e;
    if (mode === 'gauche') x = reference.x;
    if (mode === 'centreH') x = reference.x + (reference.largeur - e.largeur) / 2;
    if (mode === 'droite') x = reference.x + reference.largeur - e.largeur;
    if (mode === 'haut') y = reference.y;
    if (mode === 'centreV') y = reference.y + (reference.hauteur - e.hauteur) / 2;
    if (mode === 'bas') y = reference.y + reference.hauteur - e.hauteur;
    return { id: e.id, x: Math.round(x), y: Math.round(y) };
  });
}

/**
 * Centre la sélection sur la carte en la déplaçant d'un bloc
 * (les positions relatives des éléments sont conservées).
 * @param {object[]} elements - Éléments sélectionnés.
 * @param {"horizontal"|"vertical"} axe - Axe de centrage.
 * @param {{largeur:number, hauteur:number}} dimensions - Dimensions de la carte.
 * @returns {{id:string, x:number, y:number}[]} Nouvelles positions.
 */
export function centrerSurCarte(elements, axe, dimensions) {
  const boite = boiteEnglobante(elements);
  const dx = axe === 'horizontal' ? Math.round((dimensions.largeur - boite.largeur) / 2 - boite.x) : 0;
  const dy = axe === 'vertical' ? Math.round((dimensions.hauteur - boite.hauteur) / 2 - boite.y) : 0;
  return elements.map((e) => ({ id: e.id, x: e.x + dx, y: e.y + dy }));
}

/**
 * Répartit les éléments avec un espace égal entre eux (3 éléments minimum).
 * Le premier et le dernier ne bougent pas.
 * @param {object[]} elements - Éléments sélectionnés.
 * @param {"horizontal"|"vertical"} axe - Axe de répartition.
 * @returns {{id:string, x:number, y:number}[]} Nouvelles positions.
 */
export function repartir(elements, axe) {
  if (elements.length < 3) return elements.map((e) => ({ id: e.id, x: e.x, y: e.y }));
  const [pos, taille] = axe === 'horizontal' ? ['x', 'largeur'] : ['y', 'hauteur'];
  const tries = [...elements].sort((a, b) => a[pos] - b[pos]);
  const premier = tries[0];
  const dernier = tries[tries.length - 1];
  const occupe = tries.reduce((total, e) => total + e[taille], 0);
  const espace = (dernier[pos] + dernier[taille] - premier[pos] - occupe) / (tries.length - 1);
  let curseur = premier[pos];
  return tries.map((e) => {
    const resultat = { id: e.id, x: e.x, y: e.y };
    resultat[pos] = Math.round(curseur);
    curseur += e[taille] + espace;
    return resultat;
  });
}

/**
 * Indique si un élément touche un rectangle (sélection au cadre).
 * @param {object} element - Élément.
 * @param {{x:number, y:number, largeur:number, hauteur:number}} cadre - Rectangle tracé.
 * @returns {boolean} true si l'élément et le cadre se chevauchent.
 */
export function toucheCadre(element, cadre) {
  return element.x < cadre.x + cadre.largeur && element.x + element.largeur > cadre.x
    && element.y < cadre.y + cadre.hauteur && element.y + element.hauteur > cadre.y;
}
