/**
 * Schema.js
 * Validation générique d'un objet à partir d'un schéma (liste de réglages).
 * Un même schéma sert à valider les données (navigateur et serveur)
 * et à générer automatiquement les contrôles de l'éditeur.
 *
 * Types de réglage : couleur, plage, mm, booleen, choix, texte, image.
 * Options d'un réglage texte : multiligne (garde les retours à la ligne), espaces (garde les espaces).
 */

import {
  nettoyerTexte, nettoyerTexteMultiligne, nettoyerTexteAvecEspaces, normaliserCouleur, bornerNombre, choisirParmi, normaliserImageDataUrl,
} from './Validation.js';

// Taille maximale d'une image intégrée (data URL), ≈ 1 Mo.
export const IMAGE_MAX = 1400000;

/**
 * Valide une valeur selon la description d'un réglage.
 * @param {object} reglage - Réglage { cle, type, min, max, options, multiligne }.
 * @param {unknown} valeur - Valeur brute (non fiable).
 * @param {unknown} defaut - Valeur par défaut si invalide.
 * @returns {unknown} Valeur valide.
 */
export function normaliserReglage(reglage, valeur, defaut) {
  switch (reglage.type) {
    case 'couleur': return normaliserCouleur(valeur, defaut);
    case 'plage':
    case 'mm': return Math.round(bornerNombre(valeur, reglage.min, reglage.max, defaut));
    case 'booleen': return typeof valeur === 'boolean' ? valeur : defaut;
    case 'choix': return choisirParmi(valeur, reglage.options.map(([v]) => v), defaut);
    case 'texte':
      if (typeof valeur !== 'string') return defaut;
      if (reglage.multiligne) return nettoyerTexteMultiligne(valeur, reglage.max);
      return reglage.espaces ? nettoyerTexteAvecEspaces(valeur, reglage.max) : nettoyerTexte(valeur, reglage.max);
    case 'image': return valeur === '' ? '' : normaliserImageDataUrl(valeur, IMAGE_MAX) || defaut;
    default: return defaut;
  }
}

/**
 * Valide un objet complet : chaque clé du schéma est vérifiée,
 * les clés inconnues sont ignorées.
 * @param {object[]} schema - Liste de réglages.
 * @param {unknown} brut - Objet brut.
 * @param {object} defauts - Valeurs par défaut.
 * @returns {object} Objet propre.
 */
export function normaliserObjet(schema, brut, defauts) {
  const source = brut && typeof brut === 'object' ? brut : {};
  const resultat = {};
  schema.forEach((reglage) => {
    resultat[reglage.cle] = normaliserReglage(reglage, source[reglage.cle], defauts[reglage.cle]);
  });
  return resultat;
}

/**
 * Génère un identifiant aléatoire (ex. : « e-k3x9a2b1 »).
 * @param {string} prefixe - Préfixe de l'identifiant.
 * @returns {string} Identifiant.
 */
export function nouvelId(prefixe) {
  const aleatoire = crypto.getRandomValues(new Uint32Array(2));
  return `${prefixe}-${Array.from(aleatoire, (n) => n.toString(36)).join('')}`;
}

/**
 * Vérifie un identifiant (minuscules, chiffres, tirets).
 * @param {unknown} id - Identifiant à vérifier.
 * @returns {boolean} true si l'identifiant est valide.
 */
export function idValide(id) {
  return typeof id === 'string' && /^[a-z0-9-]{1,40}$/.test(id);
}
