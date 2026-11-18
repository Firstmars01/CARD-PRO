/**
 * Routeur.js
 * Petit routeur HTTP : associe une méthode + un chemin (avec paramètres
 * du type « :id ») à une fonction. Les paramètres sont limités à des
 * caractères sûrs (lettres minuscules, chiffres, tirets).
 */

export class Routeur {
  constructor() {
    this.routes = [];
  }

  /**
   * Déclare une route.
   * @param {string} methode - GET, POST, PUT ou DELETE.
   * @param {string} motif - Chemin, ex. « /api/designs/:id ».
   * @param {Function} gestionnaire - Fonction appelée avec le contexte.
   * @param {{authentifie?:boolean, limiteCorps?:number}} [options] - Options de la route.
   */
  ajouter(methode, motif, gestionnaire, options = {}) {
    const noms = [];
    const source = motif.replace(/:([a-zA-Z]+)/g, (_, nom) => {
      noms.push(nom);
      return '([a-z0-9-]{1,60})';
    });
    this.routes.push({ methode, expression: new RegExp(`^${source}$`), noms, gestionnaire, options });
  }

  /**
   * Cherche la route correspondant à une requête.
   * @param {string} methode - Méthode HTTP.
   * @param {string} chemin - Chemin de l'URL.
   * @returns {{gestionnaire:Function, options:object, params:object}|null} Route trouvée.
   */
  trouver(methode, chemin) {
    for (const route of this.routes) {
      const resultat = route.methode === methode && route.expression.exec(chemin);
      if (resultat) {
        const params = {};
        route.noms.forEach((nom, i) => { params[nom] = resultat[i + 1]; });
        return { gestionnaire: route.gestionnaire, options: route.options, params };
      }
    }
    return null;
  }
}
