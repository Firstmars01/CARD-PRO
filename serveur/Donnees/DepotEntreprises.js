/**
 * DepotEntreprises.js
 * Accès à la table des entreprises (infos communes à plusieurs cartes).
 */

/**
 * Crée le dépôt des entreprises.
 * @param {import('node:sqlite').DatabaseSync} base - Connexion.
 * @returns {object} Fonctions d'accès.
 */
export function creerDepotEntreprises(base) {
  const lister = base.prepare('SELECT donnees FROM entreprises ORDER BY nom COLLATE NOCASE');
  const existe = base.prepare('SELECT 1 FROM entreprises WHERE id = ?');
  const compter = base.prepare('SELECT COUNT(*) AS total FROM entreprises');
  const inserer = base.prepare('INSERT INTO entreprises (id, nom, donnees) VALUES (?, ?, ?)');
  const maj = base.prepare("UPDATE entreprises SET nom = ?, donnees = ?, modifie_le = datetime('now') WHERE id = ?");
  const supprimer = base.prepare('DELETE FROM entreprises WHERE id = ?');
  const toutSupprimer = base.prepare('DELETE FROM entreprises');

  return {
    /** @returns {object[]} Toutes les entreprises (par nom). */
    listerToutes: () => lister.all().map((l) => JSON.parse(l.donnees)),
    /** @param {string} id - Identifiant. @returns {boolean} true si l'entreprise existe. */
    existe: (id) => Boolean(existe.get(id)),
    /** @returns {number} Nombre d'entreprises. */
    compter: () => Number(compter.get().total),
    /** @param {object} entreprise - Entreprise validée. */
    creer: (entreprise) => { inserer.run(entreprise.id, entreprise.nom, JSON.stringify(entreprise)); },
    /** @param {object} entreprise - Entreprise validée. */
    modifier: (entreprise) => { maj.run(entreprise.nom, JSON.stringify(entreprise), entreprise.id); },
    /** @param {string} id - Identifiant. */
    supprimer: (id) => { supprimer.run(id); },
    /** Supprime toutes les entreprises (restauration d'une sauvegarde). */
    toutSupprimer: () => { toutSupprimer.run(); },
  };
}
