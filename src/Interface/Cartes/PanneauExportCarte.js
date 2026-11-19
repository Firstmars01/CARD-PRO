/**
 * PanneauExportCarte.js
 * Boutons de téléchargement de la carte sélectionnée : images (PNG, JPG,
 * SVG) du recto et du verso, PDF, planche A4 recto-verso, PDF imprimeur
 * (fonds perdus), contact et ZIP.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { trouverPersonne } from '../../Metier/EtatApplication.js';
import { personneSelectionnee, abonnerSelection } from './SelectionCarte.js';
import {
  preparerCarte, fichierPng, fichierJpg, fichierSvg, fichierPdf, fichierPlanche, fichierImprimeur, fichierVcf, fichierZip,
} from './GenerateurFichiers.js';
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
  ['Tout (ZIP)', '.zip', fichierZip],
];

/**
 * Monte le panneau d'export.
 * @param {HTMLElement} conteneur - Zone du panneau.
 */
export function monterPanneauExportCarte(conteneur) {
  const { section, contenu } = creerSection('Télécharger la carte');
  const grille = creerElement('div', { classe: 'GrilleBoutons' }, EXPORTS.map(([libelle, extension, generer]) => {
    const bouton = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: libelle, attributs: { type: 'button' } });
    bouton.addEventListener('click', () => exporter(bouton, extension, generer));
    return bouton;
  }));
  contenu.append(grille, creerElement('p', {
    classe: 'Aide',
    texte: "Images en 300 dpi au format du modèle. Planche A4 : 2 pages, imprime en recto-verso « bord long » puis découpe le long des traits. PDF imprimeur : à envoyer à un imprimeur professionnel (3 mm de fond perdu et traits de coupe).",
  }));
  conteneur.append(section);

  const actualiser = () => { section.hidden = !trouverPersonne(personneSelectionnee()); };
  abonnerSelection(actualiser);
  actualiser();
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

