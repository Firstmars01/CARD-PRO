/**
 * Main.js (accueil)
 * Page d'accueil du projet : présentation, fonctionnement et bouton de
 * téléchargement adapté à l'appareil :
 *  - PC : CardPro-RH.exe (appli des RH pour Windows) ;
 *  - téléphone : l'appli mobile (page portefeuille/, qui propose l'APK
 *    sur Android et l'ajout à l'écran d'accueil sur iPhone).
 * Le texte est inséré avec textContent (aucune injection possible).
 */

import { creerElement, obtenirElement } from '../../src/Utilitaires/Dom.js';
import { depotGithub, pageVersions, lienExeRh } from '../../src/Utilitaires/DepotGithub.js';
import { initialiserTheme, creerBoutonTheme } from '../../src/Interface/Themes.js';
import { creerQrLien } from '../../src/Interface/Rendu/QrLien.js';
import { systeme } from '../../portefeuille/src/Utilitaires/Plateforme.js';

const ADRESSE_MOBILE = 'portefeuille/';

/**
 * Crée un bouton-lien.
 * @param {string} texte - Libellé.
 * @param {string} adresse - Adresse du lien.
 * @param {boolean} [principal=false] - Bouton mis en avant.
 * @returns {HTMLAnchorElement} Lien.
 */
function bouton(texte, adresse, principal = false) {
  return creerElement('a', { classe: `PBouton${principal ? ' PBouton--principal PBouton--grand' : ''}`, texte, attributs: { href: adresse } });
}

/**
 * Crée une liste à puces.
 * @param {string[]} elements - Lignes.
 * @returns {HTMLUListElement} Liste.
 */
function liste(elements) {
  return creerElement('ul', { classe: 'Liste' }, elements.map((texte) => creerElement('li', { texte })));
}

/**
 * Bandeau d'en-tête avec le téléchargement adapté à l'appareil.
 * @param {{compte:string, depot:string}|null} depot - Dépôt GitHub.
 * @returns {HTMLElement} Section.
 */
function creerBandeau(depot) {
  const surPc = systeme() === 'pc';
  const actions = surPc && depot
    ? [bouton('Télécharger Card Pro RH (Windows)', lienExeRh(depot), true), bouton("Appli mobile : sur ton téléphone", '#mobile')]
    : [bouton("Installer l'appli Card Pro", ADRESSE_MOBILE, true), bouton('Appli des RH (PC Windows)', '#rh')];
  return creerElement('section', { classe: 'Bandeau' }, [
    creerElement('h2', { classe: 'Bandeau-titre', texte: "Les cartes de visite de toute l'équipe, sur papier et sur téléphone." }),
    creerElement('p', { classe: 'Bandeau-texte', texte: "Les RH créent les cartes avec QR code. Chacun garde les siennes et celles des autres dans son téléphone, et partage son contact d'un geste : QR code, NFC ou message." }),
    creerElement('div', { classe: 'Actions' }, actions),
    creerElement('p', { classe: 'Astuce', texte: surPc ? 'Windows 10 ou 11, rien à installer.' : 'Android (avec NFC) et iPhone.' }),
  ]);
}

/**
 * Section « Comment ça marche » en 3 étapes.
 * @returns {HTMLElement} Section.
 */
function creerFonctionnement() {
  const etapes = [
    ['Créer', "Les RH dessinent les modèles (recto / verso, logo, couleurs, QR) et ajoutent les personnes, une par une ou depuis Excel."],
    ['Distribuer', "Chaque carte s'imprime (PDF, planche A4, imprimeur) ou s'envoie sur le téléphone : QR animé à scanner, ou GIF par e-mail."],
    ['Partager', "Sur le téléphone, la carte s'affiche recto / verso. On transmet son contact par QR code, NFC (Android) ou AirDrop / Quick Share."],
  ];
  return creerElement('section', { classe: 'Bloc' }, [
    creerElement('h2', { classe: 'Bloc-titre', texte: 'Comment ça marche' }),
    creerElement('ol', { classe: 'Etapes Etapes--grille' }, etapes.map(([titre, texte]) => creerElement('li', {}, [
      creerElement('strong', { texte: titre }),
      creerElement('span', { texte }),
    ]))),
  ]);
}

/**
 * Carte de présentation d'une des deux applis.
 * @param {object} options - { id, titre, texte, points, actions, complement }.
 * @returns {HTMLElement} Article.
 */
function creerAppli({ id, titre, texte, points, actions, complement }) {
  return creerElement('article', { classe: 'Appli', attributs: { id } }, [
    creerElement('h3', { classe: 'Appli-titre', texte: titre }),
    creerElement('p', { texte }),
    liste(points),
    creerElement('div', { classe: 'Actions' }, actions),
    complement,
  ]);
}

/**
 * Section des deux applis : RH (Windows) et mobile.
 * @param {{compte:string, depot:string}|null} depot - Dépôt GitHub.
 * @returns {HTMLElement} Section.
 */
function creerApplis(depot) {
  const adresseMobile = new URL(ADRESSE_MOBILE, location.href).href;
  return creerElement('section', { classe: 'Bloc' }, [
    creerElement('h2', { classe: 'Bloc-titre', texte: 'Deux applis' }),
    creerElement('div', { classe: 'Applis' }, [
      creerAppli({
        id: 'rh',
        titre: 'Card Pro RH · PC Windows',
        texte: 'Pour créer et gérer les cartes de toute l’équipe.',
        points: [
          'Éditeur visuel recto / verso : formes, icônes, dégradés, palette, formats',
          'Liste des personnes, import Excel / CSV',
          'Exports PNG, JPG, SVG, PDF, planche A4, PDF imprimeur',
          'QR animé et GIF pour envoyer la carte sur le téléphone',
          'Sauvegarde / restauration, mises à jour annoncées',
        ],
        actions: depot ? [bouton('Télécharger CardPro-RH.exe', lienExeRh(depot), true), bouton('Toutes les versions', pageVersions(depot))] : [],
        complement: creerElement('p', { classe: 'Astuce', texte: "Si Windows affiche « Windows a protégé votre ordinateur » : Informations complémentaires → Exécuter quand même. Ensuite, une icône Card Pro apparaît près de l'horloge." }),
      }),
      creerAppli({
        id: 'mobile',
        titre: 'Card Pro · Téléphone',
        texte: 'Le portefeuille de cartes qui remplace le papier.',
        points: [
          'Cartes reçues en recto / verso, comme imprimées',
          'Ajout par scan du QR animé ou par le GIF / .cardpro reçu par e-mail',
          'Montrer son contact en QR plein écran, l’envoyer par AirDrop / Quick Share',
          'NFC : approcher un autre téléphone suffit (appli Android)',
          'Thème clair / sombre, fonctionne hors ligne',
        ],
        actions: [bouton("Installer l'appli mobile", ADRESSE_MOBILE, true)],
        complement: creerElement('div', { classe: 'Appli-qr' }, [
          creerQrLien(adresseMobile, "QR code pour ouvrir l'appli mobile"),
          creerElement('p', { classe: 'Astuce', texte: 'Sur PC ? Scanne ce QR code avec ton téléphone.' }),
        ]),
      }),
    ]),
  ]);
}

/**
 * Section « Vos données ».
 * @returns {HTMLElement} Section.
 */
function creerDonnees() {
  return creerElement('section', { classe: 'Bloc' }, [
    creerElement('h2', { classe: 'Bloc-titre', texte: 'Vos données restent chez vous' }),
    liste([
      "Aucun compte, aucun serveur en ligne : les cartes sont sur le PC des RH et sur les téléphones.",
      "L'appli des RH n'est accessible que depuis son PC.",
      "Les cartes passent du PC au téléphone par QR code ou fichier, jamais par Internet.",
      'Le code est ouvert : il est publié sur GitHub.',
    ]),
  ]);
}

/**
 * Affiche la page.
 */
function demarrer() {
  initialiserTheme();
  obtenirElement('entete').append(creerBoutonTheme());
  const depot = depotGithub();
  obtenirElement('principal').append(creerBandeau(depot), creerFonctionnement(), creerApplis(depot), creerDonnees());
  if (depot) {
    obtenirElement('pied').append(
      creerElement('span', { texte: 'Card Pro · ' }),
      creerElement('a', { texte: 'Code source sur GitHub', attributs: { href: `https://github.com/${depot.compte}/${depot.depot}`, rel: 'noopener noreferrer' } }),
    );
  }
}

demarrer();
