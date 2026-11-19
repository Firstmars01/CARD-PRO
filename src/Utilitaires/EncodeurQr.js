/**
 * EncodeurQr.js
 * Encodeur de QR code autonome (norme ISO/IEC 18004), sans dépendance externe.
 * Il encode un texte en mode « octets » (UTF-8) ou « alphanumérique » (chiffres,
 * majuscules et  $%*+-./: — plus compact), choisit automatiquement la plus
 * petite version (1 à 40) et le meilleur masque, puis renvoie la grille de modules.
 * Algorithme inspiré de la référence publique de Project Nayuki (licence MIT).
 */

// Niveaux de correction d'erreur : index dans les tables + bits de format.
const NIVEAUX = {
  L: { index: 0, bitsFormat: 1 },
  M: { index: 1, bitsFormat: 0 },
  Q: { index: 2, bitsFormat: 3 },
  H: { index: 3, bitsFormat: 2 },
};

// Nombre d'octets de correction par bloc, par niveau puis par version.
const ECC_PAR_BLOC = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

// Nombre de blocs de correction, par niveau puis par version.
const NOMBRE_BLOCS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

// Jeu de caractères du mode alphanumérique (l'index = la valeur codée).
const ALPHANUMERIQUE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const EST_ALPHANUMERIQUE = /^[0-9A-Z $%*+\-./:]*$/;

/**
 * Encode un texte en QR code.
 * @param {string} texte - Texte à encoder (UTF-8).
 * @param {"L"|"M"|"Q"|"H"} [niveau="M"] - Niveau minimal de correction d'erreur.
 * @param {{versionMin?:number}} [options] - versionMin : version minimale (pour des QR de même taille).
 * @returns {{version:number, taille:number, modules:boolean[][]}} Grille (true = module sombre).
 * @throws {Error} Si le texte est trop long pour un QR code.
 */
export function encoderTexteQr(texte, niveau = 'M', options = {}) {
  const segment = creerSegment(String(texte));
  const niveauChoisi = NIVEAUX[niveau] ? niveau : 'M';
  const versionMin = Math.min(40, Math.max(1, Math.floor(Number(options.versionMin) || 1)));
  const version = choisirVersion(segment, NIVEAUX[niveauChoisi].index, versionMin);
  const donnees = construireCodewords(segment, version, NIVEAUX[niveauChoisi].index);
  const matrice = construireMatrice(version, NIVEAUX[niveauChoisi], donnees);
  return { version, taille: matrice.taille, modules: matrice.modules };
}

/**
 * Prépare le segment de données : mode alphanumérique si possible, sinon octets.
 * @param {string} texte - Texte à encoder.
 * @returns {{alphanumerique:boolean, longueur:number, valeurs:number[]}} Segment.
 */
function creerSegment(texte) {
  if (texte.length && EST_ALPHANUMERIQUE.test(texte)) {
    return { alphanumerique: true, longueur: texte.length, valeurs: [...texte].map((c) => ALPHANUMERIQUE.indexOf(c)) };
  }
  const octets = Array.from(new TextEncoder().encode(texte));
  return { alphanumerique: false, longueur: octets.length, valeurs: octets };
}

/**
 * Nombre de bits du compteur de caractères selon le mode et la version.
 * @param {boolean} alphanumerique - Mode alphanumérique.
 * @param {number} version - Version du QR.
 * @returns {number} Nombre de bits.
 */
function bitsCompteur(alphanumerique, version) {
  if (alphanumerique) return version <= 9 ? 9 : version <= 26 ? 11 : 13;
  return version <= 9 ? 8 : 16;
}

/**
 * Nombre de bits occupés par les données (2 caractères = 11 bits en alphanumérique).
 * @param {{alphanumerique:boolean, longueur:number}} segment - Segment.
 * @returns {number} Nombre de bits.
 */
function bitsDonnees(segment) {
  if (!segment.alphanumerique) return segment.longueur * 8;
  return Math.floor(segment.longueur / 2) * 11 + (segment.longueur % 2) * 6;
}

/**
 * Cherche la plus petite version capable de contenir les données.
 * @param {object} segment - Segment à encoder.
 * @param {number} indexNiveau - Index du niveau de correction.
 * @param {number} [versionMin=1] - Version minimale.
 * @returns {number} Version (1 à 40).
 */
function choisirVersion(segment, indexNiveau, versionMin = 1) {
  for (let version = versionMin; version <= 40; version++) {
    const bitsUtiles = 4 + bitsCompteur(segment.alphanumerique, version) + bitsDonnees(segment);
    if (bitsUtiles <= nombreCodewordsDonnees(version, indexNiveau) * 8) return version;
  }
  throw new Error('Données trop longues pour un QR code.');
}

/**
 * Construit les codewords de données (en-tête + données + remplissage).
 * @param {object} segment - Segment (mode, longueur, valeurs).
 * @param {number} version - Version du QR.
 * @param {number} indexNiveau - Index du niveau de correction.
 * @returns {number[]} Codewords de données.
 */
function construireCodewords(segment, version, indexNiveau) {
  const bits = [];
  const ajouterBits = (valeur, longueur) => {
    for (let i = longueur - 1; i >= 0; i--) bits.push((valeur >>> i) & 1);
  };
  const { alphanumerique, longueur, valeurs } = segment;
  ajouterBits(alphanumerique ? 0b0010 : 0b0100, 4); // Mode alphanumérique ou « octets »
  ajouterBits(longueur, bitsCompteur(alphanumerique, version));
  if (alphanumerique) {
    // Les caractères sont codés par paires (45 × a + b sur 11 bits), le dernier seul sur 6 bits.
    for (let i = 0; i + 1 < longueur; i += 2) ajouterBits(valeurs[i] * 45 + valeurs[i + 1], 11);
    if (longueur % 2) ajouterBits(valeurs[longueur - 1], 6);
  } else {
    valeurs.forEach((octet) => ajouterBits(octet, 8));
  }

  // Terminateur, alignement sur l'octet, puis octets de remplissage.
  const capacite = nombreCodewordsDonnees(version, indexNiveau) * 8;
  ajouterBits(0, Math.min(4, capacite - bits.length));
  ajouterBits(0, (8 - (bits.length % 8)) % 8);
  for (let rempl = 0xec; bits.length < capacite; rempl ^= 0xec ^ 0x11) ajouterBits(rempl, 8);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }
  return codewords;
}

/**
 * Nombre de modules disponibles pour les données (hors motifs fixes).
 * @param {number} version - Version du QR.
 * @returns {number} Nombre de modules.
 */
function nombreModulesBruts(version) {
  let resultat = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const nbAlignements = Math.floor(version / 7) + 2;
    resultat -= (25 * nbAlignements - 10) * nbAlignements - 55;
    if (version >= 7) resultat -= 36;
  }
  return resultat;
}

/**
 * Nombre de codewords de données pour une version et un niveau.
 * @param {number} version - Version du QR.
 * @param {number} indexNiveau - Index du niveau de correction.
 * @returns {number} Nombre de codewords.
 */
function nombreCodewordsDonnees(version, indexNiveau) {
  return Math.floor(nombreModulesBruts(version) / 8)
    - ECC_PAR_BLOC[indexNiveau][version] * NOMBRE_BLOCS[indexNiveau][version];
}

/**
 * Multiplication dans le corps de Galois GF(256) (polynôme 0x11D).
 * @param {number} x - Premier facteur.
 * @param {number} y - Second facteur.
 * @returns {number} Produit.
 */
function multiplierGf(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

/**
 * Calcule le polynôme générateur de Reed-Solomon.
 * @param {number} degre - Nombre d'octets de correction.
 * @returns {number[]} Coefficients du diviseur.
 */
function diviseurReedSolomon(degre) {
  const resultat = new Array(degre).fill(0);
  resultat[degre - 1] = 1;
  let racine = 1;
  for (let i = 0; i < degre; i++) {
    for (let j = 0; j < resultat.length; j++) {
      resultat[j] = multiplierGf(resultat[j], racine);
      if (j + 1 < resultat.length) resultat[j] ^= resultat[j + 1];
    }
    racine = multiplierGf(racine, 0x02);
  }
  return resultat;
}

/**
 * Calcule les octets de correction Reed-Solomon d'un bloc.
 * @param {number[]} donnees - Bloc de données.
 * @param {number[]} diviseur - Polynôme générateur.
 * @returns {number[]} Octets de correction.
 */
function resteReedSolomon(donnees, diviseur) {
  const resultat = new Array(diviseur.length).fill(0);
  donnees.forEach((octet) => {
    const facteur = octet ^ resultat.shift();
    resultat.push(0);
    diviseur.forEach((coef, i) => { resultat[i] ^= multiplierGf(coef, facteur); });
  });
  return resultat;
}

/**
 * Découpe les données en blocs, ajoute la correction et entrelace le tout.
 * @param {number[]} donnees - Codewords de données.
 * @param {number} version - Version du QR.
 * @param {number} indexNiveau - Index du niveau de correction.
 * @returns {number[]} Codewords finaux.
 */
function ajouterCorrection(donnees, version, indexNiveau) {
  const nbBlocs = NOMBRE_BLOCS[indexNiveau][version];
  const longueurEcc = ECC_PAR_BLOC[indexNiveau][version];
  const totalCodewords = Math.floor(nombreModulesBruts(version) / 8);
  const nbBlocsCourts = nbBlocs - (totalCodewords % nbBlocs);
  const longueurBlocCourt = Math.floor(totalCodewords / nbBlocs);
  const diviseur = diviseurReedSolomon(longueurEcc);

  const blocs = [];
  for (let i = 0, k = 0; i < nbBlocs; i++) {
    const longueur = longueurBlocCourt - longueurEcc + (i < nbBlocsCourts ? 0 : 1);
    const bloc = donnees.slice(k, k + longueur);
    k += longueur;
    const ecc = resteReedSolomon(bloc, diviseur);
    if (i < nbBlocsCourts) bloc.push(0);
    blocs.push(bloc.concat(ecc));
  }

  // Entrelacement colonne par colonne (en sautant l'octet fictif des blocs courts).
  const resultat = [];
  for (let i = 0; i < blocs[0].length; i++) {
    blocs.forEach((bloc, j) => {
      if (i !== longueurBlocCourt - longueurEcc || j >= nbBlocsCourts) resultat.push(bloc[i]);
    });
  }
  return resultat;
}

/**
 * Construit la matrice complète : motifs fixes, données, masque et format.
 * @param {number} version - Version du QR.
 * @param {{index:number, bitsFormat:number}} niveau - Niveau de correction.
 * @param {number[]} donnees - Codewords de données.
 * @returns {{taille:number, modules:boolean[][]}} Matrice finale.
 */
function construireMatrice(version, niveau, donnees) {
  const taille = version * 4 + 17;
  const grille = {
    taille,
    modules: Array.from({ length: taille }, () => new Array(taille).fill(false)),
    fixes: Array.from({ length: taille }, () => new Array(taille).fill(false)),
  };

  dessinerMotifsFixes(grille, version, niveau);
  dessinerDonnees(grille, ajouterCorrection(donnees, version, niveau.index));

  // Essaie les 8 masques et garde celui qui a la plus petite pénalité.
  let meilleurMasque = 0;
  let meilleurScore = Infinity;
  for (let masque = 0; masque < 8; masque++) {
    appliquerMasque(grille, masque);
    dessinerFormat(grille, niveau, masque);
    const score = calculerPenalite(grille);
    if (score < meilleurScore) {
      meilleurScore = score;
      meilleurMasque = masque;
    }
    appliquerMasque(grille, masque); // Annule le masque (XOR).
  }
  appliquerMasque(grille, meilleurMasque);
  dessinerFormat(grille, niveau, meilleurMasque);
  return { taille, modules: grille.modules };
}

/**
 * Place un module fixe (non modifiable par le masque).
 * @param {object} grille - Grille en cours.
 * @param {number} x - Colonne.
 * @param {number} y - Ligne.
 * @param {boolean} sombre - Couleur du module.
 */
function placerFixe(grille, x, y, sombre) {
  grille.modules[y][x] = sombre;
  grille.fixes[y][x] = true;
}

/**
 * Dessine les motifs de repérage, de synchronisation, d'alignement et de version.
 * @param {object} grille - Grille en cours.
 * @param {number} version - Version du QR.
 * @param {object} niveau - Niveau de correction.
 */
function dessinerMotifsFixes(grille, version, niveau) {
  const { taille } = grille;
  for (let i = 0; i < taille; i++) {
    placerFixe(grille, 6, i, i % 2 === 0);
    placerFixe(grille, i, 6, i % 2 === 0);
  }

  // Trois motifs de repérage (coins).
  [[3, 3], [taille - 4, 3], [3, taille - 4]].forEach(([cx, cy]) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < taille && y >= 0 && y < taille) {
          placerFixe(grille, x, y, distance !== 2 && distance !== 4);
        }
      }
    }
  });

  // Motifs d'alignement (sauf sur les trois coins de repérage).
  const positions = positionsAlignement(version, taille);
  const n = positions.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const surCoin = (i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0);
      if (surCoin) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          placerFixe(grille, positions[i] + dx, positions[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  dessinerFormat(grille, niveau, 0); // Réserve les zones de format.
  dessinerVersion(grille, version);
}

/**
 * Calcule les positions des centres des motifs d'alignement.
 * @param {number} version - Version du QR.
 * @param {number} taille - Taille de la matrice.
 * @returns {number[]} Positions.
 */
function positionsAlignement(version, taille) {
  if (version === 1) return [];
  const nb = Math.floor(version / 7) + 2;
  const pas = Math.floor((version * 8 + nb * 3 + 5) / (nb * 4 - 4)) * 2;
  const resultat = [6];
  for (let pos = taille - 7; resultat.length < nb; pos -= pas) resultat.splice(1, 0, pos);
  return resultat;
}

/**
 * Dessine les bits de format (niveau + masque), en double exemplaire.
 * @param {object} grille - Grille en cours.
 * @param {object} niveau - Niveau de correction.
 * @param {number} masque - Numéro du masque.
 */
function dessinerFormat(grille, niveau, masque) {
  const { taille } = grille;
  const donnees = (niveau.bitsFormat << 3) | masque;
  let reste = donnees;
  for (let i = 0; i < 10; i++) reste = (reste << 1) ^ ((reste >>> 9) * 0x537);
  const bits = ((donnees << 10) | reste) ^ 0x5412;
  const bit = (i) => ((bits >>> i) & 1) !== 0;

  for (let i = 0; i <= 5; i++) placerFixe(grille, 8, i, bit(i));
  placerFixe(grille, 8, 7, bit(6));
  placerFixe(grille, 8, 8, bit(7));
  placerFixe(grille, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) placerFixe(grille, 14 - i, 8, bit(i));

  for (let i = 0; i < 8; i++) placerFixe(grille, taille - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) placerFixe(grille, 8, taille - 15 + i, bit(i));
  placerFixe(grille, 8, taille - 8, true); // Module toujours sombre.
}

/**
 * Dessine les blocs d'information de version (versions 7 et plus).
 * @param {object} grille - Grille en cours.
 * @param {number} version - Version du QR.
 */
function dessinerVersion(grille, version) {
  if (version < 7) return;
  let reste = version;
  for (let i = 0; i < 12; i++) reste = (reste << 1) ^ ((reste >>> 11) * 0x1f25);
  const bits = (version << 12) | reste;
  for (let i = 0; i < 18; i++) {
    const sombre = ((bits >>> i) & 1) !== 0;
    const a = grille.taille - 11 + (i % 3);
    const b = Math.floor(i / 3);
    placerFixe(grille, a, b, sombre);
    placerFixe(grille, b, a, sombre);
  }
}

/**
 * Place les bits de données en zigzag dans les modules libres.
 * @param {object} grille - Grille en cours.
 * @param {number[]} codewords - Codewords finaux.
 */
function dessinerDonnees(grille, codewords) {
  const { taille } = grille;
  let i = 0;
  for (let droite = taille - 1; droite >= 1; droite -= 2) {
    if (droite === 6) droite = 5; // Saute la colonne de synchronisation.
    for (let vert = 0; vert < taille; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = droite - j;
        const montant = ((droite + 1) & 2) === 0;
        const y = montant ? taille - 1 - vert : vert;
        if (!grille.fixes[y][x] && i < codewords.length * 8) {
          grille.modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }
}

/**
 * Applique (ou retire, car XOR) un masque sur les modules de données.
 * @param {object} grille - Grille en cours.
 * @param {number} masque - Numéro du masque (0 à 7).
 */
function appliquerMasque(grille, masque) {
  const regles = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const regle = regles[masque];
  for (let y = 0; y < grille.taille; y++) {
    for (let x = 0; x < grille.taille; x++) {
      if (!grille.fixes[y][x] && regle(x, y)) grille.modules[y][x] = !grille.modules[y][x];
    }
  }
}

/**
 * Calcule la pénalité d'une matrice (règles 1 à 4 de la norme).
 * @param {object} grille - Grille masquée.
 * @returns {number} Score (plus petit = meilleur).
 */
function calculerPenalite(grille) {
  const { taille, modules } = grille;
  let score = 0;
  let sombres = 0;
  const motifA = [true, false, true, true, true, false, true, false, false, false, false];
  const motifB = [false, false, false, false, true, false, true, true, true, false, true];

  // Lit une ligne (horizontale) ou une colonne (verticale).
  const lire = (index, horizontal) => Array.from({ length: taille }, (_, k) => (horizontal ? modules[index][k] : modules[k][index]));

  for (let index = 0; index < taille; index++) {
    [true, false].forEach((horizontal) => {
      const ligne = lire(index, horizontal);
      // Règle 1 : suites de 5 modules identiques ou plus.
      let suite = 1;
      for (let k = 1; k <= taille; k++) {
        if (k < taille && ligne[k] === ligne[k - 1]) {
          suite++;
        } else {
          if (suite >= 5) score += 3 + (suite - 5);
          suite = 1;
        }
      }
      // Règle 3 : motifs ressemblant aux repères.
      for (let k = 0; k + 11 <= taille; k++) {
        const morceau = ligne.slice(k, k + 11);
        if (morceau.every((v, m) => v === motifA[m]) || morceau.every((v, m) => v === motifB[m])) score += 40;
      }
    });
  }

  // Règle 2 : blocs 2x2 de même couleur. Règle 4 : équilibre clair/sombre.
  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      if (modules[y][x]) sombres++;
      if (x < taille - 1 && y < taille - 1) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
      }
    }
  }
  const total = taille * taille;
  const k = Math.ceil(Math.abs(sombres * 20 - total * 10) / total) - 1;
  score += Math.max(0, k) * 10;
  return score;
}
