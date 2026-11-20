/**
 * Main.js (configurateur)
 * Page de téléchargement de DrawCard-Configurateur.exe. L'adresse du fichier est
 * déduite de l'adresse GitHub Pages (compte.github.io/depot/) : elle pointe
 * toujours vers la dernière version publiée dans « Releases ».
 */

import { creerElement, obtenirElement } from '../../src/Utilitaires/Dom.js';
import { initialiserTheme, creerBoutonTheme } from '../../src/Interface/Themes.js';
import { depotGithub, pageVersions, lienExeConfigurateur } from '../../src/Utilitaires/DepotGithub.js';

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

  principal.append(
    creerElement('h2', { classe: 'Titre-ecran', texte: 'DrawCard pour Windows' }),
    creerElement('p', { texte: "DrawCard Configurateur : modèles de cartes, liste des personnes, exports et QR pour le portefeuille mobile. Rien à installer, les données restent sur ton PC." }),
  );
  if (depot) {
    principal.append(
      creerElement('div', { classe: 'Actions' }, [
        creerElement('a', { classe: 'PBouton PBouton--principal PBouton--grand', texte: 'Télécharger DrawCard-Configurateur.exe', attributs: { href: lienExeConfigurateur(depot) } }),
      ]),
      creerElement('p', { classe: 'Astuce' }, [creerElement('a', { texte: 'Toutes les versions', attributs: { href: pageVersions(depot), rel: 'noopener noreferrer' } })]),
    );
  } else {
    principal.append(creerElement('p', { classe: 'Astuce', texte: 'Lien de téléchargement disponible sur la page GitHub Pages du projet.' }));
  }
  principal.append(etapes([
    'Télécharge DrawCard-Configurateur.exe (Windows 10 ou 11).',
    "Double-clique dessus. Si Windows affiche « Windows a protégé votre ordinateur » : « Informations complémentaires » → « Exécuter quand même ».",
    "La page DrawCard s'ouvre dans ton navigateur, et une icône apparaît près de l'horloge.",
    "Clic sur l'icône : rouvrir la page. Clic droit : dossier des données, mise à jour, quitter.",
  ]));
  principal.append(creerElement('p', { classe: 'Astuce', texte: "Données enregistrées dans %APPDATA%\\DrawCard. Pense à utiliser « Sauvegarde des données » dans l'appli." }));
}

demarrer();
