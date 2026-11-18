/**
 * ControlesSchema.js
 * Génère automatiquement un formulaire à partir d'un schéma de réglages
 * (couleur, plage, mm, booléen, choix, texte, image). Utilisé pour les
 * propriétés des éléments, du fond et du modèle : aucun code dupliqué.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { chargerImage } from '../../Utilitaires/Image.js';
import { creerChamp } from '../Champs.js';
import { notifier } from '../Notifications.js';

let compteur = 0;

/**
 * Crée le contrôle d'un réglage.
 * @param {object} reglage - Réglage du schéma.
 * @param {(valeur:unknown) => void} surChangement - Appelée à chaque modification.
 * @param {() => void} avantModification - Appelée une fois avant une série de modifications.
 * @returns {{bloc:HTMLElement, afficher:(valeur:unknown) => void}} Contrôle.
 */
function creerControle(reglage, surChangement, avantModification) {
  compteur += 1;
  const id = `reglage-${compteur}`;
  let element;
  let sortie = null;
  let lire;
  let afficher;

  switch (reglage.type) {
    case 'choix':
      element = creerElement('select', { attributs: { id } },
        reglage.options.map(([valeur, libelle]) => creerElement('option', { texte: libelle, attributs: { value: valeur } })));
      lire = () => element.value;
      afficher = (v) => { element.value = String(v); };
      break;
    case 'booleen':
      element = creerElement('input', { attributs: { id, type: 'checkbox' } });
      lire = () => element.checked;
      afficher = (v) => { element.checked = Boolean(v); };
      break;
    case 'couleur':
      element = creerElement('input', { attributs: { id, type: 'color' } });
      lire = () => element.value;
      afficher = (v) => { element.value = String(v); };
      break;
    case 'mm':
      // Saisie en millimètres, stockage en dixièmes de millimètre.
      element = creerElement('input', { attributs: { id, type: 'number', step: 0.5, min: reglage.min / 10, max: reglage.max / 10, inputmode: 'decimal' } });
      lire = () => Math.round(Number(element.value) * 10);
      afficher = (v) => { element.value = String(Number(v) / 10); };
      break;
    case 'plage':
      element = creerElement('input', { attributs: { id, type: 'range', min: reglage.min, max: reglage.max, step: 1 } });
      sortie = creerElement('output', { classe: 'Valeur', attributs: { for: id } });
      lire = () => Number(element.value);
      afficher = (v) => { element.value = String(v); sortie.textContent = String(v); };
      break;
    case 'texte':
      element = reglage.multiligne
        ? creerElement('textarea', { attributs: { id, rows: 2, maxlength: reglage.max } })
        : creerElement('input', { attributs: { id, type: 'text', maxlength: reglage.max } });
      lire = () => element.value;
      afficher = (v) => { element.value = String(v); };
      break;
    case 'image':
      return creerControleImage(reglage, id, surChangement, avantModification);
    default:
      throw new Error(`Type de réglage inconnu : ${reglage.type}`);
  }

  // Une seule entrée d'historique par série de modifications (ex. : glisser un curseur).
  let enCours = false;
  element.addEventListener('input', () => {
    if (!enCours) {
      avantModification();
      enCours = true;
    }
    if (sortie) sortie.textContent = element.value;
    if (reglage.type === 'mm' && element.value === '') return;
    surChangement(lire());
  });
  element.addEventListener('change', () => { enCours = false; });
  element.addEventListener('blur', () => { enCours = false; });

  const { bloc } = creerChamp(reglage.libelle, element, `Champ--${reglage.type}`);
  if (sortie) bloc.append(sortie);
  return { bloc, afficher: (v) => { if (document.activeElement !== element) afficher(v); } };
}

/**
 * Crée le contrôle d'un réglage image (import sécurisé + retrait).
 * @param {object} reglage - Réglage du schéma.
 * @param {string} id - Identifiant du champ.
 * @param {Function} surChangement - Appelée avec la nouvelle image.
 * @param {Function} avantModification - Appelée avant la modification.
 * @returns {{bloc:HTMLElement, afficher:Function}} Contrôle.
 */
function creerControleImage(reglage, id, surChangement, avantModification) {
  const entree = creerElement('input', { attributs: { id, type: 'file', accept: 'image/png,image/jpeg,image/webp' } });
  const miniature = creerElement('img', { classe: 'Miniature', attributs: { alt: '' } });
  const retirer = creerElement('button', {
    classe: 'Bouton Bouton--secondaire Bouton--petit', texte: "Retirer l'image", attributs: { type: 'button' },
    surClic: () => { avantModification(); surChangement(''); },
  });
  entree.addEventListener('change', async () => {
    const [fichier] = entree.files;
    entree.value = '';
    if (!fichier) return;
    try {
      const image = await chargerImage(fichier);
      avantModification();
      surChangement(image);
    } catch (erreur) {
      notifier(erreur.message, 'erreur');
    }
  });
  const { bloc } = creerChamp(reglage.libelle, entree, 'Champ--image');
  bloc.append(creerElement('div', { classe: 'Image-apercu' }, [miniature, retirer]));
  return {
    bloc,
    afficher: (v) => {
      miniature.hidden = !v;
      retirer.hidden = !v;
      if (v) miniature.src = v;
    },
  };
}

/**
 * Crée un formulaire complet pour un schéma, regroupé par sections.
 * @param {object[]} schema - Réglages.
 * @param {object} objet - Valeurs actuelles.
 * @param {object} rappels - { surChangement(cle, valeur), avantModification() }.
 * @returns {{element:HTMLElement, actualiser:(objet:object) => void}} Formulaire.
 */
export function creerFormulaireSchema(schema, objet, { surChangement, avantModification }) {
  const element = creerElement('div', { classe: 'FormulaireSchema' });
  const sections = new Map();
  const controles = schema.map((reglage) => {
    const controle = creerControle(reglage, (valeur) => surChangement(reglage.cle, valeur), avantModification);
    const groupe = reglage.groupe || '';
    if (!sections.has(groupe)) {
      const section = creerElement('fieldset', { classe: 'Groupe' }, groupe ? [creerElement('legend', { texte: groupe })] : []);
      sections.set(groupe, section);
      element.append(section);
    }
    sections.get(groupe).append(controle.bloc);
    return { reglage, ...controle };
  });

  /**
   * Met à jour les valeurs affichées et la visibilité conditionnelle.
   * @param {object} valeurs - Objet à afficher.
   */
  const actualiser = (valeurs) => {
    controles.forEach(({ reglage, bloc, afficher }) => {
      afficher(valeurs[reglage.cle]);
      bloc.hidden = Boolean(reglage.visibleSi && !reglage.visibleSi(valeurs));
    });
  };
  actualiser(objet);
  return { element, actualiser };
}
