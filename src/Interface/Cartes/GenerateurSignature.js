/**
 * GenerateurSignature.js
 * Fabrique la signature e-mail d'une carte à partir de ses réglages
 * (ceux de son entreprise, sinon les siens) : images (photo ronde, logo),
 * icônes à la couleur choisie, puis le tableau HTML. Sert à l'aperçu du
 * volet de droite et aux fichiers du zip (signature prête pour Outlook).
 */

import { reduireImage, decouperEnRond } from '../../Utilitaires/Image.js';
import { dataUrlVersOctets } from '../../Utilitaires/DataUrl.js';
import { couleurAccent, couleurNomCarte, logoCarte } from '../../Metier/IdentiteVisuelle.js';
import { policeSignature, tailleSignature } from '../../Metier/ReglagesSignature.js';
import { trouverEntreprise } from '../../Metier/EtatApplication.js';
import { iconesPng } from '../Rendu/IconesPng.js';
import { creerSignature, ICONES_SIGNATURE } from './Signature.js';

// Images en double résolution (écrans haute densité) ; icônes en 28 px.
const HAUTEUR_IMAGE_MAX = 280;
const TAILLE_ICONE = 28;
// Icônes des lignes d'infos (masquées si « Icônes devant les infos » est décoché).
const ICONES_INFOS = ['entreprise', 'mobile', 'telephone', 'email', 'web', 'adresse'];
const cacheIcones = new Map(); // Couleur → icônes PNG.

const LISEZMOI = [
  'Signature e-mail Card Pro',
  '',
  'Outlook classique (Windows) :',
  '  1. Ferme Outlook.',
  '  2. Copie le fichier .htm ET le dossier « _fichiers » qui l\'accompagne dans :',
  '     %APPDATA%\\Microsoft\\Signatures',
  '     (colle cette adresse dans la barre de l\'Explorateur de fichiers).',
  '  3. Rouvre Outlook : Fichier → Options → Courrier → Signatures… et choisis-la par défaut.',
  '',
  'Nouvel Outlook / Outlook sur le web :',
  '  1. Ouvre le fichier .htm (double-clic) : il s\'affiche dans le navigateur.',
  '  2. Ctrl + A puis Ctrl + C.',
  '  3. Outlook : Paramètres → Comptes → Signatures → Nouvelle signature → Ctrl + V → Enregistrer.',
  '',
  'Le plus simple reste le bouton « Copier la signature » dans Card Pro Configurateur.',
].join('\r\n');

/**
 * Réglages de signature d'une carte : ceux de son entreprise, sinon les siens.
 * @param {{entrepriseId:string, personne:object}} entree - Carte.
 * @returns {object} Réglages.
 */
export function reglagesDe(entree) {
  return trouverEntreprise(entree.entrepriseId)?.signature || entree.personne.signature;
}

/**
 * Prépare les images possibles de la signature.
 * @param {{personne:object, modele:object}} carte - Carte préparée.
 * @param {object|null} entreprise - Entreprise reliée (son logo passe en premier).
 * @returns {Promise<{photo:string, logo:string}>} Photo ronde et logo réduits ('' si absents).
 */
export async function preparerImages(carte, entreprise) {
  const logo = entreprise?.logo || logoCarte(carte.modele);
  const [photo, logoReduit] = await Promise.all([
    carte.personne.photo ? decouperEnRond(carte.personne.photo, HAUTEUR_IMAGE_MAX) : '',
    logo ? reduireImage(logo, HAUTEUR_IMAGE_MAX) : '',
  ]);
  return { photo, logo: logoReduit };
}

/**
 * Images à gauche et à droite selon le réglage « Image ».
 * Automatique : photo à gauche et logo à droite, ou logo à gauche sans photo.
 * @param {string} choix - auto, logo, photo ou aucune.
 * @param {{photo:string, logo:string}} images - Images disponibles.
 * @returns {{image:string, imageDroite:string}} Data URL ('' : pas d'image).
 */
export function imagesSignature(choix, images) {
  if (choix === 'auto') return images.photo ? { image: images.photo, imageDroite: images.logo } : { image: images.logo, imageDroite: '' };
  return { image: choix === 'aucune' ? '' : images[choix] || '', imageDroite: '' };
}

/**
 * Icônes PNG à une couleur (gardées en mémoire).
 * @param {string} couleur - Couleur #rrggbb.
 * @returns {Promise<Object<string, string>>} Clé → data URL.
 */
async function iconesCouleur(couleur) {
  if (!cacheIcones.has(couleur)) cacheIcones.set(couleur, await iconesPng([...new Set(Object.values(ICONES_SIGNATURE))], couleur, TAILLE_ICONE));
  return cacheIcones.get(couleur);
}

/**
 * Crée la signature d'une carte.
 * @param {{personne:object, modele:object}} carte - Carte préparée (infos d'entreprise appliquées).
 * @param {object} reglages - Réglages de signature.
 * @param {{photo:string, logo:string}} images - Images préparées.
 * @returns {Promise<HTMLTableElement>} Signature.
 */
export async function signatureCarte(carte, reglages, images) {
  const r = reglages;
  const couleur = r.couleursCarte ? couleurAccent(carte.modele) : r.couleur;
  const icones = await iconesCouleur(couleur);
  return creerSignature(carte.personne, {
    ...r,
    couleur,
    couleurTexte: r.couleursCarte ? couleurNomCarte(carte.modele) : r.couleurTexte,
    police: policeSignature(r.police),
    tailles: tailleSignature(r.taille),
    ...imagesSignature(r.image, images),
    icones: r.icones ? icones : Object.fromEntries(Object.entries(icones).filter(([cle]) => !ICONES_INFOS.includes(cle))),
  });
}

/**
 * Fichiers de la signature pour le zip : page .htm (format des signatures
 * Outlook), ses images dans le dossier « <nom>_fichiers », et un mode d'emploi.
 * @param {{nom:string, personne:object, modele:object}} carte - Carte préparée.
 * @param {{entrepriseId:string, personne:object}} entree - Carte enregistrée (réglages, entreprise).
 * @param {string} dossier - Dossier dans le zip (avec « / » final).
 * @returns {Promise<{nom:string, donnees:Uint8Array}[]>} Fichiers.
 */
export async function fichiersSignature(carte, entree, dossier) {
  const images = await preparerImages(carte, trouverEntreprise(entree.entrepriseId));
  const signature = await signatureCarte(carte, reglagesDe(entree), images);
  const sousDossier = `${carte.nom}_fichiers`;
  const fichiers = [];
  // Chaque image intégrée (une seule fois si elle se répète) devient un fichier,
  // référencé par un chemin relatif. Le remplacement se fait dans le texte HTML
  // pour ne pas faire charger ces chemins par la page.
  let corps = signature.outerHTML;
  const sources = [...new Set(Array.from(signature.querySelectorAll('img'), (img) => img.getAttribute('src')))];
  sources.forEach((source, i) => {
    const contenu = dataUrlVersOctets(source);
    if (!contenu) return;
    const nom = `image${String(i + 1).padStart(3, '0')}.png`;
    fichiers.push({ nom: `${dossier}${sousDossier}/${nom}`, donnees: contenu.octets });
    corps = corps.split(source).join(`${sousDossier}/${nom}`);
  });
  const html = `<!DOCTYPE html>\r\n<html><head><meta charset="utf-8"><title>Signature</title></head><body>${corps}</body></html>`;
  const encodeur = new TextEncoder();
  fichiers.unshift(
    { nom: `${dossier}${carte.nom}.htm`, donnees: encodeur.encode(html) },
    { nom: `${dossier}LISEZMOI.txt`, donnees: encodeur.encode(LISEZMOI) },
  );
  return fichiers;
}
