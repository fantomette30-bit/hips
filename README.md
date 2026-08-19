# Sudoku Zen — app iPhone premium, 100 % hors ligne

Application iOS native (SwiftUI) pour jouer au Sudoku n'importe où, y compris en
mode avion : les grilles sont **créées sur l'iPhone**, il n'y a ni réseau, ni
compte, ni publicité, ni suivi.

Trois niveaux : **Facile**, **Moyen**, **Difficile**.

## Ouvrir le projet

```bash
open ZenSudoku.xcodeproj
```

* Xcode 16 ou plus récent (le projet utilise les groupes synchronisés du système de fichiers).
* Cible : iOS 17.0 et plus, iPhone, portrait.
* Sélectionnez votre équipe de signature dans *Signing & Capabilities*, puis lancez sur simulateur ou appareil.

Aucune dépendance externe : ni CocoaPods, ni SPM, ni ressource distante.

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
2. **Creusement** par paires symétriques :
   - *Facile* et *Moyen* : une case n'est retirée que si la grille reste résoluble avec les techniques simples (candidats uniques et cachés, puis groupes verrouillés / paires nues au niveau moyen).
   - *Difficile* : une case est retirée tant que la **solution reste unique**, ce qui laisse apparaître des grilles exigeant des techniques avancées.
3. **Notation** (`DifficultyRater`) : la grille est rejouée coup par coup comme le ferait un joueur. Chaque coup coûte d'autant plus cher qu'il est difficile à repérer (un candidat unique parmi quatre disponibles coûte 1, un candidat caché isolé coûte 22, une technique avancée 45 à 80).
4. **Sélection** : si le score ne tombe pas dans la fourchette du niveau, la grille est régénérée (24 essais maximum, la meilleure candidate est conservée).

Fourchettes de score retenues après calibration : *Facile* ≤ 85 (~40 indices),
*Moyen* 95–210 (~30 indices), *Difficile* ≥ 215 (~24–28 indices).

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
