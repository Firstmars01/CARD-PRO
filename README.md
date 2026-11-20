# Card Pro

Application Windows (**CardPro-Configurateur.exe**, sans installation) pour créer les **cartes de visite de toute une équipe** :
- des **modèles** recto / verso entièrement personnalisables, créés dans un éditeur visuel ;
- une **liste de personnes** (saisie ou import Excel/CSV) ;
- pour chaque personne, une carte avec un **QR code** qui contient ses coordonnées : un scan permet de l'ajouter aux contacts, même sans internet ;
- en option, **un QR code par lien** (LinkedIn, GitHub, portfolio…) qui ouvre directement la page ;
- des **exports** prêts à envoyer par e-mail ou à imprimer ;
- une application mobile, **Card Pro** (APK Android avec **NFC**, appli web sur iPhone), qui garde les cartes reçues, recto et verso compris, à la place du papier ;
- des thèmes **clair et sombre** (bouton soleil / lune), sur la page web comme sur l'application mobile.

## Fonctionnalités

### Onglet « Cartes »
- Ajout, modification et suppression des personnes, avec sauvegarde automatique.
- Informations : identité, téléphones (mobile, fixe, standard), WhatsApp, e-mail, site, LinkedIn, LinkedIn de l'entreprise, lien de prise de rendez-vous, adresse, note et jusqu'à 8 liens.
- **Entreprises** : nom, standard, site, LinkedIn, adresse et **logo** saisis une seule fois. Chaque carte est reliée à une entreprise **ou** en « réglage personnalisé » :
  - carte reliée : elle prend toutes les infos de l'entreprise (champs grisés, non modifiables) ; modifier l'entreprise met à jour toutes ses cartes ;
  - le logo de l'entreprise remplace les images du modèle cochées « Remplacer par le logo de l'entreprise » (cochée par défaut) ;
  - repasser une carte en réglage personnalisé recopie les infos de l'entreprise dans la carte, où elles deviennent modifiables ;
  - une entreprise encore reliée à des cartes ne peut pas être supprimée.
- Choix du modèle pour chaque carte, et **changement de design en lot** (toutes les cartes du design A passent au design B).
- **Contrôle avant export** : nom vide, aucun téléphone ni e-mail, doublons (même nom ou même e-mail), QR trop chargé, texte coupé ou très réduit. Les problèmes de la carte affichée apparaissent sous l'aperçu ; l'export de toutes les cartes prévient s'il en reste.
- Aperçu en direct du **recto** et du **verso**, avec une alerte si le QR code risque d'être mal lu.
- QR codes possibles : contact (vCard), site web, LinkedIn, LinkedIn de l'entreprise, **WhatsApp** (ouvre la discussion), **prise de rendez-vous**, **itinéraire** vers l'adresse (Google Maps / Plans), ou un lien de la personne.
- **Import d'une liste** (CSV exporté d'Excel) avec un fichier modèle à télécharger.
- **Import d'une carte** (`.cardpro` ou GIF de portefeuille) : la personne est ajoutée avec, au choix, un **nouveau modèle** créé à partir du design de la carte ou un **modèle existant** ; si elle est déjà dans la liste (même prénom, nom et e-mail), Card Pro demande s'il faut **mettre à jour** sa fiche ou en **créer une nouvelle**.
- **Signature Outlook** : aux couleurs de la carte (couleur d'accent modifiable, logo de la carte ou de l'entreprise), avec nom, poste, entreprise, téléphones, e-mail, site, LinkedIn, WhatsApp, prise de rendez-vous et adresse. Bouton **Copier la signature**, puis collage dans Outlook (guide affiché pour le nouvel Outlook, Outlook sur le web et Outlook classique). Police Arial pour un rendu identique chez tous les destinataires.
- **Fond Teams / Zoom** : image PNG 1920 × 1080 aux couleurs du recto, avec logo, nom, poste, entreprise et QR « contact » à gauche ; le centre reste libre pour la personne filmée (Teams affiche ton propre fond en miroir, mais les autres le voient à l'endroit).
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
    - police (13 au choix, **intégrées à l'appli** : rendu identique sur PC, Android, iPhone et dans les exports), taille, graisse, italique, majuscules, souligné, barré, texte vertical, couleur unie ou **dégradée**, contour, étiquette de fond, alignement, espacement, interligne, préfixe (ex. « Tél. ») ;
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
- **Windows** : lanceur `CardPro-Configurateur.exe` en C# (.NET Framework 4.8, déjà présent sur Windows) avec icône près de l'horloge ; il contient Node.js officiel et l'appli.
- **Portefeuille mobile** : application web installable (PWA), hors ligne, publiée sur **GitHub Pages** (HTTPS). Lecture des QR : lecteur intégré du navigateur (Android) ou [jsQR](https://github.com/cozmo/jsQR) 1.4.0 (Apache 2.0, iPhone), ajouté à la publication.
- **Tests** : `node:test`.

## Arborescence

```
CARD PRO/
├── index.html                 # Page unique (onglets Cartes et Modèles)
├── manifest.webmanifest       # Icône et nom de l'application
├── sw.js                      # Désactive l'ancien cache des versions précédentes
├── windows/Lanceur/           # CardPro-Configurateur.exe : démarrage, icône près de l'horloge, mises à jour (C#)
├── accueil/                   # Page d'accueil du projet (racine du site GitHub Pages)
├── configurateur/             # Page GitHub Pages de téléchargement de l'exe
├── .github/workflows/         # Portefeuille.yml : APK + GitHub Pages ; Configurateur.yml : CardPro-Configurateur.exe dans Releases
├── android/                   # Appli Android (APK) : WebView du portefeuille + NFC
│   └── app/src/main/java/fr/cardpro/portefeuille/
│       ├── MainActivity.java  # Écran : portefeuille en HTTPS local, caméra, fichiers, liens externes
│       ├── PontJavascript.java# Fonctions appelées par le portefeuille (NFC, partage, fichiers reçus)
│       ├── ServiceNfc.java    # Émulation de puce NFC Type 4 (HCE), lecture seule
│       ├── NdefCarte.java     # Contenu NFC : fiche contact + lien pour iPhone
│       └── FichiersRecus.java # Fichiers « Ouvrir avec » / « Partager »
├── contact/                   # Page ouverte par un iPhone qui lit le NFC (fiche contact dans le lien)
├── assets/
│   ├── icons/                 # Icônes
│   ├── polices/               # Polices intégrées (WOFF, licence OFL) + LISEZMOI.md des licences
│   ├── styles/                # Themes.css (clair / sombre, partagé), Base.css, Composants.css, Editeur.css
│   └── vendor/                # pdf-lib + licence
├── src/                       # Code du navigateur (en partie partagé avec le serveur)
│   ├── Main.js                # Point d'entrée
│   ├── Interface/
│   │   ├── Cartes/            # Liste, formulaire, entreprises, import, aperçu, exports, signature Outlook, QR animé du portefeuille
│   │   ├── Themes.js          # Thème clair / sombre (partagé avec le portefeuille)
│   │   ├── Modeles/           # Éditeur : zone, outils, raccourcis, propriétés, calques, modèles
│   │   └── Rendu/             # Dessin des faces, du QR, dégradés, ombres et motifs en SVG ; QR d'un lien ; fond Teams / Zoom
│   ├── Metier/                # Personne, entreprise, éléments, modèles, formats, palette, icônes, alignement, polices, vCard,
│   │                          # import, contrôle avant export (ControleCartes), identité visuelle (couleur, logo), état,
│   │                          # PaquetCarte (carte complète compressée), TransfertQr (QR animé), LienContact (lien NFC iPhone)
│   ├── Donnees/               # Appels à l'API
│   └── Utilitaires/           # QR, formes, validation, schémas, images, CSV, ZIP, PDF, GIF, Base45, compression
├── serveur/
│   ├── Serveur.js             # Point d'entrée : API + fichiers
│   ├── Configuration.js       # Variables d'environnement
│   ├── Http/                  # Routeur, requêtes, réponses, sécurité, fichiers
│   ├── Routes/                # Personnes, entreprises, modèles, sauvegarde
│   └── Donnees/               # SQLite et dépôts (requêtes préparées)
├── portefeuille/              # Application mobile Card Pro Portefeuille (PWA)
│   ├── index.html, manifest.webmanifest, sw.js   # Page, installation, hors ligne et partage
│   ├── styles/                # Portefeuille.css
│   ├── vendor/                # jsQR (ajouté à la publication)
│   └── src/
│       ├── Main.js            # Point d'entrée
│       ├── Interface/         # Écrans : installation, liste, carte (recto / verso), scanner ; navigation ; partage du contact
│       ├── Metier/            # Portefeuille : import, liste, suppression
│       ├── Donnees/           # Stockage sur le téléphone (IndexedDB)
│       └── Utilitaires/       # Lecture des QR, détection de l'appareil, pont avec l'appli Android
└── tests/                     # Tests unitaires, de l'API et du portefeuille
```

## Installation et lancement (Windows)

1. Télécharge **CardPro-Configurateur.exe** :
   - depuis la page d'accueil du projet **https://firstmars01.github.io/CARD-PRO/** (bouton « Télécharger » sur PC ; sur téléphone, le même bouton ouvre l'appli mobile) ;
   - ou depuis **https://firstmars01.github.io/CARD-PRO/configurateur/** ;
   - ou depuis la page **Releases** du dépôt GitHub.
2. Double-clique dessus. Rien à installer (Windows 10 ou 11).
   Si Windows affiche « Windows a protégé votre ordinateur » : **Informations complémentaires → Exécuter quand même** (l'exe n'est pas signé par un certificat payant).
3. Une petite fenêtre montre le démarrage (et la mise à jour éventuelle, avec son pourcentage). Puis la page Card Pro s'ouvre dans ton **navigateur par défaut**, même s'il était fermé, et une **icône Card Pro** apparaît près de l'horloge :
   - **clic** : rouvrir la page ;
   - **clic droit** : dossier des données, rechercher une mise à jour, version, **Quitter Card Pro**.

Bon à savoir :
- L'appli n'est accessible **que depuis ce PC** (adresse `http://localhost:48080`, ou le port libre suivant).
- **Données** : `%APPDATA%\CardPro\cardpro.sqlite` (gardées d'une version à l'autre). Journal en cas de problème : `%APPDATA%\CardPro\journal.txt`.
- **Sauvegarde** : onglet Cartes → « Sauvegarde des données » → **Sauvegarder** (un fichier `.json` avec toutes les cartes, toutes les entreprises et tous les modèles) / **Restaurer…**. Les modèles seuls s'exportent aussi en `.json` depuis l'onglet Modèles.
- **Mise à jour automatique** : au lancement (si Internet répond), Card Pro télécharge la nouvelle version, la vérifie et **remplace l'exe tout seul**, puis redémarre (rien à désinstaller, données conservées). Pendant qu'il tourne, il vérifie toutes les 6 heures : une version trouvée est téléchargée en arrière-plan et s'installe au prochain lancement, ou tout de suite par clic droit → « Redémarrer et installer… ». L'exe doit être dans un dossier où tu peux écrire (Téléchargements, Bureau, Documents…).
- Lancer l'exe une seconde fois rouvre simplement la page.

### Récupérer les données de l'ancienne version Docker

Avant de supprimer le conteneur Docker (il doit exister, même arrêté) :
```cmd
docker cp cardpro:/donnees/cardpro.sqlite cardpro.sqlite
```
Puis, **Card Pro (exe) fermé**, copie ce fichier dans `%APPDATA%\CardPro\` (remplace celui qui existe) et lance l'exe.

### Publication de l'exe

`.github/workflows/Configurateur.yml` construit `CardPro-Configurateur.exe` sur GitHub (Windows) à chaque `git push` qui touche l'appli, et le publie dans **Releases** sous le numéro de version de `package.json` (ex. `v4.3.0`), avec son empreinte SHA-256 (`CardPro-Configurateur.exe.sha256`).

> **Pour livrer une mise à jour**, augmente `version` dans `package.json` (ex. `4.3.0` → `4.3.1`) puis `git push` : les PC se mettent à jour tout seuls, l'appli web iPhone aussi (à chaque publication) ; sur Android, il faut retélécharger l'APK.

## Développement

Il faut Node.js 22.13 ou plus récent.

```bash
npm start      # http://localhost:3000 (base dans ./donnees)
npm test       # 40 tests
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

## Polices et texte trop long

- Les polices de la carte sont **livrées avec l'appli** (`assets/polices`), au lieu d'utiliser celles de l'appareil : une carte est identique sur PC, Android, iPhone et dans les exports (PNG, JPEG, PDF, SVG).
- Les anciennes polices sont remplacées par l'équivalent libre le plus proche : « Moderne » → Inter, Arial → Liberation Sans, Times → Liberation Serif, Courier → Liberation Mono, Georgia → Gelasio (mêmes largeurs pour ces quatre dernières), Verdana → DM Sans, Trebuchet → Fira Sans, Impact → Anton, Garamond → Cardo, Palatino → Crimson Text, Condensée → Roboto condensée. Roboto et Open Sans sont aussi au choix. La police « Manuscrite » est retirée : les textes qui l'utilisaient passent en Inter.
- Un texte trop long pour sa zone est **rétréci automatiquement** (jusqu'à la moitié de sa taille), sans changer son nombre de lignes. Il n'est coupé avec « … » que s'il ne tient toujours pas.

## Portefeuille mobile (Card Pro Portefeuille)

Une application pour téléphone qui remplace la carte papier : la personne garde les cartes reçues, avec le **recto et le verso** exactement comme sur la page web, ses coordonnées cliquables et un bouton « Ajouter aux contacts ». Les cartes restent **sur le téléphone** : rien n'est envoyé sur Internet.

Depuis une carte ouverte, on peut aussi **transmettre le contact** à quelqu'un :
- **Montrer le contact** : le QR code de la fiche contact complète s'affiche en plein écran (noir sur blanc, écran maintenu allumé). L'autre personne le scanne avec l'appareil photo, sans appli.
- **Envoyer le contact** : ouvre le menu de partage du téléphone (Quick Share, AirDrop, WhatsApp, SMS, e-mail…) avec le fichier `.vcf`.

- **Partager par NFC** (appli Android uniquement) : le téléphone se fait passer pour une puce NFC. On approche le dos d'un autre téléphone :
  - **Android** : la fiche contact s'ouvre directement ;
  - **iPhone** : une notification apparaît ; en la touchant, la page « contact » s'ouvre avec **Ajouter aux contacts**.
  - Une **animation** montre le geste : glisser son téléphone **sous** celui de l'autre personne, dos contre dos, le haut des deux téléphones l'un sur l'autre.
  - Pendant le partage, ton téléphone ne « lit » pas l'autre : aucune autre appli (paiement, lecteur NFC…) ne s'ouvre chez toi.
  - Le partage s'arrête en quittant la carte ou l'appli. Envoyer depuis un iPhone est impossible (Apple réserve le NFC aux paiements).

### Mise en ligne (une seule fois)

L'appareil photo et l'installation d'une application web exigent le **HTTPS** : le portefeuille est donc publié gratuitement sur **GitHub Pages**. Seul son code est publié (ni le serveur, ni la page du Configurateur, ni aucune donnée).

1. Sur GitHub, dans le dépôt : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
2. Pousse le code (`git push`). L'action « Publier le portefeuille » lance les tests puis publie le site.
3. Adresse du portefeuille : **`https://<ton-compte>.github.io/<nom-du-dépôt>/portefeuille/`** (pour ce dépôt : `https://firstmars01.github.io/CARD-PRO/portefeuille/`).

> Avec un compte GitHub gratuit, le dépôt doit être **public** pour utiliser Pages. Il ne contient aucun secret ni aucune donnée de personne.

### Installer l'application sur le téléphone

La page web du portefeuille ne sert **qu'à installer l'appli** : les cartes, le scan et l'import ne s'ouvrent que dans l'appli installée, sur un téléphone.

| Ouvert depuis | Ce que la page affiche |
| --- | --- |
| **Android** (Chrome, Edge, Samsung…) | Un bouton **Télécharger l'appli Card Pro** (APK, avec le NFC) et les étapes d'installation. |
| **iPhone / iPad** (Safari) | Les étapes : **Partager → Sur l'écran d'accueil → Ajouter**. |
| Autre navigateur sur iPhone, navigateur intégré (Gmail, Outlook, Facebook…) | « Ouvre ce lien dans Safari / dans Chrome » + **Copier le lien**. |
| **PC** | « Installe Card Pro sur ton téléphone » + un **QR code** du lien à scanner. |

L'icône Card Pro apparaît ensuite sur l'écran d'accueil comme une application. Elle fonctionne **hors ligne**.

**Mise à jour automatique (iPhone)** : à chaque ouverture et à chaque retour dans l'appli, si le téléphone est en ligne, elle vérifie s'il existe une nouvelle version, la télécharge et se recharge toute seule (jamais pendant un scan). Un message « Card Pro a été mis à jour » s'affiche.

### Adresse de l'appli dans le Configurateur

`CardPro-Configurateur.exe` connaît l'adresse de l'appli mobile (déduite du dépôt GitHub à la compilation) et l'affiche en **QR code d'installation** à côté du QR animé : la personne installe l'appli, puis scanne sa carte dans la foulée. En développement, la variable d'environnement `LIEN_PORTEFEUILLE` (HTTPS obligatoire) fait la même chose.

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

### Essayer en local

Le Configurateur sert aussi le portefeuille : **http://localhost:48080/portefeuille/**. Sur PC, il n'affiche que l'écran « Installe Card Pro sur ton téléphone » (c'est voulu). Pour tester l'appli elle-même, utilise l'adresse GitHub Pages sur un téléphone.

## Appli Android (APK avec NFC)

L'appli Android contient tout le portefeuille, plus le NFC. Elle est **construite et signée automatiquement** par GitHub à chaque `git push`, puis proposée sur la page d'installation Android (`…/telechargement/CardPro.apk`).

### Clé de signature (une seule fois)

Android exige que chaque version soit signée avec **la même clé**. Garde-la précieusement **hors du dépôt** : sans elle, impossible de publier une mise à jour (il faudrait désinstaller l'appli et perdre les cartes).

1. Dans le dossier du projet (invite de commandes), crée la clé avec Docker ou Java (`keytool`) :
   ```cmd
   docker run --rm -it -v "%cd%:/travail" -w /travail eclipse-temurin:17 keytool -genkeypair -v -keystore cardpro.jks -alias cardpro -keyalg RSA -keysize 4096 -validity 10000
   ```
   Choisis un mot de passe solide et réponds aux questions (nom, organisation…).
2. Copie la clé en Base64 dans le presse-papiers :
   ```cmd
   powershell -NoProfile -Command "[Convert]::ToBase64String([IO.File]::ReadAllBytes('cardpro.jks')) | Set-Clipboard"
   ```
3. Sur GitHub : **Settings → Secrets and variables → Actions → New repository secret**, crée 4 secrets :

   | Nom | Valeur |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | le texte copié à l'étape 2 |
   | `ANDROID_KEYSTORE_MOT_DE_PASSE` | le mot de passe choisi |
   | `ANDROID_CLE_ALIAS` | `cardpro` |
   | `ANDROID_CLE_MOT_DE_PASSE` | le même mot de passe |

4. Range `cardpro.jks` en lieu sûr (clé USB, gestionnaire de mots de passe) puis supprime-le du dossier. `.gitignore` empêche de toute façon de l'envoyer sur GitHub.

> Sans ces secrets, la publication s'arrête avec le message « Secret ANDROID_KEYSTORE_BASE64 manquant ».

### Installer et mettre à jour

- **Installer** : sur Android, ouvre l'adresse du portefeuille → **Télécharger l'appli Card Pro** → ouvre `CardPro.apk` → autorise l'installation (« sources inconnues ») → **Installer**. Play Protect peut afficher un avertissement (appli hors Play Store) : « Plus de détails » → « Installer quand même ».
- **Mettre à jour** : retélécharge l'appli depuis la page du portefeuille et installe-la par-dessus. Les cartes sont conservées. (Pas de mise à jour automatique sur Android : le droit « installer des applis » qu'elle demande fait bloquer l'appli par Play Protect.)
- Les cartes de l'appli Android et celles de l'appli web sont stockées séparément.

## Exemples d'utilisation

1. **Modèles** → choisis un modèle de base → **Dupliquer**.
2. Donne-lui un nom, ajoute ton logo (« + Image »), place les éléments à la souris, règle le verso, puis **Enregistrer**.
3. **Cartes** → « Entreprises » → **+ Ajouter une entreprise** : nom, adresse, standard, site, logo.
4. **Cartes** → « Importer une liste » → télécharge le fichier modèle, remplis-le dans Excel, enregistre-le en CSV et importe-le en choisissant ton modèle. Pour chaque carte, choisis son **entreprise** dans le formulaire (les cartes ajoutées ensuite reprennent celle de la carte sélectionnée).
5. « Contrôle avant export » → **Contrôler toutes les cartes**, et corrige ce qui est signalé.
6. Sélectionne une personne pour vérifier sa carte, puis télécharge :
   - **Recto PNG** : pour l'envoyer par e-mail ;
   - **PDF recto + verso** : pour un imprimeur ;
   - **Planche A4** : pour imprimer toi-même. Imprime en recto-verso « bord long », puis découpe le long des traits.
7. **Toutes les cartes (ZIP)** : tous les fichiers de toute l'équipe en une fois.
8. Nouveau design pour tout le monde : « Changer le design de plusieurs cartes » → design actuel → nouveau design → **Appliquer**.

## Sécurité

- **Usage local** : pas de comptes. Le serveur n'écoute que sur **127.0.0.1** : il est inaccessible depuis le réseau.
- **DNS rebinding** : le nom d'hôte de chaque requête doit être `localhost` / `127.0.0.1` / `[::1]` avec le bon port ; un site malveillant qui ferait pointer son propre nom vers ce PC est refusé (code 421).
- **Sauvegarde** : la restauration revalide chaque modèle, chaque entreprise et chaque personne (mêmes règles que le reste), dans une seule transaction (tout ou rien), après confirmation ; taille limitée à 64 Mo.
- **Anti-CSRF** : toute requête qui modifie des données doit venir de l'application elle-même (contrôle de l'en-tête `Origin`). Un site malveillant ouvert dans le navigateur ne peut donc rien modifier.
- **Injection SQL** : uniquement des **requêtes préparées**.
- **Validation** : toutes les données (formulaire, import CSV, modèles JSON, API) sont **revalidées par le serveur** avec le même code que le navigateur, à partir de schémas :
  - longueurs, nombres et listes de choix en liste blanche ;
  - couleurs au format `#rrggbb` ;
  - liens en `http`/`https` uniquement ;
  - 40 éléments maximum par face ;
  - taille des requêtes limitée.
- **XSS** : aucun `innerHTML`. Le texte est inséré via `textContent`, et une **CSP stricte** (`script-src 'self'`) est appliquée par une balise et un en-tête HTTP.
- **Polices** : chargées uniquement depuis les fichiers de l'appli (même origine, jamais depuis Internet) ; dans les exports, elles sont copiées dans le fichier en Base64.
- **Entreprises** : revalidées par le serveur comme les personnes (téléphone, liens `http`/`https`, logo = image vérifiée) ; l'identifiant est toujours donné par le serveur ; une carte ne peut être reliée qu'à une entreprise qui existe ; suppression refusée (409) tant que des cartes y sont reliées.
- **Signature e-mail** : construite avec le DOM (aucun texte interprété comme du HTML) ; liens uniquement à partir de valeurs déjà validées (`http`/`https`, `tel:`, `mailto:`) ; styles posés via le CSSOM, sans assouplir la CSP (`style-src 'self'`).
- **Images** : PNG, JPEG ou WebP uniquement (signature vérifiée, 8 Mo maximum), **redessinées dans un canvas** pour supprimer tout contenu caché. Le SVG est refusé.
- **Injection vCard** : valeurs échappées (`\ ; ,` et retours à la ligne).
- **CSV** : à l'export, les cellules qui commencent par `= + - @` sont neutralisées (pas de formule exécutée dans Excel). À l'import, le fichier est limité à 1 Mo et 500 personnes.
- **Prototype** : les identifiants et les clés sont vérifiés, et les champs inconnus sont ignorés.
- **Fichiers** : seule une liste blanche est servie (`index.html`, `assets/`, `src/`…). Le code du serveur, la base et les fichiers cachés sont inaccessibles, et la traversée de dossiers est bloquée.
- **Erreurs** : messages génériques côté client, détails uniquement dans les journaux du serveur.
- **En-têtes HTTP** : CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP.
- **CardPro-Configurateur.exe** : contient le `node.exe` officiel (empreinte SHA-256 vérifiée à la compilation) ; aucune permission administrateur ; extraction dans `%LOCALAPPDATA%` (les chemins qui sortiraient du dossier sont refusés) ; n'ouvre dans le navigateur que l'appli locale et GitHub ; la recherche de mise à jour lit seulement le numéro de la dernière version publique (rien n'est envoyé) ; arrêt propre du serveur à la fermeture.
- **Secrets** : aucun n'est nécessaire. `.env` est exclu de Git et de l'image.
- **Portefeuille mobile** :
  - les cartes restent sur le téléphone (IndexedDB) ; l'application ne contacte aucun serveur (CSP `connect-src 'self'`) ;
  - tout fichier reçu (GIF, `.cardpro`, QR) est une source non fiable : taille limitée (3 Mo de carte, 4 Mo une fois décompressée, contre les « bombes de décompression »), chaque longueur est vérifiée, et les données repassent par **les mêmes validations** que la page web (textes, couleurs, liens `http`/`https`, images PNG/JPEG/WebP à la signature vérifiée) ;
  - les cartes lues depuis le stockage sont revalidées avant affichage ; les liens d'appel et d'e-mail sont construits à partir de valeurs déjà nettoyées ;
  - le QR animé est contrôlé par un **CRC-32** : une lecture incomplète ou erronée est rejetée ;
  - la page web n'a pas accès à la caméra (`Permissions-Policy: camera=()`), seul le portefeuille y a droit ;
  - **appli Android** : aucune permission Internet ; la WebView n'affiche que les pages incluses dans l'appli (tout autre lien s'ouvre dans l'appli adaptée du téléphone) ; caméra et choix de fichiers réservés à ces pages ; les fonctions Android appelées par la page vérifient chaque paramètre (types de fichiers en liste blanche, tailles limitées, noms nettoyés) ; fichiers partagés uniquement via un dossier dédié (FileProvider) ;
  - **mises à jour** : le nouvel exe n'est installé qu'après vérification de son empreinte SHA-256 (publiée avec la version), de son en-tête et de son numéro de version ; les téléchargements ne viennent que des « Releases » du dépôt, en HTTPS. Android refuse toute mise à jour de l'APK qui ne serait pas signée avec la même clé ;
  - **NFC** : puce émulée en **lecture seule**, active seulement quand la personne l'active sur une carte, coupée dès que l'appli passe en arrière-plan ;
  - **lien « contact »** (iPhone) : les données sont après le `#`, donc jamais envoyées au serveur ; la page les revalide comme le reste (liens `http`/`https` seulement…) ;
  - **clé de signature** : uniquement dans les secrets GitHub, écrite le temps de la compilation puis effacée ; `*.jks` est exclu de Git ;
  - l'appli ne s'ouvre qu'installée sur un téléphone : c'est une règle d'usage, pas une protection (le code est public et ne contient aucune donnée) ;
  - l'adresse de l'appli (`LIEN_PORTEFEUILLE`) est validée par le serveur : HTTPS uniquement ;
  - la publication GitHub n'a que les droits nécessaires (lecture du code, écriture sur Pages), lance les tests avant de publier, et fige la version de jsQR.
