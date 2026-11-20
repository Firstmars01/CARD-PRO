/**
 * Personne.js
 * Informations d'une personne (le contenu de sa carte) : liste des champs,
 * validation, valeurs calculées (nom complet, adresse…), liens calculés
 * (WhatsApp, itinéraire) et personne d'exemple utilisée dans l'éditeur.
 */

import {
  nettoyerTexte, nettoyerTexteMultiligne, normaliserEmail, normaliserTelephone, normaliserUrl,
} from '../Utilitaires/Validation.js';

export const LIENS_MAX = 8;

// Champs saisissables, dans l'ordre du formulaire et de l'import CSV.
export const CHAMPS_PERSONNE = [
  { cle: 'prenom', libelle: 'Prénom', type: 'texte', max: 50 },
  { cle: 'nom', libelle: 'Nom', type: 'texte', max: 50 },
  { cle: 'poste', libelle: 'Poste', type: 'texte', max: 80 },
  { cle: 'entreprise', libelle: 'Entreprise', type: 'texte', max: 80 },
  { cle: 'telephoneMobile', libelle: 'Téléphone mobile', type: 'tel', max: 25 },
  { cle: 'telephoneSupport', libelle: 'Support', type: 'tel', max: 25 },
  { cle: 'whatsapp', libelle: 'WhatsApp (numéro)', type: 'tel', max: 25 },
  { cle: 'email', libelle: 'E-mail', type: 'email', max: 254 },
  { cle: 'siteWeb', libelle: 'Site web', type: 'url', max: 300 },
  { cle: 'linkedin', libelle: 'LinkedIn', type: 'url', max: 300 },
  { cle: 'linkedinEntreprise', libelle: "LinkedIn de l'entreprise", type: 'url', max: 300 },
  { cle: 'rendezVous', libelle: 'Prise de rendez-vous (lien)', type: 'url', max: 300 },
  { cle: 'rue', libelle: 'Adresse', type: 'texte', max: 100 },
  { cle: 'codePostal', libelle: 'Code postal', type: 'texte', max: 15 },
  { cle: 'ville', libelle: 'Ville', type: 'texte', max: 60 },
  { cle: 'pays', libelle: 'Pays', type: 'texte', max: 60 },
  { cle: 'note', libelle: 'Note', type: 'multiligne', max: 300 },
];

// Champs utilisables dans un élément texte du modèle.
export const CHAMPS_AFFICHABLES = [
  ['nomComplet', 'Prénom + nom'], ['prenom', 'Prénom'], ['nom', 'Nom'], ['poste', 'Poste'],
  ['entreprise', 'Entreprise'], ['telephoneMobile', 'Téléphone mobile'], ['telephoneSupport', 'Support'], ['whatsapp', 'WhatsApp'],
  ['email', 'E-mail'], ['siteWeb', 'Site web'], ['linkedin', 'LinkedIn'], ['linkedinEntreprise', "LinkedIn de l'entreprise"],
  ['rendezVous', 'Prise de rendez-vous'], ['adresse', 'Adresse complète'], ['rue', 'Rue'],
  ['villeComplete', 'Code postal + ville'], ['pays', 'Pays'], ['note', 'Note'], ['liens', 'Liens (noms)'],
  // Nom d'un lien précis (légende sous un QR code de lien).
  ...Array.from({ length: LIENS_MAX }, (_, i) => [`lien${i + 1}`, `Lien ${i + 1} (nom)`]),
];

// Champs des anciennes versions → champ actuel (v4.8 : « Téléphone fixe » et
// « Standard » sont regroupés dans « Support »).
export const ANCIENS_CHAMPS = { telephoneStandard: 'telephoneSupport', telephonePro: 'telephoneSupport' };

/**
 * Reprend les valeurs des anciens champs (cartes, sauvegardes et fichiers
 * créés par une version précédente).
 * @param {object} source - Personne brute.
 * @returns {object} Personne brute avec les champs actuels.
 */
function reprendreAnciensChamps(source) {
  const resultat = { ...source };
  Object.entries(ANCIENS_CHAMPS).forEach(([ancien, actuel]) => {
    if (!resultat[actuel] && typeof source[ancien] === 'string' && source[ancien].trim()) resultat[actuel] = source[ancien];
  });
  return resultat;
}

/**
 * Crée une personne vide.
 * @returns {object} Personne avec tous les champs vides.
 */
export function personneVide() {
  const personne = { liens: [] };
  CHAMPS_PERSONNE.forEach(({ cle }) => { personne[cle] = ''; });
  return personne;
}

/**
 * Nettoie la valeur d'un champ selon son type.
 * @param {object} champ - Description du champ.
 * @param {unknown} valeur - Valeur brute.
 * @returns {string} Valeur nettoyée (vide si invalide).
 */
export function normaliserChamp(champ, valeur) {
  switch (champ.type) {
    case 'email': return normaliserEmail(valeur);
    case 'tel': return normaliserTelephone(valeur);
    case 'url': return normaliserUrl(valeur);
    case 'multiligne': return nettoyerTexteMultiligne(valeur, champ.max);
    default: return nettoyerTexte(valeur, champ.max);
  }
}

/**
 * Nettoie un lien personnalisé.
 * @param {unknown} lien - Objet { libelle, url } brut.
 * @returns {{libelle:string, url:string}|null} Lien valide ou null.
 */
export function normaliserLien(lien) {
  if (!lien || typeof lien !== 'object') return null;
  const url = normaliserUrl(lien.url);
  if (!url) return null;
  return { libelle: nettoyerTexte(lien.libelle, 30) || new URL(url).hostname, url };
}

/**
 * Normalise une personne (formulaire, import CSV ou serveur).
 * @param {unknown} brut - Données brutes non fiables.
 * @returns {object} Personne propre.
 */
export function normaliserPersonne(brut) {
  const source = reprendreAnciensChamps(brut && typeof brut === 'object' ? brut : {});
  const personne = personneVide();
  CHAMPS_PERSONNE.forEach((champ) => { personne[champ.cle] = normaliserChamp(champ, source[champ.cle]); });
  personne.liens = (Array.isArray(source.liens) ? source.liens : []).map(normaliserLien).filter(Boolean).slice(0, LIENS_MAX);
  return personne;
}

/**
 * Renvoie le nom complet (prénom + nom).
 * @param {object} personne - Personne normalisée.
 * @returns {string} Nom complet.
 */
export function nomComplet(personne) {
  return [personne.prenom, personne.nom].filter(Boolean).join(' ');
}

/**
 * Raccourcit une URL pour l'affichage (sans https:// ni / final).
 * @param {string} url - URL complète.
 * @returns {string} URL lisible.
 */
export function urlLisible(url) {
  return String(url).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

/**
 * Calcule la valeur d'un champ affichable (y compris les champs calculés).
 * @param {object} personne - Personne normalisée.
 * @param {string} champ - Clé d'un champ de CHAMPS_AFFICHABLES.
 * @returns {string} Texte à afficher.
 */
export function valeurChamp(personne, champ) {
  const villeComplete = [personne.codePostal, personne.ville].filter(Boolean).join(' ');
  switch (champ) {
    case 'nomComplet': return nomComplet(personne);
    case 'siteWeb':
    case 'linkedin':
    case 'linkedinEntreprise':
    case 'rendezVous': return personne[champ] ? urlLisible(personne[champ]) : '';
    case 'villeComplete': return villeComplete;
    case 'adresse': return [personne.rue, villeComplete, personne.pays].filter(Boolean).join(', ');
    case 'liens': return personne.liens.map((l) => l.libelle).join(' · ');
    default:
      if (/^lien[1-8]$/.test(champ)) return personne.liens[Number(champ.slice(4)) - 1]?.libelle || '';
      return typeof personne[champ] === 'string' ? personne[champ] : '';
  }
}

// Personne fictive affichée dans l'éditeur de modèles.
export const PERSONNE_EXEMPLE = Object.freeze(normaliserPersonne({
  prenom: 'Camille', nom: 'Durand', poste: 'Responsable commerciale', entreprise: 'Entreprise Exemple',
  telephoneMobile: '06 12 34 56 78', telephoneSupport: '01 23 45 67 89', email: 'camille.durand@exemple.fr',
  whatsapp: '06 12 34 56 78',
  siteWeb: 'exemple.fr', linkedin: 'https://linkedin.com/in/camille-durand',
  linkedinEntreprise: 'https://linkedin.com/company/exemple', rendezVous: 'https://calendly.com/camille-durand', rue: '12 rue des Lilas', codePostal: '75011', ville: 'Paris', pays: 'France',
  liens: [
    { libelle: 'LinkedIn', url: 'https://linkedin.com/in/exemple' },
    { libelle: 'Instagram', url: 'https://instagram.com/exemple' },
    { libelle: 'Portfolio', url: 'https://exemple.fr/portfolio' },
  ],
}));

/**
 * Lien WhatsApp (wa.me) d'un numéro : chiffres seuls, indicatif français
 * ajouté si le numéro commence par 0.
 * @param {string} numero - Numéro normalisé.
 * @returns {string} Lien https://wa.me/… ('' si pas de numéro).
 */
export function lienWhatsapp(numero) {
  let chiffres = String(numero || '').replace(/\D/g, '');
  if (!chiffres) return '';
  if (String(numero).trim().startsWith('00')) chiffres = chiffres.slice(2);
  else if (chiffres.startsWith('0')) chiffres = `33${chiffres.slice(1)}`;
  return `https://wa.me/${chiffres}`;
}

/**
 * Lien d'itinéraire (Google Maps, ouvert aussi par Plans sur iPhone) vers l'adresse.
 * @param {object} personne - Personne normalisée.
 * @returns {string} Lien ('' si pas d'adresse).
 */
export function lienItineraire(personne) {
  const adresse = valeurChamp(personne, 'adresse');
  return adresse ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}` : '';
}
