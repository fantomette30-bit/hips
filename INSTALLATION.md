# Installer Sudoku Zen sur votre iPhone

L'app n'est pas publiée sur l'App Store : il n'y a donc rien à télécharger depuis
l'iPhone. Elle se **compile sur votre Mac**, puis s'installe sur le téléphone.
Comptez 20 à 30 minutes la première fois (l'essentiel étant le téléchargement
d'Xcode).

Deux méthodes :

| | Compte Apple gratuit | Compte développeur payant (99 €/an) |
|---|---|---|
| Installation | Câble + Mac | Câble + Mac, **ou TestFlight sans câble** |
| Durée de validité | 7 jours, puis réinstaller | 1 an |
| Apps simultanées | 3 | illimité |
| Pour qui | vous seul | vous, vos proches, l'App Store |

La méthode A suffit pour jouer. Commencez par elle.

---

## Méthode A — compte Apple gratuit (recommandé pour commencer)

### 1. Installer Xcode sur le Mac
Ouvrez le **Mac App Store**, cherchez **Xcode**, installez-le (gratuit, ~10 à 15 Go).
Prenez la dernière version disponible : Xcode doit être au moins aussi récent que
l'iOS de votre iPhone, sinon il ne saura pas installer sur l'appareil.
Lancez Xcode une fois et acceptez l'installation des composants additionnels.

### 2. Récupérer le projet
Dans le Terminal du Mac :

```bash
git clone -b claude/sudoku-premium-iphone-app-ji3x03 https://github.com/fantomette30-bit/hips.git
cd hips
open ZenSudoku.xcodeproj
```

Sans Git : sur github.com, ouvrez le dépôt, sélectionnez la branche
`claude/sudoku-premium-iphone-app-ji3x03`, bouton vert **Code → Download ZIP**,
décompressez, puis double-cliquez sur `ZenSudoku.xcodeproj`.

### 3. Ajouter votre identifiant Apple dans Xcode
Menu **Xcode → Settings → Accounts → +** → *Apple ID* → connectez-vous avec
l'identifiant Apple que vous utilisez déjà sur l'iPhone. Aucun paiement,
aucune inscription développeur nécessaire.

### 4. Régler la signature
Dans la colonne de gauche, cliquez sur le projet **ZenSudoku** (icône bleue),
puis sur la cible **ZenSudoku**, onglet **Signing & Capabilities** :

1. Cochez **Automatically manage signing**.
2. **Team** : choisissez votre nom, suivi de *(Personal Team)*.
3. **Bundle Identifier** : remplacez `com.zensudoku.app` par un identifiant qui
   n'appartient qu'à vous, par exemple `com.votrenom.sudokuzen`.
   *C'est l'étape qu'on oublie le plus souvent* : un identifiant déjà utilisé par
   quelqu'un d'autre fait échouer la signature.

Le message d'erreur rouge doit disparaître.

### 5. Préparer l'iPhone
1. Branchez l'iPhone au Mac avec son câble.
2. Sur l'iPhone : **Se fier à cet ordinateur** → code de déverrouillage.
3. Activez le mode développeur : **Réglages → Confidentialité et sécurité →
   Mode développeur → activer**, puis redémarrez l'iPhone et confirmez.
   (Ce menu n'apparaît qu'après avoir branché l'iPhone à un Mac avec Xcode.)

### 6. Lancer
En haut de la fenêtre Xcode, à côté du nom du projet, ouvrez le menu des
destinations et choisissez **votre iPhone** (et non un simulateur).
Appuyez sur **⌘R** (ou le bouton ▶). La compilation prend une à deux minutes.

### 7. Faire confiance au développeur
Au premier lancement, l'iPhone affiche *« Développeur non fiable »*. Sur l'iPhone :
**Réglages → Général → VPN et gestion de l'appareil → votre identifiant Apple →
Se fier**. Relancez l'app depuis l'écran d'accueil.

C'est fini : l'icône est sur votre écran d'accueil et l'app fonctionne en mode
avion, sans réseau ni compte.

### Au bout de 7 jours
Avec un compte gratuit, la signature expire et l'app refuse de s'ouvrir. Il suffit
de rebrancher l'iPhone au Mac, d'ouvrir le projet et de refaire **⌘R** : vos parties
et statistiques sont conservées. Après le premier branchement, vous pouvez faire
ça sans câble en cochant *Connect via network* dans **Window → Devices and
Simulators**.

---

## Méthode B — TestFlight (installation depuis l'iPhone, sans câble)

Nécessite l'**Apple Developer Program** (99 €/an) :

1. Inscription sur <https://developer.apple.com/programs/>.
2. Dans Xcode : **Product → Destination → Any iOS Device**, puis
   **Product → Archive**.
3. Dans l'Organizer qui s'ouvre : **Distribute App → TestFlight & App Store**.
4. Sur <https://appstoreconnect.apple.com>, créez la fiche de l'app, puis ajoutez-vous
   comme testeur interne.
5. Sur l'iPhone, installez l'app **TestFlight** depuis l'App Store : la build y
   apparaît et s'installe d'un bouton, sans câble. Chaque build reste valable 90 jours.

C'est aussi le chemin à suivre pour faire tester l'app à quelqu'un d'autre, ou pour
la publier ensuite sur l'App Store.

---

## Si ça coince

| Symptôme | Cause et remède |
|---|---|
| *Failed to register bundle identifier* | Le Bundle Identifier est déjà pris : changez-le (étape 4.3). |
| *Unable to install… device not supported* | Xcode trop ancien pour l'iOS de l'iPhone : mettez Xcode à jour. |
| L'iPhone n'apparaît pas dans la liste | Câble de charge seule, iPhone verrouillé, ordinateur non approuvé, ou mode développeur non activé (étape 5). |
| *Untrusted Developer* | Étape 7. |
| *Maximum number of apps for free development profiles* | Un compte gratuit gère 3 apps : supprimez-en une de l'iPhone. |
| L'app se ferme aussitôt après 7 jours | Signature gratuite expirée : rebranchez et refaites ⌘R. |

L'iPhone doit tourner sous **iOS 17 ou plus récent**.
