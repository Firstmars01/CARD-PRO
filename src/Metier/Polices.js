/**
 * Polices.js
 * Polices disponibles sur la carte. Elles sont livrées avec l'appli
 * (dossier assets/polices) : la carte s'affiche exactement pareil sur PC,
 * Android, iPhone et dans les exports, quelles que soient les polices
 * installées sur l'appareil.
 */

/**
 * Faces normale, grasse, italique et grasse italique d'une police.
 * @param {string} fichier - Début du nom des fichiers (ex. « Inter »).
 * @returns {Array<[string, string, string]>} [fichier, graisse, style].
 */
function quatreFaces(fichier) {
  return [
    [`${fichier}-R`, '400', 'normal'], [`${fichier}-B`, '700', 'normal'],
    [`${fichier}-I`, '400', 'italic'], [`${fichier}-BI`, '700', 'italic'],
  ];
}

/**
 * Graisses fine (300), semi-grasse (600) et très grasse (800), droites et italiques.
 * @param {string} fichier - Début du nom des fichiers.
 * @returns {Array<[string, string, string]>} [fichier, graisse, style].
 */
function nuances(fichier) {
  return [300, 600, 800].flatMap((g) => [[`${fichier}-${g}`, String(g), 'normal'], [`${fichier}-${g}I`, String(g), 'italic']]);
}

// Nom de famille CSS → fichiers (sans « .woff ») avec leur graisse et leur style.
// « 100 900 » : une seule graisse sert pour toutes (pas de faux gras ajouté par le navigateur).
export const FACES_POLICES = {
  'CP Inter': [...quatreFaces('Inter'), ...nuances('Inter')],
  'CP Roboto': [...quatreFaces('Roboto'), ...nuances('Roboto')],
  'CP Open Sans': [...quatreFaces('OpenSans'), ...nuances('OpenSans')],
  'CP Roboto Condensed': quatreFaces('RobotoCondensed'),
  'CP DM Sans': quatreFaces('DMSans'),
  'CP Fira Sans': quatreFaces('FiraSans'),
  'CP Liberation Sans': quatreFaces('LiberationSans'),
  'CP Liberation Serif': quatreFaces('LiberationSerif'),
  'CP Liberation Mono': quatreFaces('LiberationMono'),
  'CP Anton': [['Anton-R', '100 900', 'normal']],
  'CP Gelasio': quatreFaces('Gelasio'),
  'CP Cardo': [['Cardo-R', '400', 'normal'], ['Cardo-B', '700', 'normal'], ['Cardo-I', '100 900', 'italic']],
  'CP Crimson Text': quatreFaces('CrimsonText'),
};

/**
 * Valeur CSS « font-family » d'une police intégrée.
 * @param {string} famille - Nom de famille (clé de FACES_POLICES).
 * @param {string} secours - Famille générique pendant le chargement.
 * @returns {string} Valeur font-family.
 */
function pile(famille, secours) {
  return `"${famille}", ${secours}`;
}

// Clé enregistrée dans les modèles → font-family. Les clés des anciennes
// versions sont gardées : les cartes existantes reçoivent la police intégrée
// la plus proche (Arial, Times, Courier et Georgia gardent les mêmes largeurs).
export const POLICES = {
  moderne: pile('CP Inter', 'sans-serif'),
  roboto: pile('CP Roboto', 'sans-serif'),
  opensans: pile('CP Open Sans', 'sans-serif'),
  helvetica: pile('CP Liberation Sans', 'sans-serif'),
  verdana: pile('CP DM Sans', 'sans-serif'),
  arrondie: pile('CP Fira Sans', 'sans-serif'),
  condensee: pile('CP Roboto Condensed', 'sans-serif'),
  impact: pile('CP Anton', 'sans-serif'),
  elegante: pile('CP Gelasio', 'serif'),
  classique: pile('CP Liberation Serif', 'serif'),
  garamond: pile('CP Cardo', 'serif'),
  palatino: pile('CP Crimson Text', 'serif'),
  mono: pile('CP Liberation Mono', 'monospace'),
};

// Police utilisée si la clé est inconnue (ex. « manuscrite », retirée).
export const POLICE_PAR_DEFAUT = 'moderne';

// Options pour les listes déroulantes : [clé, libellé].
export const OPTIONS_POLICES = [
  ['moderne', 'Inter'], ['roboto', 'Roboto'], ['opensans', 'Open Sans'],
  ['helvetica', 'Liberation Sans (comme Arial)'], ['verdana', 'DM Sans'], ['arrondie', 'Fira Sans'],
  ['condensee', 'Roboto condensée'], ['impact', 'Anton (comme Impact)'], ['elegante', 'Gelasio (comme Georgia)'],
  ['classique', 'Liberation Serif (comme Times)'], ['garamond', 'Cardo (comme Garamond)'],
  ['palatino', 'Crimson Text (comme Palatino)'], ['mono', 'Liberation Mono (machine à écrire)'],
];

/**
 * font-family d'une clé de police (police par défaut si inconnue).
 * @param {string} cle - Clé enregistrée dans le modèle.
 * @returns {string} Valeur font-family.
 */
export function familleCss(cle) {
  return POLICES[cle] || POLICES[POLICE_PAR_DEFAUT];
}
