/**
 * Polices.js
 * Polices disponibles sur la carte. Ce sont des polices installées sur
 * les ordinateurs et téléphones : elles s'affichent de la même façon dans
 * l'aperçu et dans les exports (PNG, PDF), sans rien télécharger.
 */

export const POLICES = {
  moderne: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  verdana: 'Verdana, Geneva, sans-serif',
  arrondie: '"Trebuchet MS", "Avenir Next", Verdana, sans-serif',
  condensee: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif',
  impact: 'Impact, Haettenschweiler, "Arial Black", sans-serif',
  elegante: 'Georgia, "Times New Roman", Times, serif',
  classique: '"Times New Roman", Times, serif',
  garamond: 'Garamond, "EB Garamond", Baskerville, Georgia, serif',
  palatino: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace',
  manuscrite: '"Segoe Script", "Brush Script MT", "Apple Chancery", cursive',
};

// Options pour les listes déroulantes : [clé, libellé].
export const OPTIONS_POLICES = [
  ['moderne', 'Moderne (système)'], ['helvetica', 'Helvetica / Arial'], ['verdana', 'Verdana'],
  ['arrondie', 'Trebuchet'], ['condensee', 'Condensée'], ['impact', 'Impact'], ['elegante', 'Georgia'],
  ['classique', 'Times'], ['garamond', 'Garamond'], ['palatino', 'Palatino'], ['mono', 'Machine à écrire'],
  ['manuscrite', 'Manuscrite'],
];
