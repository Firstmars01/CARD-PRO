/**
 * AffichageTransfert.js
 * Fenêtre plein écran qui affiche le QR code animé d'une carte : le téléphone
 * (application « Card Pro Portefeuille ») le scanne pour récupérer la carte
 * complète, recto et verso compris. Si l'adresse de l'appli est réglée
 * (LIEN_PORTEFEUILLE), un second QR code permet d'abord de l'installer.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { preparerTransfert, fichierGifPortefeuille, fichierCardpro } from './GenerateurFichiers.js';
import { notifier } from '../Notifications.js';
import { lireConfiguration } from '../../Donnees/DepotConfiguration.js';
import { creerQrLien } from '../Rendu/QrLien.js';

const DELAI_IMAGE = 200; // Millisecondes par QR code (5 par seconde)
const MARGE_MODULES = 4;

/**
 * Dessine un QR code sur un canvas, à la plus grande taille possible.
 * @param {HTMLCanvasElement} canvas - Canvas carré.
 * @param {{taille:number, modules:boolean[][]}} qr - QR code.
 */
function dessinerQr(canvas, qr) {
  const contexte = canvas.getContext('2d');
  const total = qr.taille + 2 * MARGE_MODULES;
  const module = Math.floor(canvas.width / total);
  const decalage = Math.floor((canvas.width - module * total) / 2) + MARGE_MODULES * module;
  contexte.fillStyle = '#ffffff';
  contexte.fillRect(0, 0, canvas.width, canvas.height);
  contexte.fillStyle = '#000000';
  for (let y = 0; y < qr.taille; y++) {
    for (let x = 0; x < qr.taille; x++) {
      if (qr.modules[y][x]) contexte.fillRect(decalage + x * module, decalage + y * module, module, module);
    }
  }
}

/**
 * Crée un bouton qui télécharge un fichier généré.
 * @param {string} libelle - Texte du bouton.
 * @param {() => Promise<Blob>} generer - Génération du fichier.
 * @param {string} nomFichier - Nom du fichier téléchargé.
 * @returns {HTMLButtonElement} Bouton.
 */
function boutonTelechargement(libelle, generer, nomFichier) {
  const bouton = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: libelle, attributs: { type: 'button' } });
  bouton.addEventListener('click', async () => {
    bouton.disabled = true;
    try {
      telechargerBlob(await generer(), nomFichier);
    } catch (erreur) {
      notifier(erreur.message || 'Téléchargement impossible.', 'erreur');
    } finally {
      bouton.disabled = false;
    }
  });
  return bouton;
}

/**
 * Ouvre la fenêtre du QR animé pour une carte.
 * @param {object} carte - Carte préparée (voir preparerCarte).
 */
export async function ouvrirAffichageTransfert(carte) {
  const [{ qrs }, { lienPortefeuille }] = await Promise.all([preparerTransfert(carte), lireConfiguration()]);
  const canvas = creerElement('canvas', { classe: 'Transfert-qr', attributs: { width: 900, height: 900, 'aria-label': 'QR code animé de la carte' } });
  const compteur = creerElement('p', { classe: 'Transfert-compteur', attributs: { 'aria-live': 'off' } });
  const fermer = creerElement('button', { classe: 'Bouton Bouton--principal', texte: 'Fermer', attributs: { type: 'button' } });
  const dialogue = creerElement('dialog', { classe: 'Transfert', attributs: { 'aria-label': 'Transfert vers le portefeuille mobile' } }, [
    creerElement('h2', { classe: 'Transfert-titre', texte: `Portefeuille mobile : ${carte.personne.prenom} ${carte.personne.nom}`.trim() }),
    creerElement('div', { classe: 'Transfert-etapes' }, [
      lienPortefeuille && creerElement('div', { classe: 'Transfert-etape Transfert-etape--installation' }, [
        creerElement('h3', { texte: "1. Installer l'appli" }),
        creerQrLien(lienPortefeuille, "QR code d'installation de l'appli Card Pro"),
        creerElement('p', { classe: 'Aide', texte: "Scanne avec l'appareil photo du téléphone, puis installe Card Pro." }),
      ]),
      creerElement('div', { classe: 'Transfert-etape' }, [
        creerElement('h3', { texte: lienPortefeuille ? '2. Scanner la carte' : 'Scanner la carte' }),
        canvas,
        compteur,
        creerElement('p', {
          classe: 'Aide',
          texte: `Dans l'appli Card Pro : « Scanner un QR », puis vise ce QR code jusqu'à 100 %. ${qrs.length} QR code(s) défilent en boucle, dans n'importe quel ordre.`,
        }),
      ]),
    ]),
    creerElement('div', { classe: 'Transfert-actions' }, [
      boutonTelechargement('GIF pour e-mail', () => fichierGifPortefeuille(carte), `${carte.nom}-portefeuille.gif`),
      boutonTelechargement('Fichier .cardpro', () => fichierCardpro(carte), `${carte.nom}.cardpro`),
      fermer,
    ]),
  ]);

  // Animation : un QR code toutes les DELAI_IMAGE millisecondes.
  let index = 0;
  const afficher = () => {
    dessinerQr(canvas, qrs[index]);
    compteur.textContent = `QR ${index + 1} / ${qrs.length}`;
    index = (index + 1) % qrs.length;
  };
  afficher();
  const minuterie = qrs.length > 1 ? setInterval(afficher, DELAI_IMAGE) : null;

  dialogue.addEventListener('close', () => {
    clearInterval(minuterie);
    dialogue.remove();
  });
  fermer.addEventListener('click', () => dialogue.close());
  document.body.append(dialogue);
  dialogue.showModal();
}
