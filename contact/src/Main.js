/**
 * Main.js (contact)
 * Lit la fiche contact contenue dans le lien (après le « # »), l'affiche et
 * propose « Ajouter aux contacts ». Sur iPhone, Safari ouvre alors la fiche
 * avec « Créer un contact ».
 */

import { creerElement, obtenirElement } from '../../src/Utilitaires/Dom.js';
import { telechargerBlob } from '../../src/Utilitaires/Telechargement.js';
import { nomFichierSur } from '../../src/Utilitaires/Validation.js';
import { genererVCard } from '../../src/Metier/GenerateurVCard.js';
import { lireLienContact } from '../../src/Metier/LienContact.js';
import { nomComplet } from '../../src/Metier/Personne.js';
import { initialiserTheme, creerBoutonTheme } from '../../src/Interface/Themes.js';
import { creerCoordonnees } from '../../portefeuille/src/Interface/Coordonnees.js';

/**
 * Ouvre la fiche contact pour l'enregistrer dans le téléphone.
 * @param {object} personne - Personne validée.
 */
function ajouterAuxContacts(personne) {
  const fichier = new Blob([genererVCard(personne)], { type: 'text/vcard' });
  const nom = `${nomFichierSur(nomComplet(personne) || personne.entreprise, 'contact')}.vcf`;
  // iPhone : ouvrir la fiche affiche directement « Créer un contact ».
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) location.assign(URL.createObjectURL(fichier));
  else telechargerBlob(fichier, nom);
}

/**
 * Affiche la fiche contact.
 * @param {HTMLElement} principal - Zone principale.
 * @param {object} personne - Personne validée.
 */
function afficherContact(principal, personne) {
  const ajouter = creerElement('button', { classe: 'PBouton PBouton--principal PBouton--grand', texte: 'Ajouter aux contacts', attributs: { type: 'button' } });
  ajouter.addEventListener('click', () => ajouterAuxContacts(personne));
  principal.append(creerElement('section', { classe: 'Ecran' }, [
    creerElement('h2', { classe: 'Carte-nom', texte: nomComplet(personne) || personne.entreprise || 'Contact' }),
    creerElement('p', { classe: 'Carte-poste', texte: [personne.poste, personne.entreprise].filter(Boolean).join(' · ') }),
    creerElement('div', { classe: 'Actions' }, [ajouter]),
    creerCoordonnees(personne),
  ]));
}

/**
 * Démarre la page.
 */
async function demarrer() {
  initialiserTheme();
  obtenirElement('entete').append(creerBoutonTheme());
  const principal = obtenirElement('principal');
  try {
    afficherContact(principal, await lireLienContact(location.hash));
  } catch (erreur) {
    principal.append(creerElement('p', { classe: 'Astuce', texte: erreur.message }));
  } finally {
    obtenirElement('chargement').hidden = true;
  }
}

demarrer();
