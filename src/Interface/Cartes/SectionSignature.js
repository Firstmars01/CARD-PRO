/**
 * SectionSignature.js
 * Section « Signature e-mail » du volet de droite (onglet Cartes) : aperçu de
 * la signature de la carte sélectionnée, réglages simples (couleurs, police,
 * image, icônes, infos, réseaux, texte libre), copie pour Outlook et guide.
 * Les réglages sont partagés par toutes les cartes d'une entreprise, ou
 * propres à la carte en réglage personnalisé ; ils sont enregistrés tout seuls.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { dataUrlVersOctets } from '../../Utilitaires/DataUrl.js';
import { SCHEMA_SIGNATURE, normaliserReglagesSignature } from '../../Metier/ReglagesSignature.js';
import {
  abonner, trouverPersonne, trouverEntreprise, modifierPersonne, enregistrerEntreprise, obtenirEtat,
} from '../../Metier/EtatApplication.js';
import { creerSection } from '../Champs.js';
import { notifier } from '../Notifications.js';
import { creerFormulaireSchema } from '../Modeles/ControlesSchema.js';
import { personneSelectionnee, abonnerSelection } from './SelectionCarte.js';
import { preparerCarte } from './GenerateurFichiers.js';
import {
  reglagesDe, preparerImages, imagesSignature, signatureCarte,
} from './GenerateurSignature.js';

const DELAI_ENREGISTREMENT = 600;

const GUIDE = [
  ['Nouvel Outlook / Outlook sur le web', 'Paramètres (roue dentée) → Comptes → Signatures → « + Nouvelle signature » → donne un nom → colle (Ctrl + V) → Enregistrer, puis choisis-la comme signature par défaut.'],
  ['Outlook classique (Windows)', 'Fichier → Options → Courrier → Signatures… → Nouveau → donne un nom → clique dans la zone du bas et colle (Ctrl + V) → OK.'],
  ['Si une image n’apparaît pas', 'Dans l’éditeur de signature, clique sur le bouton Image et choisis l’image téléchargée avec « Télécharger les images ».'],
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
 * Monte la section « Signature e-mail ».
 * @param {HTMLElement} conteneur - Zone de la section (volet de droite).
 */
export function monterSectionSignature(conteneur) {
  const { section, contenu } = creerSection('Signature e-mail (Outlook)', false);
  conteneur.append(section);
  let etat = null; // { id, entrepriseId, reglages, images, formulaire, apercu }
  let minuterie = null;
  let enregistrementEnCours = false;
  let tour = 0;

  // Redessine l'aperçu avec les réglages en cours.
  const dessiner = async () => {
    if (!etat) return;
    tour += 1;
    const monTour = tour;
    const entree = trouverPersonne(etat.id);
    if (!entree) return;
    const signature = await signatureCarte(preparerCarte(entree), etat.reglages, etat.images);
    if (monTour !== tour || !etat) return;
    etat.signature = signature;
    vider(etat.apercu);
    etat.apercu.append(etat.signature);
  };

  // Enregistre les réglages (entreprise ou carte), regroupés pendant la saisie.
  const enregistrer = () => {
    clearTimeout(minuterie);
    const { id, entrepriseId, reglages } = etat;
    minuterie = setTimeout(async () => {
      try {
        const entreprise = trouverEntreprise(entrepriseId);
        enregistrementEnCours = true;
        if (entreprise) await enregistrerEntreprise({ ...entreprise, signature: reglages });
        else modifierPersonne(id, { personne: { ...trouverPersonne(id).personne, signature: reglages } });
      } catch (erreur) {
        notifier(erreur.message || 'Enregistrement de la signature impossible.', 'erreur');
      } finally {
        enregistrementEnCours = false;
      }
    }, DELAI_ENREGISTREMENT);
  };

  // Reconstruit la section pour la carte sélectionnée.
  const construire = async () => {
    vider(contenu);
    etat = null;
    const entree = trouverPersonne(personneSelectionnee());
    section.hidden = !entree;
    if (!entree) return;
    const entreprise = trouverEntreprise(entree.entrepriseId);
    const partagees = entreprise ? obtenirEtat().personnes.filter((p) => p.entrepriseId === entreprise.id).length : 1;
    const apercu = creerElement('div', { classe: 'Signature-apercu', attributs: { 'aria-label': 'Aperçu de la signature' } });
    const images = await preparerImages(preparerCarte(entree), entreprise);
    if (trouverPersonne(personneSelectionnee()) !== entree) return; // Sélection changée entre-temps.
    etat = { id: entree.id, entrepriseId: entree.entrepriseId, photo: entree.personne.photo, reglages: reglagesDe(entree), images, apercu };

    const formulaire = creerFormulaireSchema(SCHEMA_SIGNATURE, etat.reglages, {
      surChangement: (cle, valeur) => {
        etat.reglages = normaliserReglagesSignature({ ...etat.reglages, [cle]: valeur });
        formulaire.actualiser(etat.reglages);
        dessiner();
        enregistrer();
      },
      avantModification: () => {},
    });
    const copier = creerElement('button', {
      classe: 'Bouton Bouton--principal', texte: 'Copier la signature', attributs: { type: 'button' },
      surClic: async () => {
        try {
          await copierSignature(etat.signature);
          notifier('Signature copiée : colle-la dans Outlook (Ctrl + V).', 'succes');
        } catch (erreur) {
          notifier(erreur.message || 'Copie impossible.', 'erreur');
        }
      },
    });
    const telechargerImage = creerElement('button', {
      classe: 'Bouton Bouton--secondaire', texte: 'Télécharger les images', attributs: { type: 'button' },
      surClic: () => {
        // Télécharge chaque image affichée (photo et / ou logo).
        const { image, imageDroite } = imagesSignature(etat.reglages.image, etat.images);
        [image, imageDroite].filter(Boolean).forEach((source, i) => {
          telechargerBlob(new Blob([dataUrlVersOctets(source).octets], { type: 'image/png' }), `signature-image-${i + 1}.png`);
        });
      },
    });
    const guide = creerElement('details', { classe: 'Signature-guide' }, [
      creerElement('summary', { texte: 'Comment la mettre dans Outlook ?' }),
      creerElement('ol', {}, GUIDE.map(([titre, texte]) => creerElement('li', {}, [creerElement('strong', { texte: `${titre} : ` }), texte]))),
    ]);
    contenu.append(creerElement('div', { classe: 'Signature' }, [
      creerElement('p', {
        classe: 'Aide',
        texte: entreprise
          ? `Réglages communs aux ${partagees} carte(s) de « ${entreprise.nom} ».`
          : 'Réglages propres à cette carte (réglage personnalisé).',
      }),
      apercu,
      creerElement('div', { classe: 'GrilleBoutons' }, [copier, telechargerImage]),
      guide,
      formulaire.element,
    ]));
    await dessiner();
  };

  // Photo de profil changée : on prépare de nouveau les images, puis on redessine.
  const actualiserImages = async (entree) => {
    etat.photo = entree.personne.photo;
    const images = await preparerImages(preparerCarte(entree), trouverEntreprise(entree.entrepriseId));
    if (!etat || etat.id !== entree.id) return;
    etat.images = images;
    dessiner();
  };

  abonnerSelection(construire);
  abonner((type, id) => {
    if (!etat) return;
    const entree = trouverPersonne(etat.id);
    // Carte reliée / détachée, ou entreprise modifiée ailleurs : on reconstruit.
    if (type === 'entreprises' && !enregistrementEnCours) construire();
    else if (type === 'personne' && id === etat.id && entree && entree.entrepriseId !== etat.entrepriseId) construire();
    else if (type === 'personne' && id === etat.id && entree && entree.personne.photo !== etat.photo) actualiserImages(entree);
    else if ((type === 'personne' && id === etat.id) || type === 'personnes') dessiner();
  });
  construire();
}
