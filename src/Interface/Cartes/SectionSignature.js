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
import { reduireImage, decouperEnRond } from '../../Utilitaires/Image.js';
import { dataUrlVersOctets } from '../../Utilitaires/DataUrl.js';
import { couleurAccent, couleurNomCarte, logoCarte } from '../../Metier/IdentiteVisuelle.js';
import {
  SCHEMA_SIGNATURE, normaliserReglagesSignature, policeSignature, tailleSignature,
} from '../../Metier/ReglagesSignature.js';
import {
  abonner, trouverPersonne, trouverEntreprise, modifierPersonne, enregistrerEntreprise, obtenirEtat,
} from '../../Metier/EtatApplication.js';
import { creerSection } from '../Champs.js';
import { notifier } from '../Notifications.js';
import { creerFormulaireSchema } from '../Modeles/ControlesSchema.js';
import { iconesPng } from '../Rendu/IconesPng.js';
import { personneSelectionnee, abonnerSelection } from './SelectionCarte.js';
import { preparerCarte } from './GenerateurFichiers.js';
import { creerSignature, ICONES_SIGNATURE } from './Signature.js';

// Images en double résolution (écrans haute densité) ; icônes en 28 px.
const HAUTEUR_IMAGE_MAX = 280;
const TAILLE_ICONE = 28;
const DELAI_ENREGISTREMENT = 600;

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
 * @param {object|null} entreprise - Entreprise reliée (son logo passe en premier).
 * @returns {Promise<{photo:string, logo:string}>} Photo ronde et logo réduits ('' si absents).
 */
async function preparerImages(carte, entreprise) {
  const logo = entreprise?.logo || logoCarte(carte.modele);
  const [photo, logoReduit] = await Promise.all([
    carte.personne.photo ? decouperEnRond(carte.personne.photo, HAUTEUR_IMAGE_MAX) : '',
    logo ? reduireImage(logo, HAUTEUR_IMAGE_MAX) : '',
  ]);
  return { photo, logo: logoReduit };
}

/**
 * Réglages de signature de la carte : ceux de son entreprise, sinon les siens.
 * @param {object} entree - Carte.
 * @returns {object} Réglages.
 */
function reglagesDe(entree) {
  return trouverEntreprise(entree.entrepriseId)?.signature || entree.personne.signature;
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
  const cacheIcones = new Map(); // Couleur → icônes PNG (évite de les redessiner à chaque frappe).

  // Redessine l'aperçu avec les réglages en cours.
  const dessiner = async () => {
    if (!etat) return;
    tour += 1;
    const monTour = tour;
    const entree = trouverPersonne(etat.id);
    if (!entree) return;
    const carte = preparerCarte(entree);
    const r = etat.reglages;
    const couleur = r.couleursCarte ? couleurAccent(carte.modele) : r.couleur;
    if (!cacheIcones.has(couleur)) cacheIcones.set(couleur, await iconesPng([...new Set(Object.values(ICONES_SIGNATURE))], couleur, TAILLE_ICONE));
    const icones = cacheIcones.get(couleur);
    if (monTour !== tour || !etat) return;
    etat.signature = creerSignature(carte.personne, {
      ...r,
      couleur,
      couleurTexte: r.couleursCarte ? couleurNomCarte(carte.modele) : r.couleurTexte,
      police: policeSignature(r.police),
      tailles: tailleSignature(r.taille),
      image: r.image === 'aucune' ? '' : etat.images[r.image] || '',
      icones: r.icones ? icones : Object.fromEntries(Object.entries(icones).filter(([cle]) => !['entreprise', 'mobile', 'telephone', 'email', 'web', 'adresse'].includes(cle))),
    });
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
    etat = { id: entree.id, entrepriseId: entree.entrepriseId, reglages: reglagesDe(entree), images, apercu };

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
      classe: 'Bouton Bouton--secondaire', texte: "Télécharger l'image", attributs: { type: 'button' },
      surClic: () => {
        const image = etat.images[etat.reglages.image];
        if (!image) return;
        telechargerBlob(new Blob([dataUrlVersOctets(image).octets], { type: 'image/png' }), `signature-${etat.reglages.image}.png`);
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

  abonnerSelection(construire);
  abonner((type, id) => {
    if (!etat) return;
    const entree = trouverPersonne(etat.id);
    // Carte reliée / détachée, ou entreprise modifiée ailleurs : on reconstruit.
    if (type === 'entreprises' && !enregistrementEnCours) construire();
    else if (type === 'personne' && id === etat.id && entree && entree.entrepriseId !== etat.entrepriseId) construire();
    else if ((type === 'personne' && id === etat.id) || type === 'personnes') dessiner();
  });
  construire();
}
