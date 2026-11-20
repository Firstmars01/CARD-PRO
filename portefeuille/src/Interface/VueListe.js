/**
 * VueListe.js
 * Écran d'accueil : la liste des cartes du portefeuille (ma carte, puis
 * favoris, puis les autres, triées au choix), avec les boutons « Scanner »
 * (QR animé), « Importer » (GIF, .cardpro ou sauvegarde .json) et
 * « Sauvegarder » (tout le portefeuille dans un fichier).
 */

import { creerElement, vider } from '../../../src/Utilitaires/Dom.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { obtenirCartes, abonnerCartes, importerFichier, titreCarte } from '../Metier/Portefeuille.js';
import { dessinerFace } from './RenduCarte.js';
import { allerA } from './Navigation.js';
import { trierCartes, ORDRES, ORDRE_PAR_DEFAUT } from '../Metier/TriCartes.js';
import { estSauvegarde, sauvegarderPortefeuille, restaurerPortefeuille } from './SauvegardeTelephone.js';

const CLE_ORDRE = 'cardpro-ordre-cartes';

/**
 * Lit l'ordre de tri choisi (gardé sur le téléphone).
 * @returns {string} Clé de l'ordre.
 */
function lireOrdre() {
  try {
    const ordre = localStorage.getItem(CLE_ORDRE);
    return ORDRES.some(([cle]) => cle === ordre) ? ordre : ORDRE_PAR_DEFAUT;
  } catch {
    return ORDRE_PAR_DEFAUT;
  }
}

/**
 * Importe les fichiers choisis puis ouvre la dernière carte ajoutée.
 * @param {File[]} fichiers - Fichiers à importer.
 */
export async function importerFichiers(fichiers) {
  let derniere = null;
  for (const fichier of fichiers) {
    try {
      // Sauvegarde du portefeuille (.json) : restauration ; sinon une carte.
      if (estSauvegarde(fichier)) await restaurerPortefeuille(fichier);
      else derniere = await importerFichier(fichier);
    } catch (erreur) {
      notifier(erreur.message || 'Import impossible.', 'erreur');
    }
  }
  if (derniere) {
    notifier(`Carte de ${titreCarte(derniere)} ajoutée.`, 'succes');
    allerA('carte', derniere.id);
  }
}

/**
 * Crée la vignette d'une carte.
 * @param {object} carte - Carte.
 * @returns {HTMLButtonElement} Vignette cliquable.
 */
function creerVignette(carte) {
  const { personne } = carte;
  let marque = '';
  if (carte.maCarte) marque = 'Ma carte · ';
  else if (carte.favori) marque = '★ ';
  const vignette = creerElement('button', { classe: 'Vignette', attributs: { type: 'button' } }, [
    dessinerFace(carte, 'recto'),
    creerElement('span', { classe: 'Vignette-nom', texte: `${marque}${titreCarte(carte)}` }),
    creerElement('span', { classe: 'Vignette-detail', texte: [personne.poste, personne.entreprise].filter(Boolean).join(' · ') }),
  ]);
  vignette.addEventListener('click', () => allerA('carte', carte.id));
  return vignette;
}

/**
 * Crée l'écran « liste ».
 * @returns {{element:HTMLElement, afficher:() => void}} Écran.
 */
export function creerVueListe() {
  const entree = creerElement('input', {
    attributs: { type: 'file', accept: '.cardpro,.gif,.json,image/gif,application/json,application/octet-stream', multiple: true, hidden: true },
  });
  entree.addEventListener('change', async () => {
    const fichiers = [...entree.files];
    entree.value = '';
    await importerFichiers(fichiers);
  });
  const importer = creerElement('button', { classe: 'PBouton', texte: 'Importer un fichier', attributs: { type: 'button' } });
  importer.addEventListener('click', () => entree.click());
  const scanner = creerElement('button', { classe: 'PBouton PBouton--principal', texte: 'Scanner un QR', attributs: { type: 'button' } });
  scanner.addEventListener('click', () => allerA('scanner'));

  const sauvegarder = creerElement('button', { classe: 'PBouton', texte: 'Sauvegarder mes cartes', attributs: { type: 'button' } });
  sauvegarder.addEventListener('click', () => sauvegarderPortefeuille().catch((e) => notifier(e.message || 'Sauvegarde impossible.', 'erreur')));
  const ordre = creerElement('select', { classe: 'Tri', attributs: { 'aria-label': 'Trier les cartes' } },
    ORDRES.map(([cle, libelle]) => creerElement('option', { texte: libelle, attributs: { value: cle } })));
  ordre.value = lireOrdre();
  ordre.addEventListener('change', () => {
    try {
      localStorage.setItem(CLE_ORDRE, ordre.value);
    } catch {
      // Stockage indisponible : le tri s'applique sans être retenu.
    }
    dessiner();
  });

  const titre = creerElement('h2', { classe: 'Titre-ecran' });
  const grille = creerElement('div', { classe: 'Grille' });
  const vide = creerElement('div', { classe: 'Vide' }, [
    creerElement('p', { texte: 'Aucune carte pour le moment.' }),
    creerElement('p', {
      classe: 'Astuce',
      texte: "Scanne le QR animé affiché par le Configurateur, ou importe le GIF / le fichier .cardpro reçu par e-mail (sur Android : « Partager » → Card Pro).",
    }),
  ]);
  const element = creerElement('section', { classe: 'Ecran', attributs: { 'aria-label': 'Mes cartes' } }, [
    creerElement('div', { classe: 'Actions' }, [scanner, importer, entree]),
    creerElement('div', { classe: 'EnteteListe' }, [titre, ordre]),
    vide,
    grille,
    creerElement('div', { classe: 'Actions' }, [sauvegarder]),
    creerElement('p', { classe: 'Astuce', texte: 'Sauvegarde : un fichier avec toutes tes cartes. Pour les retrouver (nouveau téléphone…), utilise « Importer un fichier » et choisis ce fichier.' }),
  ]);

  const dessiner = () => {
    const cartes = obtenirCartes();
    titre.textContent = `Mes cartes (${cartes.length})`;
    vide.hidden = cartes.length > 0;
    sauvegarder.disabled = cartes.length === 0;
    ordre.hidden = cartes.length < 2;
    vider(grille);
    trierCartes(cartes, ordre.value).forEach((carte) => grille.append(creerVignette(carte)));
  };
  abonnerCartes(() => { if (!element.hidden) dessiner(); });

  return { element, afficher: dessiner };
}
