# Sudoku Zen — app iPhone premium, 100 % hors ligne

Application iOS native (SwiftUI) pour jouer au Sudoku n'importe où, y compris en
mode avion : les grilles sont **créées sur l'iPhone**, il n'y a ni réseau, ni
compte, ni publicité, ni suivi.

Six niveaux, comme les grands sites de sudoku : **Facile**, **Moyen**,
**Difficile**, **Expert**, **Master**, **Extrême**.

## Ouvrir et lancer (sur Mac)

```bash
git clone -b claude/sudoku-premium-iphone-app-ji3x03 https://github.com/fantomette30-bit/hips.git
cd hips
open ZenSudoku.xcodeproj
```

1. Dans Xcode, sélectionnez la cible **ZenSudoku** puis l'onglet *Signing & Capabilities*.
2. Choisissez votre équipe (*Team*) — un identifiant Apple gratuit suffit pour installer
   sur votre propre iPhone ; l'app doit alors être réinstallée tous les 7 jours.
3. Choisissez un simulateur d'iPhone ou votre iPhone branché, puis ⌘R.

* Xcode 15 ou plus récent (format de projet classique, compatible Xcode 15 et 16).
* Cible : iOS 17.0 et plus, iPhone, portrait.
* Aucune dépendance externe : ni CocoaPods, ni SPM, ni ressource distante.

Construire une app iOS demande un Mac : depuis un iPhone seul, on peut lire le code
sur GitHub mais pas le compiler. Le guide pas à pas pour installer l'app sur votre
iPhone (signature, mode développeur, TestFlight, pannes courantes) est dans
[INSTALLATION.md](INSTALLATION.md).

Si vous ajoutez un fichier Swift, pensez à l'ajouter à la cible dans Xcode (le projet
liste explicitement ses fichiers pour rester compatible avec Xcode 15).

## Fonctionnalités

**Jeu**
- Grille 9×9 dessinée sur mesure, surlignage de la ligne, de la colonne, du bloc et des chiffres identiques.
- Mode notes (petits crayons), effacement automatique des notes des cases voisines, remplissage automatique des notes.
- Annulation illimitée, gomme, chronomètre avec pause, compteur d'erreurs.
- Pavé numérique avec compteur de chiffres restants (un chiffre placé neuf fois se grise).
- **Indices explicatifs** : l'app ne se contente pas de révéler une case, elle nomme la technique utilisée (candidat unique, candidat caché, paire pointante, paire nue, paire cachée, triplet nu, X-Wing) et met les notes à jour.
- Reprise automatique de la partie en cours, même après avoir quitté l'app.

**Suivi**
- Statistiques par niveau : parties, victoires, taux de réussite, meilleur temps, temps moyen, série en cours, meilleure série, victoires sans faute ni indice.
- Écran de victoire avec confettis, récapitulatif et signalement des nouveaux records.

**Confort**
- Thème clair / sombre / système, palette et typographie dédiées.
- Retours haptiques, animations discrètes, aides visuelles activables une par une.

## Comment les niveaux sont calibrés

La difficulté n'est pas déduite du seul nombre de cases vides : elle est **mesurée**.

1. **Grille complète** : remplissage aléatoire par retour sur trace.
2. **Creusement** :
   - *Facile* et *Moyen* : une case n'est retirée que si la grille reste résoluble avec les techniques simples (candidats uniques et cachés, puis groupes verrouillés et paires nues).
   - *Difficile* à *Extrême* : une case est retirée tant que la **solution reste unique**, ce qui laisse apparaître des grilles exigeant des techniques avancées. Les deux derniers niveaux creusent sans symétrie, ce qui permet de descendre plus bas en nombre d'indices.
3. **Notation** (`DifficultyRater`) : la grille est rejouée coup par coup comme le ferait un joueur. Chaque coup coûte d'autant plus cher qu'il est difficile à repérer — un candidat unique parmi quatre disponibles coûte 1, un candidat caché isolé 22, une technique de palier 3 vaut 45, de palier 4 vaut 80, de palier 5 vaut 140.
4. **Sélection** : si le score ne tombe pas dans la fourchette du niveau, la grille est régénérée, dans la limite d'un budget de temps (2,5 s, 4 s pour les niveaux corsés), la meilleure candidate servant de repli.

| Niveau | Score visé | Indices | Techniques typiques |
|---|---|---|---|
| Facile | ≤ 85 | ~40 | candidats uniques |
| Moyen | 95–200 | ~30 | candidats cachés |
| Difficile | 210–330 | 26–29 | les coups évidents se raréfient |
| Expert | 345–480 | 24–30 | groupes verrouillés, paires nues |
| Master | 495–680 | 22–28 | triplets, paires cachées, X-Wing |
| Extrême | ≥ 700 | 22–27 | XY-Wing, Swordfish |

Techniques implémentées : candidat unique, candidat caché, paire pointante,
chiffre revendiqué, paire nue, paire cachée, triplet nu, triplet caché, X-Wing,
XY-Wing, Swordfish.

Deux garanties pour toutes les grilles produites : **solution unique** et
**résolution possible sans deviner** — le système d'indices peut donc toujours
proposer une déduction logique.

La génération tourne sur un fil d'arrière-plan (quelques dizaines de
millisecondes) et l'interface affiche une courte animation de création.

## Organisation du code

```
ZenSudoku/
  ZenSudokuApp.swift        Point d'entrée SwiftUI
  Core/                     Moteur : géométrie de la grille, solveur, techniques,
                            notation de difficulté, générateur
  Game/GameState.swift      État d'une partie : saisie, notes, annulation, indices,
                            chronomètre, détection de victoire
  Store/                    Sauvegarde de la partie, statistiques, réglages (fichiers
                            JSON locaux + UserDefaults)
  Design/                   Charte graphique, typographie, retours haptiques
  Views/                    Accueil, partie, grille, pavé numérique, victoire,
                            statistiques, réglages
  Assets.xcassets           Icône et couleur d'accent
```

Le moteur (`Core/`) n'importe que Foundation : il est testable et réutilisable
indépendamment de l'interface. Les candidats d'une case sont encodés dans un
masque de bits `UInt16`, ce qui rend le solveur assez rapide pour évaluer des
dizaines de grilles par seconde sur l'appareil.

## Version web (sans Mac) et version hors ligne garantie

`Web/index.html` reprend le même jeu et le même moteur en un fichier HTML
autonome, à ouvrir dans Safari puis à ajouter à l'écran d'accueil de l'iPhone.

`docs/` en est la **version installable hors ligne** : même page, plus un
manifeste et un service worker qui met tout en cache à la première ouverture.
Une fois publiée via GitHub Pages et ajoutée à l'écran d'accueil, elle se lance
sans aucun réseau. `docs/` se régénère depuis la source :

```bash
python3 Tools/build-pwa.py
```

Voir [Web/README.md](Web/README.md) pour la marche à suivre côté iPhone.

## Vérification du moteur

Le moteur est translittéré à l'identique en Python dans `Tools/EngineCheck/`
pour être testé hors Xcode :

```bash
python3 Tools/EngineCheck/tests.py
```

45 grilles générées (15 par niveau) y sont contrôlées : solution unique,
résolution possible sans deviner, indices qui ne placent jamais une valeur
fausse, annulation exacte, notes, détection de victoire, sauvegarde. Voir
`Tools/EngineCheck/README.md`.

## Vie privée

Aucune donnée ne quitte l'appareil : pas de requête réseau dans le code, pas de
SDK tiers, pas d'identifiant publicitaire. Les sauvegardes et statistiques sont
stockées dans le conteneur de l'application.
