/**
 * Csv.js
 * Lecture et écriture de fichiers CSV (séparateur « ; » ou « , »,
 * guillemets, retours à la ligne dans les cellules). Compatible Excel.
 */

const LIGNES_MAX = 1000;

/**
 * Détecte le séparateur à partir de la première ligne.
 * @param {string} texte - Contenu du fichier.
 * @returns {string} « ; », « , » ou tabulation.
 */
function detecterSeparateur(texte) {
  const premiere = texte.split(/\r?\n/, 1)[0];
  const compter = (c) => premiere.split(c).length;
  return [';', ',', '\t'].reduce((meilleur, c) => (compter(c) > compter(meilleur) ? c : meilleur), ';');
}

/**
 * Analyse un texte CSV.
 * @param {string} texte - Contenu du fichier.
 * @returns {string[][]} Lignes (tableau de cellules), sans les lignes vides.
 * @throws {Error} Si le fichier dépasse le nombre de lignes autorisé.
 */
export function lireCsv(texte) {
  const contenu = String(texte).replace(/^﻿/, '');
  const separateur = detecterSeparateur(contenu);
  const lignes = [];
  let ligne = [];
  let cellule = '';
  let entreGuillemets = false;

  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i];
    if (entreGuillemets) {
      if (c === '"' && contenu[i + 1] === '"') { cellule += '"'; i++; } else if (c === '"') entreGuillemets = false;
      else cellule += c;
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === separateur) {
      ligne.push(cellule);
      cellule = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && contenu[i + 1] === '\n') i++;
      ligne.push(cellule);
      lignes.push(ligne);
      if (lignes.length > LIGNES_MAX) throw new Error(`Fichier trop long (${LIGNES_MAX} lignes maximum).`);
      ligne = [];
      cellule = '';
    } else {
      cellule += c;
    }
  }
  ligne.push(cellule);
  lignes.push(ligne);
  return lignes.filter((l) => l.some((c) => c.trim() !== ''));
}

/**
 * Protège une cellule pour l'écriture CSV, et neutralise les formules
 * (une cellule commençant par = + - @ pourrait s'exécuter dans Excel).
 * @param {unknown} valeur - Valeur de la cellule.
 * @returns {string} Cellule prête à écrire.
 */
function protegerCellule(valeur) {
  let texte = String(valeur ?? '');
  if (/^[=+\-@\t\r]/.test(texte)) texte = `'${texte}`;
  return /[";\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

/**
 * Écrit un CSV (séparateur « ; », avec BOM pour qu'Excel lise les accents).
 * @param {string[][]} lignes - Lignes à écrire.
 * @returns {Blob} Fichier CSV.
 */
export function ecrireCsv(lignes) {
  const texte = lignes.map((l) => l.map(protegerCellule).join(';')).join('\r\n');
  return new Blob([`﻿${texte}\r\n`], { type: 'text/csv;charset=utf-8' });
}
