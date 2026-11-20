/**
 * DialogueSignature.js
 * Fenêtre « Signature Outlook » : aperçu de la signature de la personne,
 * choix de la couleur et du logo, bouton « Copier » (HTML + texte) et
 * guide pour la coller dans Outlook.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { reduireImage } from '../../Utilitaires/Image.js';
import { dataUrlVersOctets } from '../../Utilitaires/DataUrl.js';
import { couleurAccent, logoCarte } from '../../Metier/IdentiteVisuelle.js';
import { creerChamp } from '../Champs.js';
import { notifier } from '../Notifications.js';
import { creerSignature } from './Signature.js';

// Hauteur du logo dans la signature (pixels, ×2 pour les écrans haute densité).
const HAUTEUR_LOGO = 128;

const GUIDE = [
  ['Nouvel Outlook / Outlook sur le web', '⚙ Paramètres → Comptes → Signatures → « + Nouvelle signature » → donne un nom → colle (Ctrl + V) → Enregistrer, puis choisis-la comme signature par défaut.'],
  ['Outlook classique (Windows)', 'Fichier → Options → Courrier → Signatures… → Nouveau → donne un nom → clique dans la zone du bas et colle (Ctrl + V) → OK.'],
  ['Si le logo n’apparaît pas', 'Dans l’éditeur de signature, clique sur le bouton Image et choisis le logo téléchargé avec « Télécharger le logo ».'],
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
 * Ouvre la fenêtre de signature d'une carte.
 * @param {{nom:string, personne:object, modele:object}} carte - Carte préparée (infos d'entreprise appliquées).
 * @returns {Promise<void>}
 */
export async function ouvrirDialogueSignature(carte) {
  const logoOriginal = logoCarte(carte.modele);
  const logo = logoOriginal ? await reduireImage(logoOriginal, HAUTEUR_LOGO) : '';
  const couleur = creerElement('input', { attributs: { type: 'color', id: 'signature-couleur', value: couleurAccent(carte.modele) } });
  const avecLogo = creerElement('input', { attributs: { type: 'checkbox', id: 'signature-logo', checked: Boolean(logo), disabled: !logo } });
  const apercu = creerElement('div', { classe: 'Signature-apercu', attributs: { 'aria-label': 'Aperçu de la signature' } });
  let signature = null;

  const dessiner = () => {
    vider(apercu);
    signature = creerSignature(carte.personne, { couleur: couleur.value, logo: avecLogo.checked ? logo : '' });
    apercu.append(signature);
  };
  couleur.addEventListener('input', dessiner);
  avecLogo.addEventListener('change', dessiner);
  dessiner();

  const copier = creerElement('button', { classe: 'Bouton Bouton--principal', texte: 'Copier la signature', attributs: { type: 'button' } });
  copier.addEventListener('click', async () => {
    try {
      await copierSignature(signature);
      notifier('Signature copiée : colle-la dans Outlook (Ctrl + V).', 'succes');
    } catch (erreur) {
      notifier(erreur.message || 'Copie impossible.', 'erreur');
    }
  });
  const telechargerLogo = creerElement('button', {
    classe: 'Bouton Bouton--secondaire', texte: 'Télécharger le logo', attributs: { type: 'button', disabled: !logo },
    surClic: () => telechargerBlob(new Blob([dataUrlVersOctets(logo).octets], { type: 'image/png' }), `${carte.nom}-logo-signature.png`),
  });
  const fermer = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: 'Fermer', attributs: { type: 'button' } });

  const dialogue = creerElement('dialog', { classe: 'ImportCarte', attributs: { 'aria-label': 'Signature Outlook' } }, [
    creerElement('h2', { classe: 'Transfert-titre', texte: 'Signature Outlook' }),
    apercu,
    creerElement('div', { classe: 'Choix-ligne' }, [
      creerChamp('Couleur', couleur).bloc,
      creerElement('label', { classe: 'Choix' }, [avecLogo, creerElement('span', { texte: logo ? 'Afficher le logo' : 'Pas de logo sur cette carte' })]),
    ]),
    creerElement('ol', { classe: 'Signature-guide' }, GUIDE.map(([titre, texte]) => creerElement('li', {}, [creerElement('strong', { texte: `${titre} : ` }), texte]))),
    creerElement('div', { classe: 'Transfert-actions' }, [fermer, telechargerLogo, copier]),
  ]);
  fermer.addEventListener('click', () => dialogue.close());
  dialogue.addEventListener('close', () => dialogue.remove());
  document.body.append(dialogue);
  dialogue.showModal();
}
