/**
 * Main.js
 * Point d'entrée de l'application : charge les données depuis le serveur
 * puis monte les deux onglets (Cartes et Modèles).
 */

import { obtenirElement } from './Utilitaires/Dom.js';
import { chargerDonnees } from './Metier/EtatApplication.js';
import { initialiserOnglets } from './Interface/Onglets.js';
import { monterOngletCartes } from './Interface/Cartes/OngletCartes.js';
import { monterEditeurModeles } from './Interface/Modeles/EditeurModeles.js';
import { notifier } from './Interface/Notifications.js';

/**
 * Supprime l'ancien service worker des versions précédentes de Card Pro
 * (il pouvait afficher d'anciens fichiers en cache).
 */
async function retirerAncienServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const enregistrements = await navigator.serviceWorker.getRegistrations();
  await Promise.all(enregistrements.map((e) => e.unregister()));
}

/**
 * Démarre l'application.
 */
async function demarrer() {
  retirerAncienServiceWorker().catch(() => {});
  await chargerDonnees(() => notifier('Sauvegarde impossible : vérifie que le serveur Card Pro tourne.', 'erreur'));
  monterOngletCartes(obtenirElement('ongletCartes'));
  monterEditeurModeles(obtenirElement('ongletModeles'));
  initialiserOnglets(obtenirElement('barreOnglets'));
  obtenirElement('chargement').hidden = true;
}

demarrer().catch((erreur) => {
  obtenirElement('chargement').textContent = 'Impossible de charger Card Pro. Vérifie que le serveur tourne puis recharge la page.';
  notifier(erreur.message || "Erreur au démarrage de l'application.", 'erreur');
});
