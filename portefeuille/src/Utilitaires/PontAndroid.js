/**
 * PontAndroid.js
 * Communication avec l'appli Android (APK) qui contient le portefeuille :
 * NFC (le téléphone se fait passer pour une puce NFC contenant le contact),
 * partage de fichiers et fichiers reçus d'autres applis (e-mail…).
 * Dans un navigateur, l'objet CardProAndroid n'existe pas : rien ne se passe.
 */

/**
 * Objet fourni par l'appli Android.
 * @returns {object|null} Pont, ou null hors de l'appli Android.
 */
function pont() {
  return typeof window.CardProAndroid === 'object' && window.CardProAndroid ? window.CardProAndroid : null;
}

/**
 * Indique si la page tourne dans l'appli Android.
 * @returns {boolean} true dans l'APK Card Pro.
 */
export function estAppliAndroid() {
  return pont() !== null;
}

/**
 * État du NFC du téléphone.
 * @returns {"absent"|"desactive"|"pret"} absent : pas de NFC (ou hors appli) ; desactive : NFC coupé dans les réglages.
 */
export function etatNfc() {
  const etat = pont()?.etatNfc();
  return etat === 'pret' || etat === 'desactive' ? etat : 'absent';
}

/**
 * Active le partage NFC : approcher un autre téléphone lui transmet le contact.
 * @param {string} vcard - Fiche contact (lue par Android).
 * @param {string} lien - Lien de la fiche (lu par iPhone), ou chaîne vide.
 * @returns {boolean} true si le NFC est prêt.
 */
export function activerNfc(vcard, lien) {
  return pont()?.activerNfc(vcard, lien) === true;
}

/**
 * Indique si un contact est en cours de partage NFC (l'appli le coupe en passant en arrière-plan).
 * @returns {boolean} true si le partage est actif.
 */
export function nfcActif() {
  return pont()?.nfcActif() === true;
}

/** Coupe le partage NFC. */
export function desactiverNfc() {
  pont()?.desactiverNfc();
}

/** Ouvre les réglages NFC du téléphone. */
export function ouvrirReglagesNfc() {
  pont()?.ouvrirReglagesNfc();
}

/**
 * Ouvre le menu de partage d'Android avec un fichier texte.
 * @param {string} nom - Nom du fichier.
 * @param {string} type - Type MIME.
 * @param {string} contenu - Contenu texte (UTF-8).
 */
export function partagerFichier(nom, type, contenu) {
  pont()?.partagerFichier(nom, type, contenu);
}

/**
 * Ouvre un fichier texte avec l'appli adaptée (ex. Contacts pour un .vcf).
 * @param {string} nom - Nom du fichier.
 * @param {string} type - Type MIME.
 * @param {string} contenu - Contenu texte (UTF-8).
 */
export function ouvrirFichier(nom, type, contenu) {
  pont()?.ouvrirFichier(nom, type, contenu);
}

/**
 * Récupère les fichiers reçus d'autres applis (« Partager » / « Ouvrir avec »).
 * @returns {File[]} Fichiers (vide s'il n'y en a pas).
 */
export function fichiersRecus() {
  let liste;
  try {
    liste = JSON.parse(pont()?.fichiersEnAttente() || '[]');
  } catch {
    return [];
  }
  return (Array.isArray(liste) ? liste : []).filter((f) => typeof f?.base64 === 'string').map((f) => {
    const binaire = atob(f.base64);
    const octets = Uint8Array.from(binaire, (c) => c.charCodeAt(0));
    return new File([octets], String(f.nom || 'fichier').slice(0, 100), { type: String(f.type || '') });
  });
}
