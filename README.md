# Card Pro

Application locale (Docker) pour créer les **cartes de visite de toute une équipe** :
- des **modèles** recto / verso entièrement personnalisables, créés dans un éditeur visuel ;
- une **liste de personnes** (saisie ou import Excel/CSV) ;
- pour chaque personne, une carte avec un **QR code** qui contient ses coordonnées : un scan permet de l'ajouter aux contacts, même sans internet ;
- en option, **un QR code par lien** (LinkedIn, GitHub, portfolio…) qui ouvre directement la page ;
- des **exports** prêts à envoyer par e-mail ou à imprimer ;
- une application mobile, **Card Pro Portefeuille** (Android et iPhone), qui garde les cartes reçues, recto et verso compris, à la place du papier ;
- des thèmes **clair et sombre** (bouton soleil / lune), sur la page web comme sur l'application mobile.

## Fonctionnalités

### Onglet « Cartes »
- Ajout, modification et suppression des personnes, avec sauvegarde automatique.
- Informations : identité, téléphones, e-mail, site, adresse, note et jusqu'à 8 liens (LinkedIn…).
- Choix du modèle pour chaque carte.
- Aperçu en direct du **recto** et du **verso**, avec une alerte si le QR code risque d'être mal lu.
- **Import d'une liste** (CSV exporté d'Excel) avec un fichier modèle à télécharger.
- **Téléchargements** : recto/verso en PNG, JPG et SVG (300 dpi), PDF recto + verso au format de la carte, planche A4 recto-verso, **PDF imprimeur** (fonds perdus 3 mm + traits de coupe), contact `.vcf`, ZIP de la carte, et **ZIP de toutes les cartes** (un dossier par personne).

### Onglet « Modèles »
- 8 modèles de base : Classique, Ardoise, Océan, Bandeau corail, Minimal (QR au verso), Réseaux (QR des liens au verso), Vertical (portrait, icônes), Néon.
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
    - **formes** : rectangle, ellipse, ligne, triangle, losange, étoile, polygone, vague, flèche ;
    - **icônes** : 20 pictogrammes génériques (téléphone, e-mail, web, adresse…) ;
  - réglages de chaque élément :
    - position et taille en mm, **rotation**, opacité, visibilité, **ombre portée** ;
    - police (12 au choix), taille, graisse, italique, majuscules, souligné, barré, texte vertical, couleur unie ou **dégradée**, contour, étiquette de fond, alignement, espacement, interligne, préfixe (ex. « Tél. ») ;
    - QR code : couleurs, marge, arrondi, **points carrés / arrondis / ronds**, forme et couleur des coins, **logo au centre** (n'importe quelle image) ;
    - images : cadrage rectangle, arrondi ou rond, bordure, noir et blanc ;
    - formes : remplissage uni, dégradé linéaire ou radial, contour, arrondi global ou coin par coin ;
  - fond de chaque face : uni, dégradé, radial ou image, **motif** (points, lignes, grille, vagues…) et **voile** de couleur ;
  - **format de la carte** (standard 85 × 55, ISO 85,6 × 54, US, long, carré) en **paysage ou portrait** : les éléments sont replacés automatiquement, et revenir au format de départ redonne exactement la disposition d'origine ;
  - **palette de 5 couleurs** : changer une couleur la remplace partout, et un nuancier apparaît dans chaque choix de couleur ;
  - **verrouiller** et **grouper** des éléments ;
  - **repères d'impression** (zone de sécurité et fond perdu) ;
  - **calques** : ordre, masquer, verrouiller, supprimer ;
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
| Grouper / dissocier | Ctrl + G / Ctrl + Maj + G |
| Supprimer | Suppr |
| Annuler / rétablir | Ctrl + Z / Ctrl + Y |

## Technologies

- **Navigateur** : HTML, CSS, JavaScript (modules ES), sans framework. Encodeur QR (modes octets et alphanumérique), ZIP, CSV, GIF animé et Base45 intégrés. [pdf-lib](https://pdf-lib.js.org/) 1.17.1 (MIT) embarquée.
- **Serveur** : Node.js 22, **sans aucune dépendance npm**, avec la base **SQLite** intégrée à Node.
- **Docker** : un conteneur Node non-root.
- **Portefeuille mobile** : application web installable (PWA), hors ligne, publiée sur **GitHub Pages** (HTTPS). Lecture des QR : lecteur intégré du navigateur (Android) ou [jsQR](https://github.com/cozmo/jsQR) 1.4.0 (Apache 2.0, iPhone), ajouté à la publication.
- **Tests** : `node:test`.

## Arborescence

```
CARD PRO/
├── index.html                 # Page unique (onglets Cartes et Modèles)
├── manifest.webmanifest       # Icône et nom de l'application
├── sw.js                      # Désactive l'ancien cache des versions précédentes
├── Dockerfile                 # Image du serveur
├── docker-compose.yml         # Lancement en une commande
├── .github/workflows/         # Portefeuille.yml : publication du portefeuille sur GitHub Pages
├── assets/
│   ├── icons/                 # Icônes
│   ├── styles/                # Themes.css (clair / sombre, partagé), Base.css, Composants.css, Editeur.css
│   └── vendor/                # pdf-lib + licence
├── src/                       # Code du navigateur (en partie partagé avec le serveur)
│   ├── Main.js                # Point d'entrée
│   ├── Interface/
│   │   ├── Cartes/            # Liste, formulaire, import, aperçu, exports, QR animé du portefeuille
│   │   ├── Themes.js          # Thème clair / sombre (partagé avec le portefeuille)
│   │   ├── Modeles/           # Éditeur : zone, outils, raccourcis, propriétés, calques, modèles
│   │   └── Rendu/             # Dessin des faces, du QR, dégradés, ombres et motifs en SVG
│   ├── Metier/                # Personne, éléments, modèles, formats, palette, icônes, alignement, polices, vCard, import, état,
│   │                          # PaquetCarte (carte complète compressée), TransfertQr (découpage en QR animé)
│   ├── Donnees/               # Appels à l'API
│   └── Utilitaires/           # QR, formes, validation, schémas, images, CSV, ZIP, PDF, GIF, Base45, compression
├── serveur/
│   ├── Serveur.js             # Point d'entrée : API + fichiers
│   ├── Configuration.js       # Variables d'environnement
│   ├── Http/                  # Routeur, requêtes, réponses, sécurité, fichiers
│   ├── Routes/                # Personnes, modèles
│   └── Donnees/               # SQLite et dépôts (requêtes préparées)
├── portefeuille/              # Application mobile Card Pro Portefeuille (PWA)
│   ├── index.html, manifest.webmanifest, sw.js   # Page, installation, hors ligne et partage
│   ├── styles/                # Portefeuille.css
│   ├── vendor/                # jsQR (ajouté à la publication)
│   └── src/
│       ├── Main.js            # Point d'entrée
│       ├── Interface/         # Écrans : liste, carte (recto / verso), scanner ; navigation
│       ├── Metier/            # Portefeuille : import, liste, suppression
│       ├── Donnees/           # Stockage sur le téléphone (IndexedDB)
│       └── Utilitaires/       # Lecture des QR par la caméra
└── tests/                     # Tests unitaires, de l'API et du portefeuille
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
>
> Après une mise à jour du code, relance **`docker compose up -d --build`** (le `--build` est indispensable : sans lui, Docker garde l'ancienne version). Le numéro affiché à côté du titre (ex. « v3.2 ») confirme la version chargée.

## Développement sans Docker

Il faut Node.js 22.13 ou plus récent.

```bash
npm start      # http://localhost:3000 (base dans ./donnees)
npm test       # 36 tests
```

## QR codes des liens

- Dans la fiche d'une personne, les liens sont numérotés dans l'ordre : lien 1, lien 2…
- Dans un modèle, un QR code réglé sur « Un lien de la personne » + « Numéro du lien » ouvre ce lien quand on le scanne. Une légende « Lien N (nom) » affiche son nom (ex. « LinkedIn »).
- Si une personne n'a pas ce lien, le QR code et sa légende n'apparaissent pas sur sa carte. L'éditeur les signale en pointillés.
- Garde le même ordre de liens pour tout le monde (ex. lien 1 = LinkedIn, lien 2 = site du portfolio) pour que les cartes restent cohérentes.

## Lisibilité des QR codes stylés

- Le QR code principal contient toujours la **fiche contact** (vCard) : on le scanne et on ajoute le contact.
- Avec un **logo**, le QR passe en correction d'erreur maximale (H). Il devient plus dense : agrandis-le, ou utilise un QR « lien » pour le logo.
- Les coins **ronds ou arrondis** sont lus par les téléphones récents, mais pas par certains lecteurs anciens. L'aperçu affiche un avertissement : **teste toujours la lecture avec un téléphone avant d'imprimer**.

## Portefeuille mobile (Card Pro Portefeuille)

Une application pour téléphone qui remplace la carte papier : la personne garde les cartes reçues, avec le **recto et le verso** exactement comme sur la page web, ses coordonnées cliquables et un bouton « Ajouter aux contacts ». Les cartes restent **sur le téléphone** : rien n'est envoyé sur Internet.

### Mise en ligne (une seule fois)

L'appareil photo et l'installation d'une application web exigent le **HTTPS** : le portefeuille est donc publié gratuitement sur **GitHub Pages**. Seul son code est publié (ni le serveur, ni la page des RH, ni aucune donnée).

1. Sur GitHub, dans le dépôt : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
2. Pousse le code (`git push`). L'action « Publier le portefeuille » lance les tests puis publie le site.
3. Adresse du portefeuille : **`https://<ton-compte>.github.io/<nom-du-dépôt>/portefeuille/`** (pour ce dépôt : `https://firstmars01.github.io/CARD-PRO/portefeuille/`).

> Avec un compte GitHub gratuit, le dépôt doit être **public** pour utiliser Pages. Il ne contient aucun secret ni aucune donnée de personne.

### Installer l'application sur le téléphone

- **Android (Chrome)** : ouvre l'adresse → menu ⋮ → **Installer l'application**.
- **iPhone (Safari)** : ouvre l'adresse → bouton **Partager** → **Sur l'écran d'accueil**.

L'icône Card Pro apparaît comme une application. Elle fonctionne ensuite **hors ligne**.

### Donner une carte à quelqu'un

Dans l'onglet **Cartes**, sélectionne la personne. La section **Portefeuille mobile** propose trois moyens :

| Moyen | Pour qui | Comment |
| --- | --- | --- |
| **Afficher le QR animé** | La personne est devant l'écran | Dans l'application : **Scanner un QR**, puis vise l'écran jusqu'à 100 %. Les QR défilent en boucle, l'ordre n'a pas d'importance. |
| **GIF pour e-mail** | Envoi par e-mail | Joins le GIF à l'e-mail. Sur le téléphone : **Importer un fichier** (iPhone : enregistre d'abord la pièce jointe dans « Fichiers »), ou sur Android **Partager → Card Pro**. Le GIF peut aussi être affiché sur un PC et scanné. |
| **Fichier .cardpro** | Envoi par e-mail | Même import que le GIF, en plus léger. |

Pratique : dans l'e-mail, mets le lien du portefeuille (pour l'installer) **et** le GIF ou le `.cardpro`. La personne installe l'application puis importe sa carte, sans passer au bureau.

- Ce QR animé est **différent** du QR imprimé sur la carte (qui reste la fiche contact, pour tout téléphone).
- Une carte avec des images (logo, fond) demande plus de QR : compte environ 1 QR par 600 octets, 5 QR par seconde.
- Une carte reçue plusieurs fois est ajoutée plusieurs fois : la personne supprime elle-même celles dont elle ne veut plus.
- Les fichiers `.cardpro` et `-portefeuille.gif` sont aussi inclus dans les ZIP.

### Essayer sur le PC

Le serveur Docker sert aussi le portefeuille : **http://localhost:8080/portefeuille/** (import de fichiers, affichage, thème). Le scan par caméra a besoin du lecteur intégré (Android) ou de jsQR (voir `portefeuille/vendor/LISEZMOI.md`).

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
- **Portefeuille mobile** :
  - les cartes restent sur le téléphone (IndexedDB) ; l'application ne contacte aucun serveur (CSP `connect-src 'self'`) ;
  - tout fichier reçu (GIF, `.cardpro`, QR) est une source non fiable : taille limitée (3 Mo de carte, 4 Mo une fois décompressée, contre les « bombes de décompression »), chaque longueur est vérifiée, et les données repassent par **les mêmes validations** que la page web (textes, couleurs, liens `http`/`https`, images PNG/JPEG/WebP à la signature vérifiée) ;
  - les cartes lues depuis le stockage sont revalidées avant affichage ; les liens d'appel et d'e-mail sont construits à partir de valeurs déjà nettoyées ;
  - le QR animé est contrôlé par un **CRC-32** : une lecture incomplète ou erronée est rejetée ;
  - la page web n'a pas accès à la caméra (`Permissions-Policy: camera=()`), seul le portefeuille y a droit ;
  - la publication GitHub n'a que les droits nécessaires (lecture du code, écriture sur Pages), lance les tests avant de publier, et fige la version de jsQR.
