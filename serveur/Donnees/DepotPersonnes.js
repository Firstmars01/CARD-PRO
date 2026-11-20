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
  const lister = base.prepare('SELECT id, modele_id AS modeleId, entreprise_id AS entrepriseId, donnees FROM personnes ORDER BY cree_le, rowid');
  const existe = base.prepare('SELECT 1 FROM personnes WHERE id = ?');
  const compter = base.prepare('SELECT COUNT(*) AS total FROM personnes');
  const inserer = base.prepare('INSERT INTO personnes (id, modele_id, entreprise_id, donnees) VALUES (?, ?, ?, ?)');
  const maj = base.prepare("UPDATE personnes SET modele_id = ?, entreprise_id = ?, donnees = ?, modifie_le = datetime('now') WHERE id = ?");
  const supprimer = base.prepare('DELETE FROM personnes WHERE id = ?');
  const toutSupprimer = base.prepare('DELETE FROM personnes');
  const remplacerModele = base.prepare("UPDATE personnes SET modele_id = ?, modifie_le = datetime('now') WHERE modele_id = ?");
  const compterEntreprise = base.prepare('SELECT COUNT(*) AS total FROM personnes WHERE entreprise_id = ?');

  return {
    /** @returns {{id:string, modeleId:string, entrepriseId:string, personne:object}[]} Toutes les personnes. */
    listerToutes: () => lister.all().map((l) => ({
      id: l.id, modeleId: l.modeleId, entrepriseId: l.entrepriseId, personne: JSON.parse(l.donnees),
    })),
    /** @param {string} id - Identifiant. @returns {boolean} true si la personne existe. */
    existe: (id) => Boolean(existe.get(id)),
    /** @returns {number} Nombre de personnes. */
    compter: () => Number(compter.get().total),
    /**
     * @param {{id:string, modeleId:string, entrepriseId:string, personne:object}} entree - Carte validée
     *   (entrepriseId vide : réglage personnalisé).
     */
    creer: (entree) => { inserer.run(entree.id, entree.modeleId, entree.entrepriseId, JSON.stringify(entree.personne)); },
    /** @param {{id:string, modeleId:string, entrepriseId:string, personne:object}} entree - Carte validée. */
    modifier: (entree) => { maj.run(entree.modeleId, entree.entrepriseId, JSON.stringify(entree.personne), entree.id); },
    /** @param {string} id - Identifiant. */
    supprimer: (id) => { supprimer.run(id); },
    /** Supprime toutes les personnes (restauration d'une sauvegarde). */
    toutSupprimer: () => { toutSupprimer.run(); },
    /**
     * Fait passer toutes les cartes d'un modèle sur un autre modèle
     * (modèle supprimé, ou changement de design en lot).
     * @param {string} ancien - Modèle actuel.
     * @param {string} nouveau - Modèle de remplacement.
     * @returns {number} Nombre de cartes modifiées.
     */
    remplacerModele: (ancien, nouveau) => Number(remplacerModele.run(nouveau, ancien).changes),
    /** @param {string} entrepriseId - Entreprise. @returns {number} Cartes reliées à cette entreprise. */
    compterParEntreprise: (entrepriseId) => Number(compterEntreprise.get(entrepriseId).total),
  };
}
