/**
 * EcranInstallation.js
 * Seul écran visible quand Card Pro est ouvert dans un navigateur : il
 * explique comment installer l'appli. Toutes les fonctions (cartes, scan,
 * import) ne sont disponibles qu'une fois l'appli installée.
 *  - PC : « ouvre ce lien sur ton téléphone » + QR code ;
 *  - iPhone : étapes Safari (Partager → Sur l'écran d'accueil → Ajouter) ;
 *  - Android : bouton « Installer l'application » (ou étapes du menu).
 */

import { creerElement, vider } from '../../../src/Utilitaires/Dom.js';
import { creerQrLien } from '../../../src/Interface/Rendu/QrLien.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import {
  systeme, navigateurCompatible, invitationInstallation, lancerInstallation, abonnerInstallation,
} from '../Utilitaires/Plateforme.js';

/**
 * Adresse de l'appli, sans paramètres (celle à installer).
 * @returns {string} Adresse.
 */
function adresseAppli() {
  return `${location.origin}${location.pathname}`;
}

/**
 * Crée le bouton « Copier le lien ».
 * @returns {HTMLButtonElement} Bouton.
 */
function boutonCopier() {
  const bouton = creerElement('button', { classe: 'PBouton', texte: 'Copier le lien', attributs: { type: 'button' } });
  bouton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(adresseAppli());
      notifier('Lien copié.', 'succes');
    } catch {
      notifier(`Copie impossible : ${adresseAppli()}`, 'erreur');
    }
  });
  return bouton;
}

/**
 * Crée une liste d'étapes numérotées.
 * @param {string[]} etapes - Textes des étapes.
 * @returns {HTMLOListElement} Liste.
 */
function listeEtapes(etapes) {
  return creerElement('ol', { classe: 'Etapes' }, etapes.map((texte) => creerElement('li', { texte })));
}

/**
 * Contenu pour un PC : l'appli est réservée aux téléphones.
 * @returns {HTMLElement[]} Éléments.
 */
function contenuPc() {
  return [
    creerElement('h2', { classe: 'Titre-ecran', texte: 'Installe Card Pro sur ton téléphone' }),
    creerElement('p', { texte: "Card Pro est une appli pour téléphone (Android ou iPhone). Scanne ce QR code avec l'appareil photo de ton téléphone pour l'ouvrir, puis installe-la." }),
    creerQrLien(adresseAppli(), "QR code de l'adresse de l'appli Card Pro"),
    creerElement('p', { classe: 'Lien-appli', texte: adresseAppli() }),
    creerElement('div', { classe: 'Actions' }, [boutonCopier()]),
  ];
}

/**
 * Contenu pour un iPhone / iPad.
 * @returns {HTMLElement[]} Éléments.
 */
function contenuIos() {
  if (!navigateurCompatible()) {
    return [
      creerElement('h2', { classe: 'Titre-ecran', texte: 'Ouvre ce lien dans Safari' }),
      creerElement('p', { texte: "Sur iPhone, Card Pro s'installe depuis Safari. Copie le lien, ouvre Safari et colle-le dans la barre d'adresse." }),
      creerElement('div', { classe: 'Actions' }, [boutonCopier()]),
    ];
  }
  return [
    creerElement('h2', { classe: 'Titre-ecran', texte: "Installe l'appli Card Pro" }),
    listeEtapes([
      'Touche le bouton Partager (le carré avec une flèche vers le haut), en bas de Safari.',
      'Fais défiler et choisis « Sur l’écran d’accueil ».',
      'Touche « Ajouter » en haut à droite.',
      "Ouvre Card Pro depuis ton écran d'accueil.",
    ]),
  ];
}

/**
 * Contenu pour Android : bouton d'installation si le navigateur le permet, sinon les étapes.
 * @param {() => void} redessiner - Redessine l'écran (quand l'invitation arrive).
 * @returns {HTMLElement[]} Éléments.
 */
function contenuAndroid(redessiner) {
  if (!navigateurCompatible()) {
    return [
      creerElement('h2', { classe: 'Titre-ecran', texte: 'Ouvre ce lien dans Chrome' }),
      creerElement('p', { texte: "Ce navigateur intégré ne peut pas installer d'appli. Touche ⋮ puis « Ouvrir dans Chrome », ou copie le lien et colle-le dans Chrome." }),
      creerElement('div', { classe: 'Actions' }, [boutonCopier()]),
    ];
  }
  const titre = creerElement('h2', { classe: 'Titre-ecran', texte: "Installe l'appli Card Pro" });
  if (invitationInstallation()) {
    const installer = creerElement('button', { classe: 'PBouton PBouton--principal PBouton--grand', texte: "Installer l'application", attributs: { type: 'button' } });
    installer.addEventListener('click', async () => {
      if (!(await lancerInstallation())) redessiner();
    });
    return [titre, creerElement('p', { texte: "Toutes les fonctions (cartes, scan, import) s'ouvrent dans l'appli installée." }), creerElement('div', { classe: 'Actions' }, [installer])];
  }
  return [
    titre,
    listeEtapes([
      'Touche le menu ⋮ en haut à droite de Chrome.',
      '« Installer l’application » (ou « Ajouter à l’écran d’accueil »).',
      "Ouvre Card Pro depuis ton écran d'accueil.",
    ]),
    creerElement('p', { classe: 'Astuce', texte: 'Tu ne vois pas ce choix ? Ouvre ce lien dans Chrome.' }),
    creerElement('div', { classe: 'Actions' }, [boutonCopier()]),
  ];
}

/**
 * Affiche l'écran d'installation dans un conteneur.
 * @param {HTMLElement} conteneur - Zone principale de la page.
 */
export function afficherEcranInstallation(conteneur) {
  const ecran = creerElement('section', { classe: 'Ecran Installation', attributs: { 'aria-label': "Installation de l'appli" } });
  const dessiner = (installee = false) => {
    vider(ecran);
    if (installee) {
      ecran.append(
        creerElement('h2', { classe: 'Titre-ecran', texte: 'Card Pro est installée' }),
        creerElement('p', { texte: "Ouvre l'appli Card Pro depuis ton écran d'accueil pour ajouter tes cartes." }),
      );
      return;
    }
    const contenus = { pc: contenuPc, ios: contenuIos, android: () => contenuAndroid(() => dessiner()) };
    ecran.append(...contenus[systeme()]());
  };
  abonnerInstallation((type) => dessiner(type === 'installee'));
  dessiner();
  conteneur.append(ecran);
}
