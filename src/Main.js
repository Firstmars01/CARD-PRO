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
import { initialiserTheme, creerBoutonTheme } from './Interface/Themes.js';
import { chargerPolices } from './Utilitaires/ChargementPolices.js';

/**
 * Supprime l'ancien service worker des versions précédentes de DrawCard
 * (il pouvait afficher d'anciens fichiers en cache). Celui du portefeuille
 * mobile (/portefeuille/) est conservé.
 */
async function retirerAncienServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const enregistrements = await navigator.serviceWorker.getRegistrations();
  const racine = `${location.origin}/`;
  await Promise.all(enregistrements.filter((e) => e.scope === racine).map((e) => e.unregister()));
}

/**
 * Démarre l'application.
 */
async function demarrer() {
  initialiserTheme();
  obtenirElement('barreOnglets').before(creerBoutonTheme());
  retirerAncienServiceWorker().catch(() => {});
  // Polices de la carte : chargées avant tout affichage (rendu identique au mobile).
  await chargerPolices().catch(() => notifier('Polices de la carte non chargées : le texte peut différer du mobile.', 'erreur'));
  await chargerDonnees(() => notifier('Sauvegarde impossible : vérifie que le serveur DrawCard tourne.', 'erreur'));
  monterOngletCartes(obtenirElement('ongletCartes'));
  monterEditeurModeles(obtenirElement('ongletModeles'));
  initialiserOnglets(obtenirElement('barreOnglets'));
  obtenirElement('chargement').hidden = true;
}

demarrer().catch((erreur) => {
  obtenirElement('chargement').textContent = 'Impossible de charger DrawCard. Vérifie que le serveur tourne puis recharge la page.';
  notifier(erreur.message || "Erreur au démarrage de l'application.", 'erreur');
});
