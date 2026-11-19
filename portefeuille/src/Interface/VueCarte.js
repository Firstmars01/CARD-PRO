/**
 * VueCarte.js
 * Écran d'une carte : recto et verso en grand (on touche la carte pour la
 * retourner), coordonnées cliquables, ajout aux contacts et suppression.
 */

import { creerElement, vider } from '../../../src/Utilitaires/Dom.js';
import { telechargerBlob } from '../../../src/Utilitaires/Telechargement.js';
import { nomFichierSur } from '../../../src/Utilitaires/Validation.js';
import { genererVCard } from '../../../src/Metier/GenerateurVCard.js';
import { valeurChamp, urlLisible } from '../../../src/Metier/Personne.js';
import { notifier } from '../../../src/Interface/Notifications.js';
import { trouverCarte, retirerCarte, titreCarte } from '../Metier/Portefeuille.js';
import { dessinerFace } from './RenduCarte.js';
import { revenirALaListe } from './Navigation.js';

/**
 * Crée une ligne de coordonnée (lien cliquable).
 * @param {string} libelle - Type d'information (ex. « Mobile »).
 * @param {string} texte - Texte affiché.
 * @param {string} href - Adresse du lien (tel:, mailto:, https:).
 * @returns {HTMLLIElement} Ligne.
 */
function ligneLien(libelle, texte, href) {
  const externe = href.startsWith('http');
  return creerElement('li', { classe: 'Coordonnee' }, [
    creerElement('span', { classe: 'Coordonnee-libelle', texte: libelle }),
    creerElement('a', {
      classe: 'Coordonnee-valeur',
      texte,
      attributs: { href, target: externe ? '_blank' : undefined, rel: externe ? 'noopener noreferrer' : undefined },
    }),
  ]);
}

/**
 * Liste les coordonnées de la personne (seules les adresses validées à l'import sont utilisées).
 * @param {object} personne - Personne normalisée.
 * @returns {HTMLUListElement} Liste.
 */
function creerCoordonnees(personne) {
  const lignes = [];
  const telephone = (numero) => `tel:${numero.replace(/[^\d+]/g, '')}`;
  if (personne.telephoneMobile) lignes.push(ligneLien('Mobile', personne.telephoneMobile, telephone(personne.telephoneMobile)));
  if (personne.telephonePro) lignes.push(ligneLien('Fixe', personne.telephonePro, telephone(personne.telephonePro)));
  if (personne.email) lignes.push(ligneLien('E-mail', personne.email, `mailto:${personne.email}`));
  if (personne.siteWeb) lignes.push(ligneLien('Site', urlLisible(personne.siteWeb), personne.siteWeb));
  personne.liens.forEach((lien) => lignes.push(ligneLien(lien.libelle || 'Lien', urlLisible(lien.url), lien.url)));
  const adresse = valeurChamp(personne, 'adresse');
  if (adresse) {
    lignes.push(creerElement('li', { classe: 'Coordonnee' }, [
      creerElement('span', { classe: 'Coordonnee-libelle', texte: 'Adresse' }),
      creerElement('span', { classe: 'Coordonnee-valeur', texte: adresse }),
    ]));
  }
  const liste = creerElement('ul', { classe: 'Coordonnees' }, lignes);
  liste.hidden = lignes.length === 0;
  return liste;
}

/**
 * Propose le contact au téléphone (partage vers « Contacts », sinon téléchargement .vcf).
 * @param {object} carte - Carte.
 */
async function ajouterAuxContacts(carte) {
  const nom = `${nomFichierSur(titreCarte(carte), 'contact')}.vcf`;
  const fichier = new File([genererVCard(carte.personne)], nom, { type: 'text/vcard' });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: titreCarte(carte) });
      return;
    } catch (erreur) {
      if (erreur.name === 'AbortError') return; // Partage annulé par la personne
    }
  }
  telechargerBlob(fichier, nom);
}

/**
 * Crée l'écran « carte ».
 * @returns {{element:HTMLElement, afficher:(id:string) => void}} Écran.
 */
export function creerVueCarte() {
  const element = creerElement('section', { classe: 'Ecran', attributs: { 'aria-label': 'Carte' } });

  /**
   * Affiche une carte.
   * @param {string} id - Identifiant de la carte.
   */
  const afficher = (id) => {
    vider(element);
    const carte = trouverCarte(id);
    if (!carte) {
      revenirALaListe();
      return;
    }
    const { personne } = carte;

    // Carte retournable : recto devant, verso derrière.
    const retournable = creerElement('button', {
      classe: 'Retournable',
      attributs: { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Retourner la carte' },
    }, [
      creerElement('div', { classe: 'Retournable-face Retournable-face--recto' }, [dessinerFace(carte, 'recto')]),
      creerElement('div', { classe: 'Retournable-face Retournable-face--verso' }, [dessinerFace(carte, 'verso')]),
    ]);
    retournable.addEventListener('click', () => {
      const verso = retournable.getAttribute('aria-pressed') !== 'true';
      retournable.setAttribute('aria-pressed', String(verso));
    });

    const supprimer = creerElement('button', { classe: 'PBouton PBouton--danger', texte: 'Supprimer la carte', attributs: { type: 'button' } });
    supprimer.addEventListener('click', async () => {
      if (!window.confirm(`Supprimer la carte de ${titreCarte(carte)} ?`)) return;
      try {
        await retirerCarte(carte.id);
        notifier('Carte supprimée.', 'succes');
        revenirALaListe();
      } catch (erreur) {
        notifier(erreur.message, 'erreur');
      }
    });
    const contact = creerElement('button', { classe: 'PBouton PBouton--principal', texte: 'Ajouter aux contacts', attributs: { type: 'button' } });
    contact.addEventListener('click', () => ajouterAuxContacts(carte).catch(() => notifier("Ajout aux contacts impossible.", 'erreur')));
    const retour = creerElement('button', { classe: 'PBouton', texte: '← Mes cartes', attributs: { type: 'button' } });
    retour.addEventListener('click', () => history.back());

    element.append(
      creerElement('div', { classe: 'BarreEcran' }, [retour]),
      retournable,
      creerElement('p', { classe: 'Astuce', texte: 'Touche la carte pour voir le recto ou le verso.' }),
      creerElement('h2', { classe: 'Carte-nom', texte: titreCarte(carte) }),
      creerElement('p', { classe: 'Carte-poste', texte: [personne.poste, personne.entreprise].filter(Boolean).join(' · ') }),
      creerCoordonnees(personne),
      creerElement('div', { classe: 'Actions' }, [contact, supprimer]),
    );
  };

  return { element, afficher };
}
