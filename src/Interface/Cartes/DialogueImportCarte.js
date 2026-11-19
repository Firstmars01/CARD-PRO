/**
 * DialogueImportCarte.js
 * Fenêtre de choix avant d'importer une carte (.cardpro / GIF) :
 *  - design : créer un nouveau modèle à partir de la carte, ou utiliser un modèle existant ;
 *  - si la personne existe déjà : la mettre à jour, ou en créer une nouvelle.
 * Un aperçu du recto importé est affiché.
 */

import { creerElement } from '../../Utilitaires/Dom.js';
import { nomComplet } from '../../Metier/Personne.js';
import { tousLesModeles } from '../../Metier/EtatApplication.js';
import { genererQrPersonne } from '../../Metier/ContenuQr.js';
import { rendreFaceSvg } from '../Rendu/RenduFaceSvg.js';

/**
 * Crée un choix (bouton radio + libellé).
 * @param {string} groupe - Nom du groupe de boutons.
 * @param {string} valeur - Valeur du choix.
 * @param {string} texte - Libellé.
 * @param {boolean} [coche=false] - Choix par défaut.
 * @returns {{bloc:HTMLLabelElement, radio:HTMLInputElement}} Choix.
 */
function choix(groupe, valeur, texte, coche = false) {
  const radio = creerElement('input', { attributs: { type: 'radio', name: groupe, value: valeur, checked: coche } });
  return { bloc: creerElement('label', { classe: 'Choix' }, [radio, creerElement('span', { texte })]), radio };
}

/**
 * Ouvre la fenêtre et attend la décision.
 * @param {{personne:object, modele:object}} carte - Carte lue dans le fichier (validée).
 * @param {object|null} doublon - Personne déjà présente avec le même nom et e-mail, ou null.
 * @returns {Promise<{modele:"nouveau"|"existant", modeleId:string, personne:"maj"|"nouvelle"}|null>} Choix, ou null si annulé.
 */
export function demanderChoixImport(carte, doublon) {
  return new Promise((resoudre) => {
    const nom = nomComplet(carte.personne) || carte.personne.entreprise || 'cette personne';
    const nouveau = choix('import-design', 'nouveau', `Nouveau modèle « ${carte.modele.nom} (importé) »`, true);
    const existant = choix('import-design', 'existant', 'Un modèle existant :');
    const liste = creerElement('select', { attributs: { 'aria-label': 'Modèle existant' } },
      tousLesModeles().map((m) => creerElement('option', { texte: m.nom, attributs: { value: m.id } })));
    liste.addEventListener('change', () => { existant.radio.checked = true; });

    const maj = choix('import-personne', 'maj', `Mettre à jour la fiche existante de ${nom}`, true);
    const nouvelle = choix('import-personne', 'nouvelle', 'Créer une nouvelle personne');

    const apercu = rendreFaceSvg(carte.modele, 'recto', carte.personne, genererQrPersonne(carte.personne).qr);
    apercu.classList.add('ImportCarte-apercu');
    const annuler = creerElement('button', { classe: 'Bouton Bouton--secondaire', texte: 'Annuler', attributs: { type: 'button' } });
    const valider = creerElement('button', { classe: 'Bouton Bouton--principal', texte: 'Importer', attributs: { type: 'button' } });

    const dialogue = creerElement('dialog', { classe: 'ImportCarte', attributs: { 'aria-label': 'Importer une carte' } }, [
      creerElement('h2', { classe: 'Transfert-titre', texte: `Importer la carte de ${nom}` }),
      apercu,
      creerElement('fieldset', { classe: 'ImportCarte-groupe' }, [
        creerElement('legend', { texte: 'Design de la carte' }),
        nouveau.bloc,
        creerElement('div', { classe: 'Choix-ligne' }, [existant.bloc, liste]),
      ]),
      doublon && creerElement('fieldset', { classe: 'ImportCarte-groupe' }, [
        creerElement('legend', { texte: `${nom} est déjà dans la liste` }),
        maj.bloc,
        nouvelle.bloc,
      ]),
      creerElement('div', { classe: 'Transfert-actions' }, [annuler, valider]),
    ]);

    let decision = null;
    valider.addEventListener('click', () => {
      decision = {
        modele: existant.radio.checked ? 'existant' : 'nouveau',
        modeleId: liste.value,
        personne: doublon && maj.radio.checked ? 'maj' : 'nouvelle',
      };
      dialogue.close();
    });
    annuler.addEventListener('click', () => dialogue.close());
    dialogue.addEventListener('close', () => {
      dialogue.remove();
      resoudre(decision);
    });
    document.body.append(dialogue);
    dialogue.showModal();
  });
}
