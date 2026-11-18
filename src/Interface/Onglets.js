/**
 * Onglets.js
 * Gère les onglets Infos / Design / Modèles (accessibles au clavier).
 */

/**
 * Active la navigation par onglets dans un conteneur.
 * Chaque bouton [role=tab] pointe vers son panneau via aria-controls.
 * @param {HTMLElement} barre - Élément contenant les boutons d'onglets.
 */
export function initialiserOnglets(barre) {
  const boutons = Array.from(barre.querySelectorAll('[role="tab"]'));

  /**
   * Sélectionne un onglet et affiche son panneau.
   * @param {HTMLElement} actif - Bouton sélectionné.
   */
  const selectionner = (actif) => {
    boutons.forEach((bouton) => {
      const estActif = bouton === actif;
      bouton.setAttribute('aria-selected', String(estActif));
      bouton.tabIndex = estActif ? 0 : -1;
      document.getElementById(bouton.getAttribute('aria-controls')).hidden = !estActif;
    });
  };

  boutons.forEach((bouton, i) => {
    bouton.addEventListener('click', () => selectionner(bouton));
    bouton.addEventListener('keydown', (evenement) => {
      const decalage = { ArrowRight: 1, ArrowLeft: -1 }[evenement.key];
      if (!decalage) return;
      const suivant = boutons[(i + decalage + boutons.length) % boutons.length];
      suivant.focus();
      selectionner(suivant);
    });
  });
  selectionner(boutons[0]);
}
