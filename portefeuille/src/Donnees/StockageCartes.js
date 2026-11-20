/**
 * StockageCartes.js
 * Enregistre les cartes du portefeuille sur le téléphone (IndexedDB).
 * Rien n'est envoyé sur Internet : les cartes restent sur l'appareil.
 */

const NOM_BASE = 'drawcard-portefeuille';
const VERSION_BASE = 1;
const MAGASIN = 'cartes';

let connexion = null;

/**
 * Ouvre (ou crée) la base de données locale.
 * @returns {Promise<IDBDatabase>} Base ouverte.
 */
function ouvrirBase() {
  if (connexion) return connexion;
  connexion = new Promise((resoudre, rejeter) => {
    const requete = indexedDB.open(NOM_BASE, VERSION_BASE);
    requete.onupgradeneeded = () => {
      if (!requete.result.objectStoreNames.contains(MAGASIN)) requete.result.createObjectStore(MAGASIN, { keyPath: 'id' });
    };
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => {
      connexion = null;
      rejeter(new Error("Stockage du téléphone indisponible (navigation privée ?)."));
    };
  });
  return connexion;
}

/**
 * Exécute une opération sur le magasin des cartes.
 * @param {"readonly"|"readwrite"} mode - Mode de la transaction.
 * @param {(magasin:IDBObjectStore) => IDBRequest} operation - Opération à lancer.
 * @returns {Promise<any>} Résultat de l'opération.
 */
async function executer(mode, operation) {
  const base = await ouvrirBase();
  return new Promise((resoudre, rejeter) => {
    const transaction = base.transaction(MAGASIN, mode);
    const requete = operation(transaction.objectStore(MAGASIN));
    transaction.oncomplete = () => resoudre(requete.result);
    transaction.onerror = () => rejeter(new Error("Erreur d'enregistrement sur le téléphone."));
    transaction.onabort = () => rejeter(new Error('Espace de stockage insuffisant sur le téléphone.'));
  });
}

/**
 * Liste toutes les cartes enregistrées (brutes, à valider).
 * @returns {Promise<object[]>} Cartes.
 */
export function listerCartes() {
  return executer('readonly', (magasin) => magasin.getAll());
}

/**
 * Enregistre une carte.
 * @param {object} carte - Carte { id, ajouteLe, personne, modele }.
 * @returns {Promise<void>}
 */
export async function enregistrerCarte(carte) {
  await executer('readwrite', (magasin) => magasin.put(carte));
}

/**
 * Supprime une carte.
 * @param {string} id - Identifiant de la carte.
 * @returns {Promise<void>}
 */
export async function supprimerCarte(id) {
  await executer('readwrite', (magasin) => magasin.delete(id));
}
