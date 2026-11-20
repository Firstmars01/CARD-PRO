/**
 * DialogueSignature.js
 * Fenêtre « Signature Outlook » : aperçu de la signature de la personne,
 * choix de la couleur, de l'image (photo de profil ronde, logo ou aucune)
 * et des icônes devant les infos, bouton « Copier » (HTML + texte) et
 * guide pour la coller dans Outlook.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { reduireImage, decouperEnRond } from '../../Utilitaires/Image.js';
import { iconesPng } from '../Rendu/IconesPng.js';
import { dataUrlVersOctets } from '../../Utilitaires/DataUrl.js';
import { couleurAccent, logoCarte } from '../../Metier/IdentiteVisuelle.js';
import { creerChamp } from '../Champs.js';
import { notifier } from '../Notifications.js';
import { creerSignature, ICONES_SIGNATURE } from './Signature.js';

// Tailles des images (pixels, ×2 pour les écrans haute densité).
const HAUTEUR_LOGO = 144;
const TAILLE_PHOTO = 144;
const TAILLE_ICONE = 28;

const GUIDE = [
  ['Nouvel Outlook / Outlook sur le web', '⚙ Paramètres → Comptes → Signatures → « + Nouvelle signature » → donne un nom → colle (Ctrl + V) → Enregistrer, puis choisis-la comme signature par défaut.'],
  ['Outlook classique (Windows)', 'Fichier → Options → Courrier → Signatures… → Nouveau → donne un nom → clique dans la zone du bas et colle (Ctrl + V) → OK.'],
  ['Si une image n’apparaît pas', 'Dans l’éditeur de signature, clique sur le bouton Image et choisis l’image téléchargée avec « Télécharger l’image ».'],
];

/**
 * Copie la signature dans le presse-papiers (HTML pour Outlook, texte en secours).
 * @param {HTMLElement} signature - Signature affichée.
 * @returns {Promise<void>}
 */
async function copierSignature(signature) {
  const html = `<!DOCTYPE html><html><body>${signature.outerHTML}</body></html>`;
  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([signature.innerText], { type: 'text/plain' }),
    })]);
    return;
  }
  // Secours : copie de la sélection affichée.
  const selection = window.getSelection();
  const plage = document.createRange();
  plage.selectNode(signature);
  selection.removeAllRanges();
  selection.addRange(plage);
  const ok = document.execCommand('copy');
  selection.removeAllRanges();
  if (!ok) throw new Error('Copie impossible : sélectionne la signature et fais Ctrl + C.');
}

/**
 * Prépare les images possibles à gauche de la signature.
 * @param {{personne:object, modele:object}} carte - Carte préparée.
 * @returns {Promise<{photo:string, logo:string}>} Photo ronde et logo réduits ('' si absents).
 */
async function preparerImages(carte) {
  const logoOriginal = logoCarte(carte.modele);
  const [photo, logo] = await Promise.all([
    carte.personne.photo ? decouperEnRond(carte.personne.photo, TAILLE_PHOTO) : '',
    logoOriginal ? reduireImage(logoOriginal, HAUTEUR_LOGO) : '',
  ]);
  return { photo, logo };
}

/**
 * Ouvre la fenêtre de signature d'une carte.
 * @param {{nom:string, personne:object, modele:object}} carte - Carte préparée (infos d'entreprise appliquées).
 * @returns {Promise<void>}
 */
export async function ouvrirDialogueSignature(carte) {
  const images = await preparerImages(carte);
  const couleur = creerElement('input', { attributs: { type: 'color', id: 'signature-couleur', value: couleurAccent(carte.modele) } });
  const choixImage = creerElement('select', { attributs: { id: 'signature-image' } }, [
    images.photo && creerElement('option', { texte: 'Photo de profil', attributs: { value: 'photo' } }),
    images.logo && creerElement('option', { texte: 'Logo', attributs: { value: 'logo' } }),
    creerElement('option', { texte: 'Aucune image', attributs: { value: '' } }),
  ]);
  const avecIcones = creerElement('input', { attributs: { type: 'checkbox', id: 'signature-icones', checked: true } });
  const apercu = creerElement('div', { classe: 'Signature-apercu', attributs: { 'aria-label': 'Aperçu de la signature' } });
  let signature = null;
  let tour = 0;

  // Redessine la signature (les icônes sont recalculées à la couleur choisie).
  const dessiner = async () => {
    tour += 1;
    const monTour = tour;
    const icones = avecIcones.checked ? await iconesPng(Object.values(ICONES_SIGNATURE), couleur.value, TAILLE_ICONE) : {};
    if (monTour !== tour) return; // Un autre changement est arrivé entre-temps.
    vider(apercu);
    signature = creerSignature(carte.personne, { couleur: couleur.value, image: images[choixImage.value] || '', icones });
    apercu.append(signature);
  };
  [couleur, choixImage, avecIcones].forEach((c) => c.addEventListener(c === couleur ? 'input' : 'change', dessiner));
  await dessiner();

  const copier = creerElement('button', { classe: 'Bouton Bouton--principal', texte: 'Copier la signature', attributs: { type: 'button' } });
  copier.addEventListener('click', async () => {
    try {
      await copierSignature(signature);
      notifier('Signature copiée : colle-la dans Outlook (Ctrl + V).', 'succes');
    } catch (erreur) {
      notifier(erreur.message || 'Copie impossible.', 'erreur');
    }
  });
  const telechargerImage = creerElement('button', {
    classe: 'Bouton Bouton--secondaire', texte: "Télécharger l'image", attributs: { type: 'button' },
    surClic: () => {
      const image = images[choixImage.value];
      if (!image) return;
      telechargerBlob(new Blob([dataUrlVersOctets(image).octets], { type: 'image/png' }), `${carte.nom}-${choixImage.value}-signature.png`);
    },
  });
  const fermer = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: 'Fermer', attributs: { type: 'button' } });

  const dialogue = creerElement('dialog', { classe: 'ImportCarte', attributs: { 'aria-label': 'Signature Outlook' } }, [
    creerElement('h2', { classe: 'Transfert-titre', texte: 'Signature Outlook' }),
    apercu,
    creerElement('div', { classe: 'Choix-ligne' }, [
      creerChamp('Couleur', couleur).bloc,
      creerChamp('Image à gauche', choixImage).bloc,
      creerElement('label', { classe: 'Choix' }, [avecIcones, creerElement('span', { texte: 'Icônes devant les infos' })]),
    ]),
    creerElement('ol', { classe: 'Signature-guide' }, GUIDE.map(([titre, texte]) => creerElement('li', {}, [creerElement('strong', { texte: `${titre} : ` }), texte]))),
    creerElement('div', { classe: 'Transfert-actions' }, [fermer, telechargerImage, copier]),
  ]);
  fermer.addEventListener('click', () => dialogue.close());
  dialogue.addEventListener('close', () => dialogue.remove());
  document.body.append(dialogue);
  dialogue.showModal();
}
