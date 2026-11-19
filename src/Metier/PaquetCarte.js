/**
 * PaquetCarte.js
 * « Paquet » d'une carte pour le portefeuille mobile : les informations de la
 * personne et le design complet de sa carte (recto, verso, images comprises),
 * réunis dans un bloc binaire compressé. C'est le contenu du fichier .cardpro,
 * du GIF envoyé par e-mail et du QR code animé.
 *
 * Format :
 *   "CPRO" + version (1 octet) + deflate(
 *     longueur JSON (4 octets) + JSON { personne, modele }
 *     + nombre d'images (1 octet)
 *     + pour chaque image : type (1 octet) + longueur (4 octets) + octets
 *   )
 * Les images sont sorties du JSON et gardées en binaire (sans base64) :
 * le paquet est ainsi environ 25 % plus léger.
 */

import { normaliserPersonne } from './Personne.js';
import { normaliserModele } from './ModeleCarte.js';
import { compresser, decompresser } from '../Utilitaires/Compression.js';
import { dataUrlVersOctets, octetsVersDataUrl } from '../Utilitaires/DataUrl.js';

const SIGNATURE = [0x43, 0x50, 0x52, 0x4f]; // "CPRO"
const VERSION_PAQUET = 1;
export const TAILLE_MAX_PAQUET = 3 * 1024 * 1024; // Fichier reçu (3 Mo)
const TAILLE_MAX_DECOMPRESSEE = 4 * 1024 * 1024; // Une fois décompressé (4 Mo)
const IMAGES_MAX = 40;
const PREFIXE_IMAGE = '#image:';
// Identifiant du bloc de données caché dans le GIF envoyé par e-mail.
export const IDENTIFIANT_GIF = 'CARDPRO1.0';

/**
 * Parcourt les objets du modèle qui peuvent contenir des images (fonds et éléments).
 * @param {object} modele - Modèle.
 * @param {(objet:object) => void} rappel - Fonction appelée pour chaque objet.
 */
function parcourirObjets(modele, rappel) {
  ['recto', 'verso'].forEach((cote) => {
    rappel(modele[cote].fond);
    modele[cote].elements.forEach(rappel);
  });
}

/**
 * Remplace les images du modèle par des références et les collecte en binaire.
 * @param {object} modele - Copie du modèle (modifiée sur place).
 * @returns {{code:number, octets:Uint8Array}[]} Images extraites.
 */
function extraireImages(modele) {
  const images = [];
  parcourirObjets(modele, (objet) => {
    Object.keys(objet).forEach((cle) => {
      if (typeof objet[cle] !== 'string' || !objet[cle].startsWith('data:image/')) return;
      const image = images.length < IMAGES_MAX ? dataUrlVersOctets(objet[cle]) : null;
      if (image) {
        objet[cle] = `${PREFIXE_IMAGE}${images.length}`;
        images.push(image);
      } else {
        objet[cle] = '';
      }
    });
  });
  return images;
}

/**
 * Remet les images à leur place dans le modèle (références → data URL).
 * @param {object} modele - Modèle brut (modifié sur place).
 * @param {string[]} images - Images en data URL, dans l'ordre.
 */
function replacerImages(modele, images) {
  if (!modele || typeof modele !== 'object') return;
  ['recto', 'verso'].forEach((cote) => {
    const face = modele[cote];
    if (!face || typeof face !== 'object') return;
    const objets = [face.fond, ...(Array.isArray(face.elements) ? face.elements : [])];
    objets.forEach((objet) => {
      if (!objet || typeof objet !== 'object') return;
      Object.keys(objet).forEach((cle) => {
        const valeur = objet[cle];
        if (typeof valeur === 'string' && valeur.startsWith(PREFIXE_IMAGE)) {
          objet[cle] = images[Number(valeur.slice(PREFIXE_IMAGE.length))] || '';
        }
      });
    });
  });
}

/**
 * Crée le paquet binaire d'une carte.
 * @param {object} personne - Personne normalisée.
 * @param {object} modele - Modèle normalisé de sa carte.
 * @returns {Promise<Uint8Array>} Paquet (contenu du fichier .cardpro).
 */
export async function creerPaquet(personne, modele) {
  const copie = structuredClone(modele);
  delete copie.id;
  const images = extraireImages(copie);
  const json = new TextEncoder().encode(JSON.stringify({ personne: normaliserPersonne(personne), modele: copie }));

  const taille = 4 + json.length + 1 + images.reduce((t, i) => t + 5 + i.octets.length, 0);
  const corps = new Uint8Array(taille);
  const vue = new DataView(corps.buffer);
  let position = 0;
  vue.setUint32(position, json.length); position += 4;
  corps.set(json, position); position += json.length;
  corps[position++] = images.length;
  images.forEach(({ code, octets }) => {
    corps[position++] = code;
    vue.setUint32(position, octets.length); position += 4;
    corps.set(octets, position); position += octets.length;
  });

  const compresse = await compresser(corps);
  const paquet = new Uint8Array(5 + compresse.length);
  paquet.set(SIGNATURE, 0);
  paquet[4] = VERSION_PAQUET;
  paquet.set(compresse, 5);
  return paquet;
}

/**
 * Indique si des octets ressemblent à un paquet Card Pro (signature).
 * @param {Uint8Array} octets - Données.
 * @returns {boolean} true si la signature est présente.
 */
export function estPaquet(octets) {
  return octets.length > 5 && SIGNATURE.every((o, i) => octets[i] === o);
}

/**
 * Lit un paquet reçu (fichier, GIF ou QR) et valide tout son contenu.
 * @param {Uint8Array} octets - Paquet binaire (source non fiable).
 * @returns {Promise<{personne:object, modele:object}>} Carte validée.
 * @throws {Error} Avec un message lisible si le paquet est invalide.
 */
export async function lirePaquet(octets) {
  if (!estPaquet(octets)) throw new Error("Ce fichier n'est pas une carte Card Pro.");
  if (octets.length > TAILLE_MAX_PAQUET) throw new Error('Carte trop volumineuse.');
  if (octets[4] !== VERSION_PAQUET) throw new Error('Carte créée avec une version plus récente de Card Pro.');

  const corps = await decompresser(octets.subarray(5), TAILLE_MAX_DECOMPRESSEE);
  let position = 0;
  // Lit les octets suivants, en vérifiant qu'ils existent bien.
  const lire = (longueur) => {
    if (position + longueur > corps.length) throw new Error('Carte incomplète ou corrompue.');
    position += longueur;
    return corps.subarray(position - longueur, position);
  };
  // Lit un entier non signé sur 4 octets (gros-boutiste).
  const lireEntier32 = () => {
    const m = lire(4);
    return ((m[0] << 24) | (m[1] << 16) | (m[2] << 8) | m[3]) >>> 0;
  };

  const longueurJson = lireEntier32();
  let donnees;
  try {
    donnees = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(lire(longueurJson)));
  } catch {
    throw new Error('Carte incomplète ou corrompue.');
  }
  const nombreImages = lire(1)[0];
  if (nombreImages > IMAGES_MAX) throw new Error('Carte incomplète ou corrompue.');
  const images = [];
  for (let i = 0; i < nombreImages; i++) {
    const code = lire(1)[0];
    const longueur = lireEntier32();
    images.push(octetsVersDataUrl(code, lire(longueur)));
  }

  // Tout passe par les mêmes validations que l'application web.
  replacerImages(donnees?.modele, images);
  return { personne: normaliserPersonne(donnees?.personne), modele: normaliserModele(donnees?.modele) };
}
