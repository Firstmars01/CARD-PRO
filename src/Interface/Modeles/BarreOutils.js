/**
 * BarreOutils.js
 * Barre d'outils de l'éditeur : choix recto / verso, ajout d'éléments,
 * annuler / rétablir, grille et personne utilisée pour l'aperçu.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { chargerImage } from '../../Utilitaires/Image.js';
import { nomComplet } from '../../Metier/Personne.js';
import { COTES } from '../../Metier/ModeleCarte.js';
import { obtenirEtat, abonner } from '../../Metier/EtatApplication.js';
import {
  obtenirEdition, abonnerEdition, choisirCote, ajouterElement, annuler, retablir, modifierOptions, copierSurAutreFace,
} from './EtatEdition.js';
import { notifier } from '../Notifications.js';

// Éléments ajoutables : [libellé, type, valeurs initiales].
const AJOUTS = [
  ['Nom', 'texte', { champ: 'nomComplet', taille: 44, graisse: '700' }],
  ['Information', 'texte', { champ: 'poste', taille: 24 }],
  ['Texte fixe', 'texte', { source: 'libre', texte: 'Votre texte' }],
  ['QR code', 'qr', {}],
  ['Rectangle', 'forme', { forme: 'rectangle' }],
  ['Ellipse', 'forme', { forme: 'ellipse', largeur: 160, hauteur: 160 }],
  ['Ligne', 'forme', { forme: 'ligne', hauteur: 10, epaisseurContour: 3 }],
];

/**
 * Monte la barre d'outils.
 * @param {HTMLElement} conteneur - Zone de la barre.
 */
export function monterBarreOutils(conteneur) {
  const bouton = (texte, action, titre = texte, classe = 'Bouton--secondaire') => creerElement('button', {
    classe: `Bouton ${classe} Bouton--petit`, texte, attributs: { type: 'button', title: titre }, surClic: action,
  });

  // Recto / verso.
  const boutonsCote = Object.entries(COTES).map(([cote, libelle]) => {
    const b = bouton(libelle, () => choisirCote(cote));
    b.dataset.cote = cote;
    return b;
  });

  // Ajout d'un élément (avec avertissement si la face est pleine).
  const ajouter = (type, valeurs) => {
    if (!ajouterElement(type, valeurs)) notifier('Maximum 40 éléments par face.', 'erreur');
  };
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

  conteneur.append(
    creerElement('div', { classe: 'Outils-groupe', attributs: { role: 'group', 'aria-label': 'Face' } }, boutonsCote),
    creerElement('div', { classe: 'Outils-groupe', attributs: { role: 'group', 'aria-label': 'Ajouter' } }, [
      creerElement('span', { classe: 'Outils-libelle', texte: 'Ajouter :' }),
      ...AJOUTS.map(([libelle, type, valeurs]) => bouton(`+ ${libelle}`, () => ajouter(type, valeurs))),
      bouton('+ Image', () => entreeImage.click()),
      entreeImage,
    ]),
    creerElement('div', { classe: 'Outils-groupe' }, [
      bouton('↶', annuler, 'Annuler (Ctrl + Z)'),
      bouton('↷', retablir, 'Rétablir (Ctrl + Y)'),
      bouton('Copier sur l\'autre face', copierSurAutreFace, "Remplace l'autre face par une copie de celle-ci"),
      creerElement('label', { classe: 'Outils-option', attributs: { for: 'option-grille' } }, [grille, creerElement('span', { texte: 'Grille et aimant' })]),
      creerElement('label', { classe: 'Outils-option', attributs: { for: 'option-apercu' } }, [creerElement('span', { texte: 'Aperçu :' }), apercu]),
    ]),
  );

  // Liste des personnes proposées pour l'aperçu.
  const remplirApercu = () => {
    const choisi = obtenirEdition().personneApercuId;
    vider(apercu);
    apercu.append(creerElement('option', { texte: 'Personne d\'exemple', attributs: { value: '' } }));
    obtenirEtat().personnes.forEach(({ id, personne }) => apercu.append(creerElement('option', { texte: nomComplet(personne) || 'Sans nom', attributs: { value: id } })));
    apercu.value = choisi;
  };
  const actualiser = () => {
    const edition = obtenirEdition();
    boutonsCote.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cote === edition.cote)));
    grille.checked = edition.grille;
  };
  abonnerEdition(actualiser);
  abonner((type) => { if (type === 'personnes') remplirApercu(); });
  remplirApercu();
  actualiser();
}
