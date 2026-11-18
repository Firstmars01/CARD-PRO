/**
 * Validation.js
 * Fonctions de vérification et de nettoyage des entrées utilisateur.
 * Toute donnée venant d'un formulaire, d'un lien de partage, d'un fichier
 * importé ou du stockage local passe par ces fonctions avant d'être utilisée.
 */

// Caractères de contrôle (sauts de ligne inclus) interdits dans un champ sur une ligne.
const CARACTERES_CONTROLE = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g;
// Caractères de contrôle interdits en multiligne (on garde \n).
const CARACTERES_CONTROLE_MULTI = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u2028\u2029]/g;

/**
 * Nettoie un texte sur une ligne : supprime les caractères de contrôle,
 * réduit les espaces multiples et coupe à la longueur maximale.
 * @param {unknown} valeur - Valeur brute.
 * @param {number} [max=100] - Longueur maximale.
 * @returns {string} Texte nettoyé (chaîne vide si invalide).
 */
export function nettoyerTexte(valeur, max = 100) {
  if (typeof valeur !== 'string' && typeof valeur !== 'number') return '';
  return String(valeur)
    .replace(CARACTERES_CONTROLE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Nettoie un texte court en conservant ses espaces (ex. : préfixe « Tél. »).
 * @param {unknown} valeur - Valeur brute.
 * @param {number} [max=30] - Longueur maximale.
 * @returns {string} Texte sans caractères de contrôle.
 */
export function nettoyerTexteAvecEspaces(valeur, max = 30) {
  if (typeof valeur !== 'string') return '';
  return valeur.replace(CARACTERES_CONTROLE, ' ').slice(0, max);
}

/**
 * Nettoie un texte multiligne (ex. : note) en conservant les sauts de ligne.
 * @param {unknown} valeur - Valeur brute.
 * @param {number} [max=300] - Longueur maximale.
 * @returns {string} Texte nettoyé.
 */
export function nettoyerTexteMultiligne(valeur, max = 300) {
  if (typeof valeur !== 'string') return '';
  return valeur
    .replace(/\r\n?/g, '\n')
    .replace(CARACTERES_CONTROLE_MULTI, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

/**
 * Vérifie et normalise une adresse e-mail.
 * @param {unknown} valeur - Valeur brute.
 * @returns {string} E-mail valide ou chaîne vide.
 */
export function normaliserEmail(valeur) {
  const email = nettoyerTexte(valeur, 254).toLowerCase();
  return /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(email) ? email : '';
}

/**
 * Vérifie et normalise un numéro de téléphone (chiffres, +, espaces, . - ( )).
 * @param {unknown} valeur - Valeur brute.
 * @returns {string} Numéro valide ou chaîne vide.
 */
export function normaliserTelephone(valeur) {
  const tel = nettoyerTexte(valeur, 25);
  const chiffres = tel.replace(/\D/g, '');
  return /^\+?[0-9 ().-]+$/.test(tel) && chiffres.length >= 4 ? tel : '';
}

/**
 * Vérifie et normalise une URL. Seuls http et https sont acceptés
 * (bloque javascript:, data:, file:…). Ajoute https:// si absent.
 * @param {unknown} valeur - Valeur brute.
 * @returns {string} URL normalisée ou chaîne vide.
 */
export function normaliserUrl(valeur) {
  let texte = nettoyerTexte(valeur, 300);
  if (!texte) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(texte)) texte = `https://${texte}`;
  try {
    const url = new URL(texte);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (!url.hostname.includes('.') || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

/**
 * Vérifie une couleur hexadécimale (#rrggbb).
 * @param {unknown} valeur - Valeur brute.
 * @param {string} defaut - Couleur par défaut si invalide.
 * @returns {string} Couleur en minuscules.
 */
export function normaliserCouleur(valeur, defaut) {
  return typeof valeur === 'string' && /^#[0-9a-f]{6}$/i.test(valeur) ? valeur.toLowerCase() : defaut;
}

/**
 * Borne un nombre entre un minimum et un maximum.
 * @param {unknown} valeur - Valeur brute.
 * @param {number} min - Minimum.
 * @param {number} max - Maximum.
 * @param {number} defaut - Valeur si non numérique.
 * @returns {number} Nombre borné.
 */
export function bornerNombre(valeur, min, max, defaut) {
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre)) return defaut;
  return Math.min(max, Math.max(min, nombre));
}

/**
 * Vérifie qu'une valeur fait partie d'une liste autorisée.
 * @param {unknown} valeur - Valeur brute.
 * @param {string[]} autorisees - Valeurs permises.
 * @param {string} defaut - Valeur par défaut.
 * @returns {string} Valeur autorisée.
 */
export function choisirParmi(valeur, autorisees, defaut) {
  return autorisees.includes(valeur) ? valeur : defaut;
}

/**
 * Vérifie qu'une chaîne est une image PNG/JPEG/WebP encodée en data URL.
 * @param {unknown} valeur - Valeur brute.
 * @param {number} [tailleMax=500000] - Longueur maximale de la chaîne.
 * @returns {string} Data URL valide ou chaîne vide.
 */
export function normaliserImageDataUrl(valeur, tailleMax = 500000) {
  if (typeof valeur !== 'string' || valeur.length > tailleMax) return '';
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(valeur) ? valeur : '';
}

/**
 * Transforme un texte en nom de fichier sûr (lettres, chiffres, tirets).
 * @param {string} texte - Texte source.
 * @param {string} [defaut="carte"] - Nom si le résultat est vide.
 * @returns {string} Nom de fichier sans extension.
 */
export function nomFichierSur(texte, defaut = 'carte') {
  const nom = String(texte || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return nom || defaut;
}
