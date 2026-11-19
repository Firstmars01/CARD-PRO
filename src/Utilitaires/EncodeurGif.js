/**
 * EncodeurGif.js
 * Création d'un GIF animé en noir et blanc (norme GIF89a), sans dépendance.
 * Il peut transporter un bloc de données privé (« extension d'application ») :
 * les lecteurs d'images l'ignorent, mais le portefeuille Card Pro s'en sert
 * pour importer la carte instantanément, sans avoir à lire les QR codes.
 */

const BLANC_NOIR = [255, 255, 255, 0, 0, 0]; // Palette : 0 = blanc, 1 = noir

/**
 * Petit tampon d'octets extensible.
 */
class Tampon {
  /** Crée un tampon vide. */
  constructor() {
    this.octets = [];
  }

  /**
   * Ajoute des octets.
   * @param {...number} valeurs - Octets (0 à 255).
   */
  ajouter(...valeurs) {
    valeurs.forEach((v) => this.octets.push(v & 0xff));
  }

  /**
   * Ajoute un entier sur 2 octets (petit-boutiste, comme le veut le GIF).
   * @param {number} valeur - Entier (0 à 65535).
   */
  ajouterEntier16(valeur) {
    this.ajouter(valeur & 0xff, valeur >> 8);
  }

  /**
   * Ajoute un texte ASCII.
   * @param {string} texte - Texte ASCII.
   */
  ajouterTexte(texte) {
    [...texte].forEach((c) => this.ajouter(c.charCodeAt(0)));
  }

  /**
   * Ajoute des données en sous-blocs de 255 octets maximum, puis le bloc vide final.
   * @param {ArrayLike<number>} donnees - Données.
   */
  ajouterSousBlocs(donnees) {
    for (let i = 0; i < donnees.length; i += 255) {
      const fin = Math.min(i + 255, donnees.length);
      this.ajouter(fin - i);
      for (let j = i; j < fin; j++) this.octets.push(donnees[j]);
    }
    this.ajouter(0);
  }
}

/**
 * Compresse les pixels d'une image avec l'algorithme LZW du GIF.
 * @param {Uint8Array} pixels - Index de couleur de chaque pixel (0 ou 1).
 * @param {number} tailleMin - Taille minimale des codes (2 pour une palette de 2 couleurs).
 * @returns {number[]} Données compressées.
 */
function compresserLzw(pixels, tailleMin) {
  const codeEffacement = 1 << tailleMin;
  const codeFin = codeEffacement + 1;
  const sortie = [];
  let tampon = 0;
  let bitsEnAttente = 0;
  let tailleCode = tailleMin + 1;
  let dictionnaire = new Map();
  let prochainCode = codeFin + 1;

  // Écrit un code (bits de poids faible en premier).
  const ecrire = (code) => {
    tampon |= code << bitsEnAttente;
    bitsEnAttente += tailleCode;
    while (bitsEnAttente >= 8) {
      sortie.push(tampon & 0xff);
      tampon >>= 8;
      bitsEnAttente -= 8;
    }
  };
  // Repart d'un dictionnaire vide.
  const effacer = () => {
    ecrire(codeEffacement);
    dictionnaire = new Map();
    prochainCode = codeFin + 1;
    tailleCode = tailleMin + 1;
  };

  effacer();
  let chaine = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const pixel = pixels[i];
    const cle = chaine * 4096 + pixel;
    const existant = dictionnaire.get(cle);
    if (existant !== undefined) {
      chaine = existant;
      continue;
    }
    ecrire(chaine);
    if (prochainCode === 4096) {
      effacer();
    } else {
      dictionnaire.set(cle, prochainCode);
      if (prochainCode === 1 << tailleCode) tailleCode += 1;
      prochainCode += 1;
    }
    chaine = pixel;
  }
  ecrire(chaine);
  ecrire(codeFin);
  if (bitsEnAttente > 0) sortie.push(tampon & 0xff);
  return sortie;
}

/**
 * Crée un GIF animé noir et blanc qui tourne en boucle.
 * @param {{largeur:number, hauteur:number, pixels:Uint8Array}[]} images - Images de même taille (0 = blanc, 1 = noir).
 * @param {{delai?:number, application?:{identifiant:string, octets:Uint8Array}}} [options] -
 *   delai : durée de chaque image en centièmes de seconde ;
 *   application : bloc de données privé (identifiant de 11 caractères ASCII).
 * @returns {Uint8Array} Fichier GIF.
 */
export function creerGifAnime(images, options = {}) {
  const { largeur, hauteur } = images[0];
  const delai = Math.max(2, Math.round(options.delai || 20));
  const gif = new Tampon();

  // En-tête et écran logique avec une palette globale de 2 couleurs.
  gif.ajouterTexte('GIF89a');
  gif.ajouterEntier16(largeur);
  gif.ajouterEntier16(hauteur);
  gif.ajouter(0x80, 0, 0);
  gif.ajouter(...BLANC_NOIR);

  // Lecture en boucle infinie (extension NETSCAPE2.0).
  gif.ajouter(0x21, 0xff, 11);
  gif.ajouterTexte('NETSCAPE2.0');
  gif.ajouter(3, 1, 0, 0, 0);

  // Bloc de données privé (la carte complète).
  if (options.application) {
    gif.ajouter(0x21, 0xff, 11);
    gif.ajouterTexte(options.application.identifiant.padEnd(11, ' ').slice(0, 11));
    gif.ajouterSousBlocs(options.application.octets);
  }

  images.forEach((image) => {
    // Durée d'affichage de l'image.
    gif.ajouter(0x21, 0xf9, 4, 0x04);
    gif.ajouterEntier16(delai);
    gif.ajouter(0, 0);
    // Image pleine taille, sans palette locale.
    gif.ajouter(0x2c);
    gif.ajouterEntier16(0);
    gif.ajouterEntier16(0);
    gif.ajouterEntier16(image.largeur);
    gif.ajouterEntier16(image.hauteur);
    gif.ajouter(0);
    gif.ajouter(2);
    gif.ajouterSousBlocs(compresserLzw(image.pixels, 2));
  });

  gif.ajouter(0x3b);
  return Uint8Array.from(gif.octets);
}
