/**
 * TransfertQr.js
 * Transfert d'une carte complète par une suite de QR codes (« QR animé »).
 * Un QR code ne contient pas plus de ~2,9 Ko : le paquet de la carte est donc
 * découpé en morceaux numérotés, chacun dans son propre QR code.
 *
 * Contenu d'un QR : "CP1:" + Base45( identifiant (4 octets) + numéro (2) +
 *   total (2) + morceau ). L'identifiant est le CRC-32 du paquet complet :
 * il évite de mélanger deux cartes et vérifie le résultat final.
 * Les QR peuvent être lus dans n'importe quel ordre, et plusieurs fois.
 */

import { encoderBase45, decoderBase45 } from '../Utilitaires/Base45.js';
import { crc32 } from '../Utilitaires/Zip.js';
import { encoderTexteQr } from '../Utilitaires/EncodeurQr.js';
import { TAILLE_MAX_PAQUET } from './PaquetCarte.js';

const PREFIXE = 'CP1:';
const TAILLE_ENTETE = 8;
export const TAILLE_MORCEAU = 600; // Octets de carte par QR code
export const NIVEAU_QR_TRANSFERT = 'M';
const TRAMES_MAX = Math.ceil(TAILLE_MAX_PAQUET / TAILLE_MORCEAU);

/**
 * Découpe un paquet en textes de QR codes.
 * @param {Uint8Array} paquet - Paquet de la carte.
 * @returns {string[]} Contenu de chaque QR code, dans l'ordre.
 */
export function decouperPaquet(paquet) {
  const identifiant = crc32(paquet);
  const total = Math.max(1, Math.ceil(paquet.length / TAILLE_MORCEAU));
  const trames = [];
  for (let index = 0; index < total; index++) {
    const morceau = paquet.subarray(index * TAILLE_MORCEAU, (index + 1) * TAILLE_MORCEAU);
    const octets = new Uint8Array(TAILLE_ENTETE + morceau.length);
    const vue = new DataView(octets.buffer);
    vue.setUint32(0, identifiant);
    vue.setUint16(4, index);
    vue.setUint16(6, total);
    octets.set(morceau, TAILLE_ENTETE);
    trames.push(PREFIXE + encoderBase45(octets));
  }
  return trames;
}

/**
 * Encode les textes en QR codes de même taille (animation stable à l'écran).
 * @param {string[]} trames - Textes produits par decouperPaquet.
 * @returns {object[]} QR codes (grilles de modules).
 */
export function encoderTrames(trames) {
  const premier = encoderTexteQr(trames[0], NIVEAU_QR_TRANSFERT);
  return trames.map((t, i) => (i === 0 ? premier : encoderTexteQr(t, NIVEAU_QR_TRANSFERT, { versionMin: premier.version })));
}

/**
 * Lit le contenu d'un QR de transfert.
 * @param {string} texte - Texte lu dans le QR code.
 * @returns {{identifiant:number, index:number, total:number, morceau:Uint8Array}|null} Trame, ou null si ce n'en est pas une.
 */
export function lireTrame(texte) {
  if (typeof texte !== 'string' || !texte.startsWith(PREFIXE) || texte.length > 4000) return null;
  let octets;
  try {
    octets = decoderBase45(texte.slice(PREFIXE.length));
  } catch {
    return null;
  }
  if (octets.length <= TAILLE_ENTETE || octets.length > TAILLE_ENTETE + TAILLE_MORCEAU) return null;
  const vue = new DataView(octets.buffer);
  const trame = { identifiant: vue.getUint32(0), index: vue.getUint16(4), total: vue.getUint16(6), morceau: octets.subarray(TAILLE_ENTETE) };
  if (trame.total < 1 || trame.total > TRAMES_MAX || trame.index >= trame.total) return null;
  return trame;
}

/**
 * Reconstitue un paquet à partir des QR codes lus un par un.
 */
export class AssembleurTransfert {
  /** Crée un assembleur vide. */
  constructor() {
    this.reinitialiser();
  }

  /** Oublie les morceaux déjà reçus. */
  reinitialiser() {
    this.identifiant = null;
    this.total = 0;
    this.morceaux = new Map();
  }

  /**
   * Nombre de morceaux reçus.
   * @returns {number} Morceaux distincts reçus.
   */
  get recus() {
    return this.morceaux.size;
  }

  /**
   * Ajoute le texte d'un QR code lu.
   * @param {string} texte - Contenu du QR code.
   * @returns {{etat:"ignore"|"progression"|"termine", recus:number, total:number, paquet?:Uint8Array}} Avancement.
   * @throws {Error} Si la carte reconstituée est corrompue (l'assembleur repart de zéro).
   */
  ajouter(texte) {
    const trame = lireTrame(texte);
    if (!trame) return { etat: 'ignore', recus: this.recus, total: this.total };
    // Une autre carte est affichée : on repart de zéro avec celle-ci.
    if (trame.identifiant !== this.identifiant || trame.total !== this.total) {
      this.reinitialiser();
      this.identifiant = trame.identifiant;
      this.total = trame.total;
    }
    this.morceaux.set(trame.index, trame.morceau);
    if (this.recus < this.total) return { etat: 'progression', recus: this.recus, total: this.total };

    const paquet = this.assembler();
    const total = this.total;
    this.reinitialiser();
    if (crc32(paquet) !== trame.identifiant) throw new Error('Lecture corrompue : recommence le scan.');
    return { etat: 'termine', recus: total, total, paquet };
  }

  /**
   * Assemble les morceaux dans l'ordre.
   * @returns {Uint8Array} Paquet complet.
   */
  assembler() {
    const morceaux = [...this.morceaux.entries()].sort((a, b) => a[0] - b[0]).map(([, m]) => m);
    const paquet = new Uint8Array(morceaux.reduce((t, m) => t + m.length, 0));
    let position = 0;
    morceaux.forEach((m) => { paquet.set(m, position); position += m.length; });
    return paquet;
  }
}
