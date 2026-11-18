/**
 * Dom.js
 * Petites fonctions pour créer des éléments HTML et SVG de façon sûre.
 * Le texte est toujours inséré avec textContent (jamais innerHTML),
 * ce qui empêche toute injection de code (XSS).
 */

const ESPACE_SVG = 'http://www.w3.org/2000/svg';

/**
 * Crée un élément HTML.
 * @param {string} balise - Nom de la balise.
 * @param {object} [options] - { classe, texte, attributs, surClic }.
 * @param {Node[]} [enfants] - Éléments enfants à ajouter.
 * @returns {HTMLElement} Élément créé.
 */
export function creerElement(balise, options = {}, enfants = []) {
  const element = document.createElement(balise);
  if (options.classe) element.className = options.classe;
  if (options.texte !== undefined) element.textContent = String(options.texte);
  Object.entries(options.attributs || {}).forEach(([nom, valeur]) => {
    if (valeur !== undefined && valeur !== null && valeur !== false) element.setAttribute(nom, String(valeur));
  });
  if (options.surClic) element.addEventListener('click', options.surClic);
  enfants.filter(Boolean).forEach((enfant) => element.append(enfant));
  return element;
}

/**
 * Crée un élément SVG et l'ajoute éventuellement à un parent.
 * @param {string} balise - Nom de la balise SVG.
 * @param {object} [attributs] - Attributs à poser.
 * @param {Element} [parent] - Parent auquel l'ajouter.
 * @returns {SVGElement} Élément créé.
 */
export function creerSvg(balise, attributs = {}, parent = null) {
  const element = document.createElementNS(ESPACE_SVG, balise);
  Object.entries(attributs).forEach(([nom, valeur]) => {
    if (valeur !== undefined && valeur !== null) element.setAttribute(nom, String(valeur));
  });
  if (parent) parent.append(element);
  return element;
}

/**
 * Vide un élément de tous ses enfants.
 * @param {Element} element - Élément à vider.
 */
export function vider(element) {
  while (element.firstChild) element.firstChild.remove();
}

/**
 * Récupère un élément par son id et lève une erreur claire s'il manque.
 * @param {string} id - Identifiant de l'élément.
 * @returns {HTMLElement} Élément trouvé.
 */
export function obtenirElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément #${id} introuvable.`);
  return element;
}
