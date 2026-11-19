/**
 * Themes.js
 * Thèmes clair et sombre, partagés par la page web et le portefeuille mobile.
 * Par défaut le thème suit le réglage de l'appareil ; le bouton soleil / lune
 * force un thème, mémorisé sur cet appareil (localStorage).
 */

const CLE_STOCKAGE = 'cardpro-theme';
const THEMES = ['clair', 'sombre'];
const requeteSombre = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

/**
 * Lit le thème forcé par la personne (s'il existe).
 * @returns {"clair"|"sombre"|null} Thème mémorisé.
 */
function themeMemorise() {
  try {
    const valeur = localStorage.getItem(CLE_STOCKAGE);
    return THEMES.includes(valeur) ? valeur : null;
  } catch {
    return null; // Stockage indisponible (navigation privée…)
  }
}

/**
 * Mémorise le thème choisi.
 * @param {"clair"|"sombre"} theme - Thème.
 */
function memoriserTheme(theme) {
  try {
    localStorage.setItem(CLE_STOCKAGE, theme);
  } catch {
    // Sans stockage, le choix vaut pour cette visite seulement.
  }
}

/**
 * Thème à afficher : celui forcé, sinon celui de l'appareil.
 * @returns {"clair"|"sombre"} Thème.
 */
export function themeActuel() {
  return themeMemorise() || (requeteSombre?.matches ? 'sombre' : 'clair');
}

/**
 * Applique un thème à la page (attribut data-theme et couleur de la barre du téléphone).
 * @param {"clair"|"sombre"} theme - Thème.
 */
function appliquer(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'sombre' ? '#0a0c10' : '#14181f');
  document.dispatchEvent(new CustomEvent('changement-theme', { detail: theme }));
}

/**
 * Applique le thème au démarrage et suit les changements de l'appareil.
 */
export function initialiserTheme() {
  appliquer(themeActuel());
  requeteSombre?.addEventListener('change', () => {
    if (!themeMemorise()) appliquer(themeActuel());
  });
}

/**
 * Crée le bouton qui bascule entre clair et sombre.
 * @returns {HTMLButtonElement} Bouton.
 */
export function creerBoutonTheme() {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'BoutonTheme';
  const actualiser = () => {
    const sombre = themeActuel() === 'sombre';
    bouton.textContent = sombre ? '☀' : '☾';
    bouton.setAttribute('aria-label', sombre ? 'Passer au thème clair' : 'Passer au thème sombre');
    bouton.title = bouton.getAttribute('aria-label');
  };
  bouton.addEventListener('click', () => {
    const nouveau = themeActuel() === 'sombre' ? 'clair' : 'sombre';
    memoriserTheme(nouveau);
    appliquer(nouveau);
  });
  document.addEventListener('changement-theme', actualiser);
  actualiser();
  return bouton;
}
