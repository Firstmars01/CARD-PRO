/**
 * PanneauExportCarte.js
 * Boutons de téléchargement de la carte sélectionnée : images (PNG, JPG,
 * SVG) du recto et du verso, PDF, planche A4 recto-verso, PDF imprimeur
 * (fonds perdus), contact et ZIP ; fond Teams / Zoom ; et section « Portefeuille mobile » (QR
 * animé à scanner, GIF pour e-mail, fichier .cardpro).
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { trouverPersonne } from '../../Metier/EtatApplication.js';
import { personneSelectionnee, abonnerSelection } from './SelectionCarte.js';
import {
  preparerCarte, fichierPng, fichierJpg, fichierSvg, fichierPdf, fichierPlanche, fichierImprimeur, fichierVcf, fichierZip,
  fichierCardpro, fichierGifPortefeuille,
} from './GenerateurFichiers.js';
import { ouvrirAffichageTransfert } from './AffichageTransfert.js';
import { fichierFondVisio } from '../Rendu/RenduFondVisio.js';
import { creerSection } from '../Champs.js';
import { notifier } from '../Notifications.js';

// Boutons : [libellé, extension du fichier, fonction de génération].
const EXPORTS = [
  ['Recto PNG', '-recto.png', (c) => fichierPng(c, 'recto')],
  ['Verso PNG', '-verso.png', (c) => fichierPng(c, 'verso')],
  ['Recto JPG', '-recto.jpg', (c) => fichierJpg(c, 'recto')],
  ['Verso JPG', '-verso.jpg', (c) => fichierJpg(c, 'verso')],
  ['Recto SVG', '-recto.svg', (c) => fichierSvg(c, 'recto')],
  ['Verso SVG', '-verso.svg', (c) => fichierSvg(c, 'verso')],
  ['PDF recto + verso', '.pdf', fichierPdf],
  ['Planche A4', '-planche-a4.pdf', fichierPlanche],
  ['PDF imprimeur (fonds perdus)', '-imprimeur.pdf', fichierImprimeur],
  ['Contact (.vcf)', '.vcf', fichierVcf],
  ['Kit complet (ZIP)', '-kit.zip', fichierZip],
];

// Boutons du portefeuille mobile (même format).
const EXPORTS_PORTEFEUILLE = [
  ['GIF pour e-mail', '-portefeuille.gif', fichierGifPortefeuille],
  ['Fichier .cardpro', '.cardpro', fichierCardpro],
];

/**
 * Crée les boutons de téléchargement d'une liste d'exports.
 * @param {Array<[string, string, Function]>} exports - [libellé, extension, génération].
 * @returns {HTMLButtonElement[]} Boutons.
 */
function creerBoutons(exports) {
  return exports.map(([libelle, extension, generer]) => {
    const bouton = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: libelle, attributs: { type: 'button' } });
    bouton.addEventListener('click', () => exporter(bouton, extension, generer));
    return bouton;
  });
}

/**
 * Monte le panneau d'export.
 * @param {HTMLElement} conteneur - Zone du panneau.
 */
export function monterPanneauExportCarte(conteneur) {
  const { section, contenu } = creerSection('Télécharger la carte');
  const grille = creerElement('div', { classe: 'GrilleBoutons' }, creerBoutons(EXPORTS));
  contenu.append(grille, creerElement('p', {
    classe: 'Aide',
    texte: "Images en 300 dpi au format du modèle. Planche A4 : 2 pages, imprime en recto-verso « bord long » puis découpe le long des traits. PDF imprimeur : à envoyer à un imprimeur professionnel (3 mm de fond perdu et traits de coupe).",
  }));
  const portefeuille = creerSectionPortefeuille();
  const visio = creerSectionSignatureVisio();
  conteneur.append(section, visio, portefeuille);

  const actualiser = () => {
    const absente = !trouverPersonne(personneSelectionnee());
    [section, visio, portefeuille].forEach((s) => { s.hidden = absente; });
  };
  abonnerSelection(actualiser);
  actualiser();
}

/**
 * Crée la section « Visio » (fond Teams / Zoom).
 * @returns {HTMLElement} Section.
 */
function creerSectionSignatureVisio() {
  const { section, contenu } = creerSection('Fond Teams / Zoom');
  contenu.append(
    creerElement('div', { classe: 'GrilleBoutons' }, creerBoutons([['Fond Teams / Zoom (PNG)', '-fond-visio.png', fichierFondVisio]])),
    creerElement('p', {
      classe: 'Aide',
      texte: "Image 1920 × 1080 aux couleurs de la carte (Teams : Effets d'arrière-plan → Ajouter nouveau ; Zoom : Arrière-plan virtuel → +).",
    }),
  );
  return section;
}

/**
 * Crée la section « Portefeuille mobile ».
 * @returns {HTMLElement} Section.
 */
function creerSectionPortefeuille() {
  const { section, contenu } = creerSection('Portefeuille mobile');
  const afficher = creerElement('button', { classe: 'Bouton Bouton--principal', texte: 'Afficher le QR animé', attributs: { type: 'button' } });
  afficher.addEventListener('click', async () => {
    const entree = trouverPersonne(personneSelectionnee());
    if (!entree) return;
    afficher.disabled = true;
    try {
      await ouvrirAffichageTransfert(preparerCarte(entree));
    } catch (erreur) {
      notifier(erreur.message || 'Affichage impossible.', 'erreur');
    } finally {
      afficher.disabled = false;
    }
  });
  contenu.append(
    creerElement('div', { classe: 'GrilleBoutons' }, [afficher, ...creerBoutons(EXPORTS_PORTEFEUILLE)]),
    creerElement('p', {
      classe: 'Aide',
      texte: "La carte complète (recto, verso, infos) passe dans l'application Card Pro Portefeuille : la personne scanne le QR animé, ou ouvre le GIF ou le fichier .cardpro reçu par e-mail. Ce QR est différent de celui imprimé sur la carte.",
    }),
  );
  return section;
}

/**
 * Génère et télécharge un fichier de la carte sélectionnée.
 * @param {HTMLButtonElement} bouton - Bouton cliqué.
 * @param {string} extension - Fin du nom de fichier.
 * @param {Function} generer - Fonction de génération.
 */
async function exporter(bouton, extension, generer) {
  const entree = trouverPersonne(personneSelectionnee());
  if (!entree) return;
  bouton.disabled = true;
  try {
    const carte = preparerCarte(entree);
    telechargerBlob(await generer(carte), `${carte.nom}${extension}`);
  } catch (erreur) {
    notifier(erreur.message || 'Export impossible.', 'erreur');
  } finally {
    bouton.disabled = false;
  }
}

