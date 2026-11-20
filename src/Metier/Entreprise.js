/**
 * Entreprise.js
 * Entreprises configurées dans le Configurateur : nom, coordonnées et logo
 * saisis une seule fois. Une carte reliée à une entreprise prend toutes ses
 * informations (non modifiables sur la carte) et son logo ; une carte en
 * « réglage personnalisé » garde ses propres valeurs. La signature e-mail
 * suit la même règle (réglages de l'entreprise, ou de la carte).
 */

import { idValide, IMAGE_MAX } from '../Utilitaires/Schema.js';
import { normaliserImageDataUrl } from '../Utilitaires/Validation.js';
import { normaliserChamp } from './Personne.js';
import { normaliserReglagesSignature } from './ReglagesSignature.js';

export const ENTREPRISES_MAX = 100;

// Champs d'une entreprise → champ de la personne qu'ils remplissent.
export const CHAMPS_ENTREPRISE = [
  { cle: 'nom', libelle: "Nom de l'entreprise", type: 'texte', max: 80, champPersonne: 'entreprise' },
  { cle: 'telephone', libelle: 'Support', type: 'tel', max: 25, champPersonne: 'telephoneSupport' },
  { cle: 'siteWeb', libelle: 'Site web', type: 'url', max: 300, champPersonne: 'siteWeb' },
  { cle: 'linkedin', libelle: "LinkedIn de l'entreprise", type: 'url', max: 300, champPersonne: 'linkedinEntreprise' },
  { cle: 'rue', libelle: 'Adresse', type: 'texte', max: 100, champPersonne: 'rue' },
  { cle: 'codePostal', libelle: 'Code postal', type: 'texte', max: 15, champPersonne: 'codePostal' },
  { cle: 'ville', libelle: 'Ville', type: 'texte', max: 60, champPersonne: 'ville' },
  { cle: 'pays', libelle: 'Pays', type: 'texte', max: 60, champPersonne: 'pays' },
];

// Exemples affichés en gris dans les champs vides de la fiche entreprise.
export const EXEMPLE_ENTREPRISE = Object.freeze({
  nom: 'Entreprise Exemple', telephone: '01 23 45 67 89', siteWeb: 'https://exemple.fr', linkedin: 'https://linkedin.com/company/exemple',
  rue: '12 rue des Lilas', codePostal: '75011', ville: 'Paris', pays: 'France',
});

// Champs de la personne remplis par l'entreprise (non modifiables si la carte est reliée).
export const CHAMPS_PERSONNE_ENTREPRISE = CHAMPS_ENTREPRISE.map((c) => c.champPersonne);

/**
 * Valide une entreprise reçue (formulaire, serveur, sauvegarde).
 * @param {unknown} brut - Données non fiables.
 * @returns {object|null} Entreprise propre, ou null si l'identifiant est invalide.
 */
export function normaliserEntreprise(brut) {
  if (!brut || typeof brut !== 'object' || !idValide(brut.id)) return null;
  const entreprise = { id: brut.id };
  CHAMPS_ENTREPRISE.forEach((champ) => { entreprise[champ.cle] = normaliserChamp(champ, brut[champ.cle]); });
  entreprise.logo = brut.logo ? normaliserImageDataUrl(brut.logo, IMAGE_MAX) || '' : '';
  // Signature e-mail commune à toutes les cartes de l'entreprise.
  entreprise.signature = normaliserReglagesSignature(brut.signature);
  return entreprise;
}

/**
 * Crée une entreprise vide.
 * @param {string} id - Identifiant.
 * @returns {object} Entreprise.
 */
export function entrepriseVide(id) {
  return normaliserEntreprise({ id, nom: 'Nouvelle entreprise' });
}

/**
 * Remplace les informations d'entreprise d'une personne par celles de l'entreprise.
 * @param {object} personne - Personne normalisée.
 * @param {object|null} entreprise - Entreprise reliée (null : réglage personnalisé).
 * @returns {object} Personne à afficher.
 */
export function appliquerEntreprisePersonne(personne, entreprise) {
  if (!entreprise) return personne;
  const resultat = { ...personne };
  CHAMPS_ENTREPRISE.forEach((champ) => { resultat[champ.champPersonne] = entreprise[champ.cle]; });
  return resultat;
}

/**
 * Met le logo de l'entreprise dans les images du modèle prévues pour
 * (origine « Logo de l'entreprise »).
 * @param {object} modele - Modèle normalisé.
 * @param {object|null} entreprise - Entreprise reliée.
 * @returns {object} Modèle à afficher (inchangé sans logo d'entreprise).
 */
export function appliquerEntrepriseModele(modele, entreprise) {
  if (!entreprise?.logo) return modele;
  const face = (f) => ({
    ...f,
    elements: f.elements.map((e) => (e.type === 'image' && e.origine === 'logo' ? { ...e, image: entreprise.logo } : e)),
  });
  return { ...modele, recto: face(modele.recto), verso: face(modele.verso) };
}
