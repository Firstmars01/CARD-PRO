/**
 * DepotModeles.js
 * Accès à la table des modèles de carte enregistrés.
 */

/**
 * Crée le dépôt des modèles.
 * @param {import('node:sqlite').DatabaseSync} base - Connexion.
 * @returns {object} Fonctions d'accès.
 */
export function creerDepotModeles(base) {
  const lister = base.prepare('SELECT donnees FROM modeles ORDER BY nom COLLATE NOCASE');
  const lire = base.prepare('SELECT donnees FROM modeles WHERE id = ?');
  const compter = base.prepare('SELECT COUNT(*) AS total FROM modeles');
  const inserer = base.prepare('INSERT INTO modeles (id, nom, donnees) VALUES (?, ?, ?)');
  const maj = base.prepare("UPDATE modeles SET nom = ?, donnees = ?, modifie_le = datetime('now') WHERE id = ?");
  const supprimer = base.prepare('DELETE FROM modeles WHERE id = ?');
  const toutSupprimer = base.prepare('DELETE FROM modeles');

  return {
    /** @returns {object[]} Tous les modèles enregistrés. */
    listerTous: () => lister.all().map((l) => JSON.parse(l.donnees)),
    /** @param {string} id - Identifiant. @returns {object|null} Modèle. */
    lire: (id) => {
      const ligne = lire.get(id);
      return ligne ? JSON.parse(ligne.donnees) : null;
    },
    /** @returns {number} Nombre de modèles enregistrés. */
    compter: () => Number(compter.get().total),
    /** @param {object} modele - Modèle validé. */
    creer: (modele) => { inserer.run(modele.id, modele.nom, JSON.stringify(modele)); },
    /** @param {object} modele - Modèle validé. */
    modifier: (modele) => { maj.run(modele.nom, JSON.stringify(modele), modele.id); },
    /** @param {string} id - Identifiant. */
    supprimer: (id) => { supprimer.run(id); },
    /** Supprime tous les modèles (restauration d'une sauvegarde). */
    toutSupprimer: () => { toutSupprimer.run(); },
  };
}
