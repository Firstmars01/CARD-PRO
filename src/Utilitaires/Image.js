/**
 * Image.js
 * Chargement sécurisé d'une image (logo, fond) : vérifie le type et le poids,
 * puis le redessine dans un canvas. Le ré-encodage en PNG supprime tout
 * contenu caché (métadonnées, scripts) : seuls les pixels sont conservés.
 */

const TYPES_AUTORISES = ['image/png', 'image/jpeg', 'image/webp'];
const POIDS_MAX = 8 * 1024 * 1024; // 8 Mo
const DIMENSION_MAX = 1200; // pixels (≈ 360 dpi sur une carte)
const POIDS_MAX_ENCODE = 1400000; // caractères de la data URL (≈ 1 Mo)

/**
 * Vérifie puis convertit un fichier image en data URL redimensionnée.
 * @param {File} fichier - Fichier choisi par l'utilisateur.
 * @returns {Promise<string>} Data URL PNG.
 * @throws {Error} Si le fichier n'est pas une image autorisée.
 */
export async function chargerImage(fichier) {
  if (!fichier || !TYPES_AUTORISES.includes(fichier.type)) {
    throw new Error('Format refusé : utilise une image PNG, JPEG ou WebP.');
  }
  if (fichier.size > POIDS_MAX) throw new Error('Image trop lourde (8 Mo maximum).');
  if (!(await verifierSignature(fichier))) throw new Error("Le fichier n'est pas une image valide.");

  const image = await decoderImage(fichier);
  const echelle = Math.min(1, DIMENSION_MAX / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * echelle));
  canvas.height = Math.max(1, Math.round(image.height * echelle));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  if (typeof image.close === 'function') image.close();
  return encoderCanvas(canvas);
}

/**
 * Encode le canvas en PNG, ou en WebP si le PNG est trop lourd
 * (le WebP garde la transparence et pèse beaucoup moins).
 * @param {HTMLCanvasElement} canvas - Canvas contenant l'image.
 * @returns {string} Data URL de l'image.
 * @throws {Error} Si l'image reste trop lourde.
 */
function encoderCanvas(canvas) {
  const png = canvas.toDataURL('image/png');
  if (png.length <= POIDS_MAX_ENCODE) return png;
  const webp = canvas.toDataURL('image/webp', 0.9);
  if (webp.startsWith('data:image/webp') && webp.length <= POIDS_MAX_ENCODE) return webp;
  const jpeg = canvas.toDataURL('image/jpeg', 0.9);
  if (jpeg.length <= POIDS_MAX_ENCODE) return jpeg;
  throw new Error('Image trop détaillée : utilise une image plus légère.');
}

/**
 * Vérifie les premiers octets du fichier (signature réelle du format).
 * @param {File} fichier - Fichier à contrôler.
 * @returns {Promise<boolean>} true si la signature correspond à PNG, JPEG ou WebP.
 */
async function verifierSignature(fichier) {
  const o = new Uint8Array(await fichier.slice(0, 12).arrayBuffer());
  const png = o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47;
  const jpeg = o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff;
  const webp = o[0] === 0x52 && o[1] === 0x49 && o[2] === 0x46 && o[3] === 0x46
    && o[8] === 0x57 && o[9] === 0x45 && o[10] === 0x42 && o[11] === 0x50;
  return png || jpeg || webp;
}

/**
 * Décode un fichier image en objet dessinable.
 * @param {File} fichier - Fichier image.
 * @returns {Promise<ImageBitmap|HTMLImageElement>} Image décodée.
 */
async function decoderImage(fichier) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(fichier);
  const url = URL.createObjectURL(fichier);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Réduit une image (data URL déjà validée) à une hauteur maximale, en PNG.
 * Sert au logo de la signature e-mail (fichier léger).
 * @param {string} dataUrl - Image source.
 * @param {number} hauteurMax - Hauteur maximale en pixels.
 * @returns {Promise<string>} Data URL PNG réduite.
 */
export async function reduireImage(dataUrl, hauteurMax) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const echelle = Math.min(1, hauteurMax / image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * echelle));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * echelle));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

const COTE_PHOTO = 240; // Photo de profil : 240 × 240 px (≈ 20 mm à 300 dpi).

/**
 * Charge une image choisie comme photo de profil : vérifiée comme les autres
 * images, recadrée en carré au centre puis réduite (fichier léger).
 * @param {File} fichier - Image choisie par l'utilisateur.
 * @returns {Promise<string>} Data URL (WebP, ou JPEG si WebP indisponible).
 */
export async function chargerPhotoProfil(fichier) {
  const image = new Image();
  image.src = await chargerImage(fichier);
  await image.decode();
  const cote = Math.min(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = COTE_PHOTO;
  canvas.height = COTE_PHOTO;
  canvas.getContext('2d').drawImage(image, (image.naturalWidth - cote) / 2, (image.naturalHeight - cote) / 2, cote, cote, 0, 0, COTE_PHOTO, COTE_PHOTO);
  const webp = canvas.toDataURL('image/webp', 0.85);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Découpe une image en rond (coins transparents), en PNG : la signature
 * e-mail ne peut pas arrondir une image elle-même dans Outlook.
 * @param {string} dataUrl - Image source (carrée de préférence).
 * @param {number} taille - Côté en pixels.
 * @returns {Promise<string>} Data URL PNG.
 */
export async function decouperEnRond(dataUrl, taille) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = taille;
  canvas.height = taille;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(taille / 2, taille / 2, taille / 2, 0, Math.PI * 2);
  ctx.clip();
  const cote = Math.min(image.naturalWidth, image.naturalHeight);
  ctx.drawImage(image, (image.naturalWidth - cote) / 2, (image.naturalHeight - cote) / 2, cote, cote, 0, 0, taille, taille);
  return canvas.toDataURL('image/png');
}

/**
 * Convertit une image (data URL) en JPEG, format de photo lu par tous les carnets d'adresses.
 * @param {string} dataUrl - Image source.
 * @returns {Promise<string>} Contenu JPEG en Base64 (sans « data:… »).
 */
export async function convertirEnJpegBase64(dataUrl) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}
