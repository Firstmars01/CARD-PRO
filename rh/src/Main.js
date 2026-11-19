/**
 * Main.js (rh)
 * Page de téléchargement de CardPro-RH.exe. L'adresse du fichier est
 * déduite de l'adresse GitHub Pages (compte.github.io/depot/) : elle pointe
 * toujours vers la dernière version publiée dans « Releases ».
 */

import { creerElement, obtenirElement } from '../../src/Utilitaires/Dom.js';
import { initialiserTheme, creerBoutonTheme } from '../../src/Interface/Themes.js';

/**
 * Déduit le dépôt GitHub de l'adresse de la page.
 * @returns {{compte:string, depot:string}|null} Dépôt, ou null hors GitHub Pages.
 */
function depotGithub() {
  const compte = /^([a-z0-9-]+)\.github\.io$/i.exec(location.hostname)?.[1];
  const depot = /^\/([A-Za-z0-9._-]+)\//.exec(location.pathname)?.[1];
  return compte && depot ? { compte, depot } : null;
}

/**
 * Crée une liste numérotée.
 * @param {string[]} etapes - Étapes.
 * @returns {HTMLOListElement} Liste.
 */
function etapes(etapes) {
  return creerElement('ol', { classe: 'Etapes' }, etapes.map((texte) => creerElement('li', { texte })));
}

/**
 * Affiche la page.
 */
function demarrer() {
  initialiserTheme();
  obtenirElement('entete').append(creerBoutonTheme());
  const principal = obtenirElement('principal');
  const depot = depotGithub();
  const versions = depot ? `https://github.com/${depot.compte}/${depot.depot}/releases/latest` : '';

  principal.append(
    creerElement('h2', { classe: 'Titre-ecran', texte: 'Card Pro pour Windows' }),
    creerElement('p', { texte: "L'appli des RH : modèles de cartes, liste des personnes, exports et QR pour le portefeuille mobile. Rien à installer, les données restent sur ton PC." }),
  );
  if (depot) {
    principal.append(
      creerElement('div', { classe: 'Actions' }, [
        creerElement('a', { classe: 'PBouton PBouton--principal PBouton--grand', texte: 'Télécharger CardPro-RH.exe', attributs: { href: `${versions}/download/CardPro-RH.exe` } }),
      ]),
      creerElement('p', { classe: 'Astuce' }, [creerElement('a', { texte: 'Toutes les versions', attributs: { href: versions, rel: 'noopener noreferrer' } })]),
    );
  } else {
    principal.append(creerElement('p', { classe: 'Astuce', texte: 'Lien de téléchargement disponible sur la page GitHub Pages du projet.' }));
  }
  principal.append(etapes([
    'Télécharge CardPro-RH.exe (Windows 10 ou 11).',
    "Double-clique dessus. Si Windows affiche « Windows a protégé votre ordinateur » : « Informations complémentaires » → « Exécuter quand même ».",
    "La page Card Pro s'ouvre dans ton navigateur, et une icône apparaît près de l'horloge.",
    "Clic sur l'icône : rouvrir la page. Clic droit : dossier des données, mise à jour, quitter.",
  ]));
  principal.append(creerElement('p', { classe: 'Astuce', texte: "Données enregistrées dans %APPDATA%\\CardPro. Pense à utiliser « Sauvegarde des données » dans l'appli." }));
}

demarrer();
