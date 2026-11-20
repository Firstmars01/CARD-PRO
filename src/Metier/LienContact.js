/**
 * LienContact.js
 * Lien web qui contient une fiche contact : https://…/contact/#<données>.
 * Les données sont après le « # » : le navigateur ne les envoie jamais au
 * serveur, elles restent sur le téléphone. Sert au NFC pour les iPhone, qui
 * ne savent lire que des liens sur une puce NFC.
 */

import { normaliserPersonne } from './Personne.js';
import { compresser, decompresser } from '../Utilitaires/Compression.js';
import { encoderBase64Url, decoderBase64Url } from '../Utilitaires/Base64Url.js';

const TAILLE_MAX = 16 * 1024; // Fiche contact une fois décompressée
const LONGUEUR_MAX_LIEN = 6000; // Caractères après le « # »

/**
 * Garde seulement les champs remplis, sans la photo ni la signature (lien plus court).
 * @param {object} personne - Personne normalisée.
 * @returns {object} Champs non vides.
 */
function champsRemplis(personne) {
  // Sans la photo ni la signature : le lien doit rester court (puce NFC).
  return Object.fromEntries(Object.entries(personne).filter(([cle, v]) => !['photo', 'signature'].includes(cle) && (Array.isArray(v) ? v.length : v)));
}

/**
 * Crée le lien de la fiche contact.
 * @param {string} adresseSite - Adresse du site (ex. https://compte.github.io/depot/), avec « / » final.
 * @param {object} personne - Personne normalisée.
 * @returns {Promise<string>} Lien complet, ou chaîne vide si l'adresse du site est absente.
 */
export async function creerLienContact(adresseSite, personne) {
  if (!/^https:\/\/[^#?]+\/$/.test(adresseSite)) return '';
  const json = new TextEncoder().encode(JSON.stringify(champsRemplis(normaliserPersonne(personne))));
  return `${adresseSite}contact/#${encoderBase64Url(await compresser(json))}`;
}

/**
 * Lit la fiche contact contenue dans la fin d'un lien (après le « # »).
 * @param {string} fragment - Texte après le « # » (source non fiable).
 * @returns {Promise<object>} Personne validée.
 * @throws {Error} Si le lien est invalide ou abîmé.
 */
export async function lireLienContact(fragment) {
  const texte = String(fragment).replace(/^#/, '');
  if (!texte || texte.length > LONGUEUR_MAX_LIEN) throw new Error('Lien de contact invalide.');
  try {
    const json = await decompresser(decoderBase64Url(texte), TAILLE_MAX);
    return normaliserPersonne(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json)));
  } catch {
    throw new Error('Lien de contact invalide ou incomplet.');
  }
}
