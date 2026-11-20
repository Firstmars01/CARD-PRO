/**
 * SectionDesignLot.js
 * Section « Changer le design en lot » : toutes les cartes qui utilisent
 * un design passent sur un autre design, en une fois (après confirmation).
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import {
  obtenirEtat, abonner, tousLesModeles, trouverModele, changerModeleEnLot,
} from '../../Metier/EtatApplication.js';
import { creerSection, creerChamp } from '../Champs.js';
import { notifier } from '../Notifications.js';

/**
 * Monte la section du changement de design en lot.
 * @param {HTMLElement} conteneur - Colonne de gauche.
 */
export function monterSectionDesignLot(conteneur) {
  const { section, contenu } = creerSection('Changer le design de plusieurs cartes', false);
  const ancien = creerElement('select', { attributs: { id: 'lot-ancien' } });
  const nouveau = creerElement('select', { attributs: { id: 'lot-nouveau' } });
  const appliquer = creerElement('button', { classe: 'Bouton Bouton--principal', texte: 'Appliquer', attributs: { type: 'button' } });

  // Designs utilisés (avec leur nombre de cartes) et tous les designs.
  const remplir = () => {
    const choixAncien = ancien.value;
    const choixNouveau = nouveau.value;
    vider(ancien);
    vider(nouveau);
    const compte = new Map();
    obtenirEtat().personnes.forEach((p) => compte.set(p.modeleId, (compte.get(p.modeleId) || 0) + 1));
    compte.forEach((nombre, id) => ancien.append(creerElement('option', { texte: `${trouverModele(id).nom} (${nombre} carte${nombre > 1 ? 's' : ''})`, attributs: { value: id } })));
    tousLesModeles().forEach((m) => nouveau.append(creerElement('option', { texte: m.nom, attributs: { value: m.id } })));
    if (choixAncien && compte.has(choixAncien)) ancien.value = choixAncien;
    if (choixNouveau) nouveau.value = choixNouveau;
    appliquer.disabled = compte.size === 0;
  };

  appliquer.addEventListener('click', async () => {
    if (!ancien.value || ancien.value === nouveau.value) {
      notifier('Choisis deux designs différents.', 'info');
      return;
    }
    if (!window.confirm(`Toutes les cartes « ${trouverModele(ancien.value).nom} » passent sur « ${trouverModele(nouveau.value).nom} ». Continuer ?`)) return;
    appliquer.disabled = true;
    try {
      const nombre = await changerModeleEnLot(ancien.value, nouveau.value);
      notifier(`${nombre} carte(s) passée(s) sur « ${trouverModele(nouveau.value).nom} ».`, 'succes');
    } catch (erreur) {
      notifier(erreur.message, 'erreur');
    } finally {
      appliquer.disabled = false;
    }
  });

  contenu.append(
    creerChamp('Cartes avec le design', ancien, 'Champ--large').bloc,
    creerChamp('Nouveau design', nouveau, 'Champ--large').bloc,
    appliquer,
  );
  abonner((type) => { if (type === 'personnes' || type === 'modeles') remplir(); });
  conteneur.append(section);
  remplir();
}
