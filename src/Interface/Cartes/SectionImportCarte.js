/**
 * SectionImportCarte.js
 * Section « Importer une carte » : ajoute une personne (et éventuellement
 * le design de sa carte) à partir d'un fichier .drawcard ou du GIF de
 * portefeuille. Le fichier est entièrement revalidé avant import.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { lirePaquet, extrairePaquet, TAILLE_MAX_PAQUET } from '../../Metier/PaquetCarte.js';
import { nomComplet } from '../../Metier/Personne.js';
import {
  obtenirEtat, enregistrerModele, ajouterPersonneRemplie, remplacerPersonne,
} from '../../Metier/EtatApplication.js';
import { creerChamp, creerSection } from '../Champs.js';
import { notifier } from '../Notifications.js';
import { selectionnerPersonne } from './SelectionCarte.js';
import { demanderChoixImport } from './DialogueImportCarte.js';

const POIDS_MAX = 20 * 1024 * 1024; // Un GIF contient aussi les images du QR animé

/**
 * Clé d'identité d'une personne (prénom, nom, e-mail), sans majuscules ni espaces.
 * @param {object} personne - Personne normalisée.
 * @returns {string} Clé, vide si la personne n'a ni nom ni e-mail.
 */
function cleIdentite(personne) {
  if (!personne.nom && !personne.email) return '';
  return [personne.prenom, personne.nom, personne.email].map((v) => String(v || '').trim().toLowerCase()).join('|');
}

/**
 * Cherche une personne déjà présente avec la même identité.
 * @param {object} personne - Personne importée.
 * @returns {object|null} Entrée existante, ou null.
 */
function trouverDoublon(personne) {
  const cle = cleIdentite(personne);
  return cle ? obtenirEtat().personnes.find((e) => cleIdentite(e.personne) === cle) || null : null;
}

/**
 * Importe le fichier choisi, après les choix de la personne.
 * @param {File} fichier - Fichier .drawcard ou GIF.
 */
async function importer(fichier) {
  if (fichier.size > POIDS_MAX) throw new Error('Fichier trop volumineux.');
  const paquet = extrairePaquet(new Uint8Array(await fichier.arrayBuffer()));
  if (paquet.length > TAILLE_MAX_PAQUET) throw new Error('Carte trop volumineuse.');
  const carte = await lirePaquet(paquet);
  const doublon = trouverDoublon(carte.personne);
  const choix = await demanderChoixImport(carte, doublon);
  if (!choix) return;

  let { modeleId } = choix;
  if (choix.modele === 'nouveau') {
    const nom = `${carte.modele.nom} (importé)`.slice(0, 50);
    modeleId = (await enregistrerModele({ ...carte.modele, nom })).id;
  }
  let id;
  if (choix.personne === 'maj' && doublon) {
    await remplacerPersonne(doublon.id, carte.personne, modeleId);
    id = doublon.id;
  } else {
    id = (await ajouterPersonneRemplie(carte.personne, modeleId)).id;
  }
  selectionnerPersonne(id);
  notifier(`Carte de ${nomComplet(carte.personne) || 'la personne'} importée.`, 'succes');
}

/**
 * Monte la section d'import d'une carte.
 * @param {HTMLElement} conteneur - Zone d'accueil.
 */
export function monterSectionImportCarte(conteneur) {
  const { section, contenu } = creerSection('Importer une carte (.drawcard / GIF)', false);
  const fichier = creerElement('input', { attributs: { type: 'file', id: 'import-carte', accept: '.drawcard,.cardpro,.gif,image/gif,application/octet-stream' } });
  fichier.addEventListener('change', async () => {
    const [choisi] = fichier.files;
    fichier.value = '';
    if (!choisi) return;
    try {
      await importer(choisi);
    } catch (erreur) {
      notifier(erreur.message || 'Import impossible.', 'erreur');
    }
  });
  contenu.append(
    creerElement('p', { classe: 'Aide', texte: "Ajoute une personne à partir d'un fichier .drawcard ou du GIF de portefeuille. Tu choisis ensuite le design : nouveau modèle à partir de la carte, ou un de tes modèles." }),
    creerChamp('Fichier de la carte', fichier).bloc,
  );
  conteneur.append(section);
}
