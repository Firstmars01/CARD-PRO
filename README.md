# Card Pro

Application locale (Docker) pour créer les **cartes de visite de toute une équipe** :
- des **modèles** recto / verso entièrement personnalisables, créés dans un éditeur visuel ;
- une **liste de personnes** (saisie ou import Excel/CSV) ;
- pour chaque personne, une carte avec un **QR code** qui contient ses coordonnées : un scan permet de l'ajouter aux contacts, même sans internet ;
- en option, **un QR code par lien** (LinkedIn, GitHub, portfolio…) qui ouvre directement la page ;
- des **exports** prêts à envoyer par e-mail ou à imprimer.

## Fonctionnalités

### Onglet « Cartes »
- Ajout, modification et suppression des personnes, avec sauvegarde automatique.
- Informations : identité, téléphones, e-mail, site, adresse, note et jusqu'à 8 liens (LinkedIn…).
- Choix du modèle pour chaque carte.
- Aperçu en direct du **recto** et du **verso**, avec une alerte si le QR code risque d'être mal lu.
- **Import d'une liste** (CSV exporté d'Excel) avec un fichier modèle à télécharger.
- **Téléchargements** : recto/verso en PNG, JPG et SVG (300 dpi), PDF recto + verso (85 × 55 mm), planche A4 recto-verso de 10 cartes, contact `.vcf`, ZIP de la carte, et **ZIP de toutes les cartes** (un dossier par personne).

### Onglet « Modèles »
- 7 modèles de base : Classique, Ardoise, Océan, Bandeau corail, Minimal (QR au verso), Réseaux (QR des liens au verso), Néon.
- **Éditeur visuel recto / verso** :
  - placement à la souris (glisser), redimensionnement avec la poignée, déplacement au clavier ;
  - **sélection multiple** : Ctrl + clic, ou cadre tracé à la souris sur une zone vide, puis déplacement du groupe ;
  - **copier / couper / coller** des éléments, y compris d'une face ou d'un modèle à l'autre ;
  - **copier / coller le style** d'un élément (couleurs, police, tailles…) sur un ou plusieurs autres ;
  - **alignement** :
    - à gauche, au centre, à droite, en haut, au milieu ou en bas : sur la carte pour 1 élément, entre eux pour plusieurs ;
    - **centrage sur la carte** de la sélection d'un bloc ;
    - **répartition** régulière (3 éléments minimum) ;
  - grille et aimantation (au millimètre et aux axes centraux) ;
  - éléments :
    - **texte** : lié à une information de la personne, ou texte fixe ;
    - **QR code** : contact (vCard), site web ou **un lien précis** de la personne (lien n° 1 à 8) ;
    - **QR des liens** : un bouton ajoute 3 QR codes de liens avec le nom du lien en dessous ;
    - **image** : logo, photo… ;
    - **formes** : rectangle, ellipse, ligne ;
  - réglages de chaque élément :
    - position et taille en mm, opacité, visibilité ;
    - police (12 au choix), taille, graisse, italique, majuscules, couleur, alignement, espacement des lettres, interligne, préfixe (ex. « Tél. ») ;
    - couleurs, marge et arrondi du QR code ;
    - remplissage, contour et arrondi des formes ;
  - fond de chaque face : uni, dégradé ou image ;
  - **calques** : ordre, masquer, supprimer ;
  - **annuler / rétablir**, dupliquer, copier une face sur l'autre ;
  - aperçu avec une personne d'exemple ou une vraie personne de la liste.
- **Enregistrement des modèles** (nouveau, dupliquer, renommer, supprimer) et import / export en `.json`.

### Raccourcis de l'éditeur

| Action | Raccourci |
| --- | --- |
| Ajouter / retirer de la sélection | Ctrl + clic (ou cadre tracé sur une zone vide) |
| Tout sélectionner / désélectionner | Ctrl + A / Échap |
| Déplacer de 1 mm (5 mm) | Flèches (Maj + flèches) |
| Copier / couper / coller | Ctrl + C / Ctrl + X / Ctrl + V |
| Dupliquer | Ctrl + D |
| Copier / coller le style | Ctrl + Maj + C / Ctrl + Maj + V |
| Supprimer | Suppr |
| Annuler / rétablir | Ctrl + Z / Ctrl + Y |

## Technologies

- **Navigateur** : HTML, CSS, JavaScript (modules ES), sans framework. Encodeur QR, ZIP et CSV intégrés. [pdf-lib](https://pdf-lib.js.org/) 1.17.1 (MIT) embarquée.
- **Serveur** : Node.js 22, **sans aucune dépendance npm**, avec la base **SQLite** intégrée à Node.
- **Docker** : un conteneur Node non-root.
- **Tests** : `node:test`.

## Arborescence

```
CARD PRO/
├── index.html                 # Page unique (onglets Cartes et Modèles)
├── manifest.webmanifest       # Icône et nom de l'application
├── sw.js                      # Désactive l'ancien cache des versions précédentes
├── Dockerfile                 # Image du serveur
├── docker-compose.yml         # Lancement en une commande
├── assets/
│   ├── icons/                 # Icônes
│   ├── styles/                # Base.css, Composants.css, Editeur.css
│   └── vendor/                # pdf-lib + licence
├── src/                       # Code du navigateur (en partie partagé avec le serveur)
│   ├── Main.js                # Point d'entrée
│   ├── Interface/
│   │   ├── Cartes/            # Liste, formulaire, import, aperçu, exports
│   │   ├── Modeles/           # Éditeur : zone, outils, raccourcis, propriétés, calques, modèles
│   │   └── Rendu/             # Dessin des faces et du QR en SVG
│   ├── Metier/                # Personne, éléments, modèles, alignement, polices, vCard, import, état
│   ├── Donnees/               # Appels à l'API
│   └── Utilitaires/           # QR, validation, schémas, images, CSV, ZIP, PDF
├── serveur/
│   ├── Serveur.js             # Point d'entrée : API + fichiers
│   ├── Configuration.js       # Variables d'environnement
│   ├── Http/                  # Routeur, requêtes, réponses, sécurité, fichiers
│   ├── Routes/                # Personnes, modèles
│   └── Donnees/               # SQLite et dépôts (requêtes préparées)
└── tests/                     # Tests unitaires et tests de l'API
```

## Installation et lancement

Prérequis : [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up -d --build
```

Ouvre ensuite **http://localhost:8080**.

Les autres appareils du réseau (PC des collègues, téléphones) utilisent `http://<adresse-IP-du-PC>:8080`. Pour trouver l'adresse, lance `ipconfig` sous Windows et lis la ligne « Adresse IPv4 ». Si Windows le demande, autorise Docker dans le pare-feu.

Commandes utiles :

```bash
docker compose logs -f              # journaux
docker compose down                 # arrêt (les données sont conservées)
docker compose down -v              # arrêt ET suppression de toutes les données
docker compose cp cardpro:/donnees/cardpro.sqlite ./sauvegarde.sqlite   # sauvegarde
```

> Si tu avais installé une ancienne version de Card Pro, recharge la page avec **Ctrl + F5** la première fois.

## Développement sans Docker

Il faut Node.js 22.13 ou plus récent.

```bash
npm start      # http://localhost:3000 (base dans ./donnees)
npm test       # 21 tests
```

## QR codes des liens

- Dans la fiche d'une personne, les liens sont numérotés dans l'ordre : lien 1, lien 2…
- Dans un modèle, un QR code réglé sur « Un lien de la personne » + « Numéro du lien » ouvre ce lien quand on le scanne. Une légende « Lien N (nom) » affiche son nom (ex. « LinkedIn »).
- Si une personne n'a pas ce lien, le QR code et sa légende n'apparaissent pas sur sa carte. L'éditeur les signale en pointillés.
- Garde le même ordre de liens pour tout le monde (ex. lien 1 = LinkedIn, lien 2 = site du portfolio) pour que les cartes restent cohérentes.

## Exemples d'utilisation

1. **Modèles** → choisis un modèle de base → **Dupliquer**.
2. Donne-lui un nom, ajoute ton logo (« + Image »), place les éléments à la souris, règle le verso, puis **Enregistrer**.
3. **Cartes** → « Importer une liste » → télécharge le fichier modèle, remplis-le dans Excel, enregistre-le en CSV et importe-le en choisissant ton modèle.
4. Sélectionne une personne pour vérifier sa carte, puis télécharge :
   - **Recto PNG** : pour l'envoyer par e-mail ;
   - **PDF recto + verso** : pour un imprimeur ;
   - **Planche A4** : pour imprimer toi-même. Imprime en recto-verso « bord long », puis découpe le long des traits.
5. **Toutes les cartes (ZIP)** : tous les fichiers de toute l'équipe en une fois.

## Sécurité

- **Usage local** : pas de comptes. Toute personne qui accède à `http://<pc>:8080` peut voir et modifier les cartes. N'expose pas ce port sur internet.
- **Anti-CSRF** : toute requête qui modifie des données doit venir de l'application elle-même (contrôle de l'en-tête `Origin`). Un site malveillant ouvert dans le navigateur ne peut donc rien modifier.
- **Injection SQL** : uniquement des **requêtes préparées**.
- **Validation** : toutes les données (formulaire, import CSV, modèles JSON, API) sont **revalidées par le serveur** avec le même code que le navigateur, à partir de schémas :
  - longueurs, nombres et listes de choix en liste blanche ;
  - couleurs au format `#rrggbb` ;
  - liens en `http`/`https` uniquement ;
  - 40 éléments maximum par face ;
  - taille des requêtes limitée.
- **XSS** : aucun `innerHTML`. Le texte est inséré via `textContent`, et une **CSP stricte** (`script-src 'self'`) est appliquée par une balise et un en-tête HTTP.
- **Images** : PNG, JPEG ou WebP uniquement (signature vérifiée, 8 Mo maximum), **redessinées dans un canvas** pour supprimer tout contenu caché. Le SVG est refusé.
- **Injection vCard** : valeurs échappées (`\ ; ,` et retours à la ligne).
- **CSV** : à l'export, les cellules qui commencent par `= + - @` sont neutralisées (pas de formule exécutée dans Excel). À l'import, le fichier est limité à 1 Mo et 500 personnes.
- **Prototype** : les identifiants et les clés sont vérifiés, et les champs inconnus sont ignorés.
- **Fichiers** : seule une liste blanche est servie (`index.html`, `assets/`, `src/`…). Le code du serveur, la base et les fichiers cachés sont inaccessibles, et la traversée de dossiers est bloquée.
- **Erreurs** : messages génériques côté client, détails uniquement dans les journaux du serveur.
- **En-têtes HTTP** : CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP.
- **Docker** : utilisateur non-root, système de fichiers en lecture seule, capacités Linux retirées, `no-new-privileges`.
- **Secrets** : aucun n'est nécessaire. `.env` est exclu de Git et de l'image.
