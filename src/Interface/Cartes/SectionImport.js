/**
 * SectionImport.js
 * Section d'import d'une liste de personnes depuis un fichier CSV
 * (exporté d'Excel ou de Google Sheets), avec un fichier modèle à remplir.
 */

import { creerElement, vider } from '../../Utilitaires/Dom.js';
import { lireCsv, ecrireCsv } from '../../Utilitaires/Csv.js';
import { telechargerBlob } from '../../Utilitaires/Telechargement.js';
import { convertirLignes, lignesFichierModele } from '../../Metier/ImportPersonnes.js';
import { MODELES_DE_BASE } from '../../Metier/ModelesDeBase.js';
import { obtenirEtat, abonner, importerPersonnes } from '../../Metier/EtatApplication.js';
import { creerChamp, creerSection } from '../Champs.js';
import { notifier } from '../Notifications.js';

const POIDS_MAX = 1024 * 1024;

/**
 * Monte la section d'import.
 * @param {HTMLElement} conteneur - Zone d'accueil.
 */
export function monterImportPersonnes(conteneur) {
  const { section, contenu } = creerSection('Importer une liste de personnes (CSV / Excel)', false);
  const modele = creerElement('select', { attributs: { id: 'import-modele' } });
  const fichier = creerElement('input', { attributs: { type: 'file', id: 'import-fichier', accept: '.csv,text/csv' } });
  const resultat = creerElement('p', { classe: 'Aide', attributs: { role: 'status' } });

  const remplirModeles = () => {
    const choisi = modele.value;
    vider(modele);
    [...MODELES_DE_BASE, ...obtenirEtat().modeles].forEach((m) => modele.append(creerElement('option', { texte: m.nom, attributs: { value: m.id } })));
    if (choisi) modele.value = choisi;
  };
  abonner((type) => { if (type === 'modeles') remplirModeles(); });
  remplirModeles();

  fichier.addEventListener('change', async () => {
    const [choisi] = fichier.files;
    fichier.value = '';
    if (!choisi) return;
    try {
      if (choisi.size > POIDS_MAX) throw new Error('Fichier trop lourd (1 Mo maximum).');
      const { personnes, colonnesIgnorees } = convertirLignes(lireCsv(await choisi.text()));
      if (!personnes.length) throw new Error('Aucune personne valide dans le fichier.');
      const nombre = await importerPersonnes(personnes, modele.value);
      resultat.textContent = `${nombre} personne(s) importée(s).${colonnesIgnorees.length ? ` Colonnes ignorées : ${colonnesIgnorees.join(', ')}.` : ''}`;
      notifier(`${nombre} carte(s) créée(s).`, 'succes');
    } catch (erreur) {
      resultat.textContent = '';
      notifier(erreur.message, 'erreur');
    }
  });

  contenu.append(
    creerElement('p', { classe: 'Aide', texte: 'Remplis le fichier modèle dans Excel (une ligne par personne), enregistre-le en « CSV », puis importe-le ici.' }),
    creerElement('div', { classe: 'BarreActions' }, [creerElement('button', {
      classe: 'Bouton Bouton--secondaire', texte: 'Télécharger le fichier modèle', attributs: { type: 'button' },
      surClic: () => telechargerBlob(ecrireCsv(lignesFichierModele()), 'modele-import-cartes.csv'),
    })]),
    creerChamp('Modèle de carte à appliquer', modele).bloc,
    creerChamp('Fichier CSV', fichier).bloc,
    resultat,
  );
  conteneur.append(section);
}
