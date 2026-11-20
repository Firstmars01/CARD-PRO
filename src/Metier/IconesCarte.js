/**
 * IconesCarte.js
 * Bibliothèque d'icônes vectorielles à placer sur les cartes (devant les
 * coordonnées, à côté des QR codes…). Icônes génériques dessinées pour
 * DrawCard (tracés 24 × 24, au trait) : aucune marque déposée.
 */

// [clé, libellé, tracé SVG]
const ICONES = [
  ['telephone', 'Téléphone', 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2'],
  ['mobile', 'Mobile', 'M7 2h10v20H7z M11 18h2'],
  ['email', 'E-mail', 'M3 5h18v14H3z M3 6l9 7 9-7'],
  ['web', 'Site web', 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18'],
  ['adresse', 'Adresse', 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z M12 6.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5'],
  ['personne', 'Personne', 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7'],
  ['entreprise', 'Entreprise', 'M4 21V5l8-2v18 M12 8h8v13 M2 21h20 M7 8h2 M7 12h2 M7 16h2 M15 12h2 M15 16h2'],
  ['mallette', 'Réseau pro', 'M3 8h18v12H3z M9 8V5h6v3 M3 13h18'],
  ['code', 'Code', 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16'],
  ['photo', 'Photo', 'M3 7h4l2-3h6l2 3h4v13H3z M12 9.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7'],
  ['message', 'Message', 'M4 4h16v12H9l-5 4z'],
  ['video', 'Vidéo', 'M3 6h18v12H3z M10 9v6l5-3z'],
  ['partage', 'Partage', 'M6 10a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5 M18 4a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5 M18 15a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5 M8.2 11.3l7.6-4 M8.2 13.7l7.6 4'],
  ['lien', 'Lien', 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  ['calendrier', 'Calendrier', 'M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4'],
  ['horloge', 'Horaires', 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 7v5l3 3'],
  ['etoile', 'Étoile', 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'],
  ['coeur', 'Cœur', 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z'],
  ['bouclier', 'Sécurité', 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4'],
  ['coche', 'Coche', 'M4 12l5 5L20 6'],
];

export const TRACES_ICONES = Object.fromEntries(ICONES.map(([cle, , trace]) => [cle, trace]));
export const OPTIONS_ICONES = ICONES.map(([cle, libelle]) => [cle, libelle]);
