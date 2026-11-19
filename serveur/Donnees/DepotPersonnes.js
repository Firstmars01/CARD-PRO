/**
 * DepotPersonnes.js
 * Accès à la table des personnes (une carte par personne).
 */

/**
 * Crée le dépôt des personnes.
 * @param {import('node:sqlite').DatabaseSync} base - Connexion.
 * @returns {object} Fonctions d'accès.
 */
export function creerDepotPersonnes(base) {
  const lister = base.prepare('SELECT id, modele_id AS modeleId, donnees FROM personnes ORDER BY cree_le, rowid');
  const existe = base.prepare('SELECT 1 FROM personnes WHERE id = ?');
  const compter = base.prepare('SELECT COUNT(*) AS total FROM personnes');
  const inserer = base.prepare('INSERT INTO personnes (id, modele_id, donnees) VALUES (?, ?, ?)');
  const maj = base.prepare("UPDATE personnes SET modele_id = ?, donnees = ?, modifie_le = datetime('now') WHERE id = ?");
  const supprimer = base.prepare('DELETE FROM personnes WHERE id = ?');
  const toutSupprimer = base.prepare('DELETE FROM personnes');
  const remplacerModele = base.prepare('UPDATE personnes SET modele_id = ? WHERE modele_id = ?');

  return {
    /** @returns {{id:string, modeleId:string, personne:object}[]} Toutes les personnes. */
    listerToutes: () => lister.all().map((l) => ({ id: l.id, modeleId: l.modeleId, personne: JSON.parse(l.donnees) })),
    /** @param {string} id - Identifiant. @returns {boolean} true si la personne existe. */
    existe: (id) => Boolean(existe.get(id)),
    /** @returns {number} Nombre de personnes. */
    compter: () => Number(compter.get().total),
    /**
     * @param {string} id - Identifiant.
     * @param {string} modeleId - Modèle utilisé.
     * @param {object} personne - Personne validée.
     */
    creer: (id, modeleId, personne) => { inserer.run(id, modeleId, JSON.stringify(personne)); },
    /**
     * @param {string} id - Identifiant.
     * @param {string} modeleId - Modèle utilisé.
     * @param {object} personne - Personne validée.
     */
    modifier: (id, modeleId, personne) => { maj.run(modeleId, JSON.stringify(personne), id); },
    /** @param {string} id - Identifiant. */
    supprimer: (id) => { supprimer.run(id); },
    /** Supprime toutes les personnes (restauration d'une sauvegarde). */
    toutSupprimer: () => { toutSupprimer.run(); },
    /**
     * Fait passer toutes les cartes d'un modèle supprimé sur un autre modèle.
     * @param {string} ancien - Modèle supprimé.
     * @param {string} nouveau - Modèle de remplacement.
     */
    remplacerModele: (ancien, nouveau) => { remplacerModele.run(nouveau, ancien); },
  };
}
