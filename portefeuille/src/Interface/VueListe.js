/**
 * VueListe.js
 * Écran d'accueil : la liste des cartes du portefeuille, avec les boutons
 * « Scanner » (QR animé) et « Importer » (GIF ou .cardpro reçu par e-mail).
 */

import { creerElement, vider } from '../../../src/Utilitaires/Dom.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { obtenirCartes, abonnerCartes, importerFichier, titreCarte } from '../Metier/Portefeuille.js';
import { dessinerFace } from './RenduCarte.js';
import { allerA } from './Navigation.js';

/**
 * Importe les fichiers choisis puis ouvre la dernière carte ajoutée.
 * @param {File[]} fichiers - Fichiers à importer.
 */
export async function importerFichiers(fichiers) {
  let derniere = null;
  for (const fichier of fichiers) {
    try {
      derniere = await importerFichier(fichier);
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
  const vignette = creerElement('button', { classe: 'Vignette', attributs: { type: 'button' } }, [
    dessinerFace(carte, 'recto'),
    creerElement('span', { classe: 'Vignette-nom', texte: titreCarte(carte) }),
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
    attributs: { type: 'file', accept: '.cardpro,.gif,image/gif,application/octet-stream', multiple: true, hidden: true },
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

  const titre = creerElement('h2', { classe: 'Titre-ecran' });
  const grille = creerElement('div', { classe: 'Grille' });
  const vide = creerElement('div', { classe: 'Vide' }, [
    creerElement('p', { texte: 'Aucune carte pour le moment.' }),
    creerElement('p', {
      classe: 'Astuce',
      texte: "Scanne le QR animé affiché par les RH, ou importe le GIF / le fichier .cardpro reçu par e-mail (sur Android : « Partager » → Card Pro).",
    }),
  ]);
  const element = creerElement('section', { classe: 'Ecran', attributs: { 'aria-label': 'Mes cartes' } }, [
    creerElement('div', { classe: 'Actions' }, [scanner, importer, entree]),
    titre,
    vide,
    grille,
  ]);

  const dessiner = () => {
    const cartes = obtenirCartes();
    titre.textContent = `Mes cartes (${cartes.length})`;
    vide.hidden = cartes.length > 0;
    vider(grille);
    cartes.forEach((carte) => grille.append(creerVignette(carte)));
  };
  abonnerCartes(() => { if (!element.hidden) dessiner(); });

  return { element, afficher: dessiner };
}
