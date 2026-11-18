/**
 * Raccourcis.js
 * Raccourcis clavier de l'éditeur de modèles :
 * - flèches : déplacer la sélection de 1 mm (Maj : 5 mm) ;
 * - Suppr / Retour arrière : supprimer ;
 * - Ctrl + C / X / V : copier, couper, coller ;
 * - Ctrl + D : dupliquer ; Ctrl + A : tout sélectionner ;
 * - Ctrl + Maj + C / V : copier / coller le style ;
 * - Ctrl + Z / Y (ou Ctrl + Maj + Z) : annuler / rétablir ; Échap : désélectionner.
 */

import {
  elementsSelectionnes, modifierElements, memoriser, supprimerSelection, dupliquer, copierSelection, coller,
  copierStyle, collerStyle, toutSelectionner, selectionner, annuler, retablir,
} from './EtatEdition.js';
import { notifier } from '../Notifications.js';

/**
 * Déplace la sélection au clavier.
 * @param {number} dx - Déplacement horizontal.
 * @param {number} dy - Déplacement vertical.
 */
function deplacer(dx, dy) {
  const selection = elementsSelectionnes();
  if (!selection.length) return;
  memoriser();
  modifierElements(selection.map((e) => ({ id: e.id, x: e.x + dx, y: e.y + dy })));
}

/**
 * Exécute l'action associée à une touche (si elle existe).
 * @param {KeyboardEvent} e - Événement clavier.
 */
export function gererRaccourci(e) {
  const ctrl = e.ctrlKey || e.metaKey;
  const touche = e.key.toLowerCase();
  const pas = e.shiftKey ? 50 : 10;
  const fleches = { arrowleft: [-pas, 0], arrowright: [pas, 0], arrowup: [0, -pas], arrowdown: [0, pas] };

  let action = null;
  if (fleches[touche]) action = () => deplacer(...fleches[touche]);
  else if (touche === 'delete' || touche === 'backspace') action = supprimerSelection;
  else if (touche === 'escape') action = () => selectionner(null);
  else if (ctrl && e.shiftKey && touche === 'c') action = () => { if (copierStyle()) notifier('Style copié.', 'info'); };
  else if (ctrl && e.shiftKey && touche === 'v') action = collerStyle;
  else if (ctrl && e.shiftKey && touche === 'z') action = retablir;
  else if (ctrl && touche === 'z') action = annuler;
  else if (ctrl && touche === 'y') action = retablir;
  else if (ctrl && touche === 'c') action = copierSelection;
  else if (ctrl && touche === 'x') action = () => { if (copierSelection()) supprimerSelection(); };
  else if (ctrl && touche === 'v') action = () => { if (!coller()) notifier('Rien à coller (ou face pleine).', 'info'); };
  else if (ctrl && touche === 'd') action = () => dupliquer();
  else if (ctrl && touche === 'a') action = toutSelectionner;

  if (action) {
    e.preventDefault();
    action();
  }
}
