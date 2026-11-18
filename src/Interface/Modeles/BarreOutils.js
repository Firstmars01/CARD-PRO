/**
 * BarreOutils.js
 * Barres d'outils de l'éditeur :
 * - ligne 1 : face (recto / verso), ajout d'éléments, annuler / rétablir,
 *   grille et personne utilisée pour l'aperçu ;
 * - ligne 2 (selon la sélection) : copier / coller, dupliquer, supprimer,
 *   copier / coller le style, aligner, centrer sur la carte, répartir.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { chargerImage } from '../../Utilitaires/Image.js';
import { nomComplet } from '../../Metier/Personne.js';
import { COTES } from '../../Metier/ModeleCarte.js';
import { obtenirEtat, abonner } from '../../Metier/EtatApplication.js';
import {
  obtenirEdition, abonnerEdition, choisirCote, ajouterElement, ajouterGroupe, annuler, retablir, modifierOptions, copierSurAutreFace,
  contenuPressePapiers, copierSelection, coller, dupliquer, supprimerSelection, copierStyle, collerStyle,
  alignerSelection, centrerSelection, repartirSelection,
} from './EtatEdition.js';
import { icone } from '../Icones.js';
import { notifier } from '../Notifications.js';

// Boutons d'ajout : [icône, libellé, type, valeurs initiales].
const AJOUTS = [
  ['information', 'Information', 'texte', { champ: 'nomComplet', taille: 40, graisse: '700' }],
  ['texte', 'Texte', 'texte', { source: 'libre', texte: 'Votre texte', taille: 28 }],
  ['qr', 'QR code', 'qr', {}],
  ['forme', 'Forme', 'forme', { forme: 'rectangle' }],
];

// « QR des liens » : 3 QR codes (liens 1 à 3) avec le nom du lien en dessous.
const QR_LIENS = { nombre: 3, taille: 160, ecart: 50, y: 230 };

/**
 * Prépare les éléments du groupe « QR des liens », centré sur la carte.
 * @returns {Array<[string, object]>} Définitions des éléments.
 */
function definitionsQrLiens() {
  const { nombre, taille, ecart, y } = QR_LIENS;
  const depart = Math.round((850 - nombre * taille - (nombre - 1) * ecart) / 2);
  return Array.from({ length: nombre }, (_, i) => {
    const x = depart + i * (taille + ecart);
    return [
      ['qr', { x, y, largeur: taille, hauteur: taille, contenu: 'lien', numeroLien: i + 1 }],
      ['texte', { x, y: y + taille + 12, largeur: taille, hauteur: 30, champ: `lien${i + 1}`, taille: 18, alignement: 'middle' }],
    ];
  }).flat();
}

/**
 * Crée un bouton avec icône (et libellé facultatif).
 * @param {object} options - { icone, libelle, titre, action, classe }.
 * @returns {HTMLButtonElement} Bouton.
 */
function boutonOutil({ icone: nom, libelle = '', titre, action, classe = '' }) {
  return creerElement('button', {
    classe: `Outil ${classe}`.trim(),
    attributs: { type: 'button', title: titre, 'aria-label': titre },
    surClic: action,
  }, [icone(nom), libelle ? creerElement('span', { texte: libelle }) : null]);
}

/**
 * Regroupe des boutons avec un titre.
 * @param {string} titre - Titre du groupe.
 * @param {HTMLElement[]} enfants - Boutons.
 * @returns {HTMLElement} Groupe.
 */
function groupe(titre, enfants) {
  return creerElement('div', { classe: 'Outils-groupe', attributs: { role: 'group', 'aria-label': titre } }, [
    creerElement('span', { classe: 'Outils-libelle', texte: titre }), ...enfants,
  ]);
}

/**
 * Monte les barres d'outils.
 * @param {HTMLElement} conteneur - Zone des barres.
 */
export function monterBarreOutils(conteneur) {
  const ajouter = (type, valeurs) => {
    if (!ajouterElement(type, valeurs)) notifier('Maximum 40 éléments par face.', 'erreur');
  };

  // Recto / verso.
  const boutonsCote = Object.entries(COTES).map(([cote, libelle]) => creerElement('button', {
    classe: 'Segment', texte: libelle, attributs: { type: 'button', 'data-cote': cote }, surClic: () => choisirCote(cote),
  }));

  // Ajout d'une image : choix du fichier puis import sécurisé.
  const entreeImage = creerElement('input', { classe: 'Masque', attributs: { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': 'Ajouter une image' } });
  entreeImage.addEventListener('change', async () => {
    const [fichier] = entreeImage.files;
    entreeImage.value = '';
    if (!fichier) return;
    try {
      ajouter('image', { image: await chargerImage(fichier), largeur: 250, hauteur: 120 });
    } catch (erreur) {
      notifier(erreur.message, 'erreur');
    }
  });

  const grille = creerElement('input', { attributs: { type: 'checkbox', id: 'option-grille' } });
  grille.addEventListener('change', () => modifierOptions({ grille: grille.checked }));
  const apercu = creerElement('select', { attributs: { id: 'option-apercu', 'aria-label': "Personne affichée dans l'aperçu" } });
  apercu.addEventListener('change', () => modifierOptions({ personneApercuId: apercu.value }));

  const boutonsAjout = [
    ...AJOUTS.map(([nom, libelle, type, valeurs]) => boutonOutil({ icone: nom, libelle, titre: `Ajouter : ${libelle}`, action: () => ajouter(type, valeurs), classe: 'Outil--ajout' })),
    boutonOutil({ icone: 'image', libelle: 'Image', titre: 'Ajouter : image', action: () => entreeImage.click(), classe: 'Outil--ajout' }),
    boutonOutil({
      icone: 'qr', libelle: 'QR des liens', titre: 'Ajouter un QR code par lien (liens 1 à 3) avec leur nom', classe: 'Outil--ajout',
      action: () => { if (!ajouterGroupe(definitionsQrLiens())) notifier('Maximum 40 éléments par face.', 'erreur'); },
    }),
  ];

  // Ligne 2 : actions sur la sélection (activées selon le contexte).
  const actions = {
    copier: boutonOutil({ icone: 'copier', titre: 'Copier (Ctrl + C)', action: copierSelection }),
    coller: boutonOutil({ icone: 'coller', titre: 'Coller (Ctrl + V)', action: () => { if (!coller()) notifier('Face pleine (40 éléments).', 'erreur'); } }),
    dupliquer: boutonOutil({ icone: 'dupliquer', titre: 'Dupliquer (Ctrl + D)', action: () => dupliquer() }),
    supprimer: boutonOutil({ icone: 'supprimer', titre: 'Supprimer (Suppr)', action: supprimerSelection }),
    copierStyle: boutonOutil({ icone: 'copierStyle', libelle: 'Copier le style', titre: "Copier le style de l'élément (Ctrl + Maj + C)", action: () => { if (copierStyle()) notifier('Style copié : sélectionne un ou plusieurs éléments puis « Coller le style ».', 'info'); } }),
    collerStyle: boutonOutil({ icone: 'collerStyle', libelle: 'Coller le style', titre: 'Appliquer le style copié à la sélection (Ctrl + Maj + V)', action: collerStyle }),
  };
  const alignements = [
    ['gauche', 'Aligner à gauche'], ['centreH', 'Centrer horizontalement'], ['droite', 'Aligner à droite'],
    ['haut', 'Aligner en haut'], ['centreV', 'Centrer verticalement'], ['bas', 'Aligner en bas'],
  ].map(([mode, titre]) => boutonOutil({ icone: mode, titre, action: () => alignerSelection(mode) }));
  const centrages = [
    boutonOutil({ icone: 'centrerCarteH', titre: 'Centrer horizontalement sur la carte', action: () => centrerSelection('horizontal') }),
    boutonOutil({ icone: 'centrerCarteV', titre: 'Centrer verticalement sur la carte', action: () => centrerSelection('vertical') }),
  ];
  const repartitions = [
    boutonOutil({ icone: 'repartirH', titre: 'Répartir horizontalement (3 éléments min.)', action: () => repartirSelection('horizontal') }),
    boutonOutil({ icone: 'repartirV', titre: 'Répartir verticalement (3 éléments min.)', action: () => repartirSelection('vertical') }),
  ];
  const infoSelection = creerElement('span', { classe: 'Outils-info', attributs: { role: 'status' } });

  conteneur.append(
    creerElement('div', { classe: 'Outils-ligne' }, [
      creerElement('div', { classe: 'Segments', attributs: { role: 'group', 'aria-label': 'Face' } }, boutonsCote),
      groupe('Ajouter', [...boutonsAjout, entreeImage]),
      groupe('Historique', [
        boutonOutil({ icone: 'annuler', titre: 'Annuler (Ctrl + Z)', action: annuler }),
        boutonOutil({ icone: 'retablir', titre: 'Rétablir (Ctrl + Y)', action: retablir }),
        boutonOutil({ icone: 'autreFace', titre: "Copier cette face sur l'autre (remplace son contenu)", action: copierSurAutreFace }),
      ]),
      creerElement('label', { classe: 'Outils-option', attributs: { for: 'option-grille' } }, [grille, creerElement('span', { texte: 'Grille' })]),
      creerElement('label', { classe: 'Outils-option', attributs: { for: 'option-apercu' } }, [creerElement('span', { texte: 'Aperçu :' }), apercu]),
    ]),
    creerElement('div', { classe: 'Outils-ligne Outils-ligne--selection' }, [
      infoSelection,
      groupe('Édition', [actions.copier, actions.coller, actions.dupliquer, actions.supprimer]),
      groupe('Style', [actions.copierStyle, actions.collerStyle]),
      groupe('Aligner', alignements),
      groupe('Centrer sur la carte', centrages),
      groupe('Répartir', repartitions),
    ]),
  );

  // Liste des personnes proposées pour l'aperçu.
  const remplirApercu = () => {
    const choisi = obtenirEdition().personneApercuId;
    vider(apercu);
    apercu.append(creerElement('option', { texte: "Personne d'exemple", attributs: { value: '' } }));
    obtenirEtat().personnes.forEach(({ id, personne }) => apercu.append(creerElement('option', { texte: nomComplet(personne) || 'Sans nom', attributs: { value: id } })));
    apercu.value = choisi;
  };

  // Active ou désactive les boutons selon la sélection et le presse-papiers.
  const actualiser = () => {
    const edition = obtenirEdition();
    const nombre = edition.selectionIds.length;
    const presse = contenuPressePapiers();
    boutonsCote.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cote === edition.cote)));
    grille.checked = edition.grille;
    infoSelection.textContent = nombre ? `${nombre} sélectionné${nombre > 1 ? 's' : ''}` : 'Aucune sélection';
    [actions.copier, actions.dupliquer, actions.supprimer, ...alignements, ...centrages].forEach((b) => { b.disabled = nombre === 0; });
    actions.coller.disabled = !presse.elements;
    actions.copierStyle.disabled = nombre !== 1;
    actions.collerStyle.disabled = !presse.style || nombre === 0;
    repartitions.forEach((b) => { b.disabled = nombre < 3; });
  };
  abonnerEdition(actualiser);
  abonner((type) => { if (type === 'personnes') remplirApercu(); });
  remplirApercu();
  actualiser();
}
