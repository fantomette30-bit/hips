# Sudoku Zen — jeu premium pour iPhone, 100 % hors ligne

Un Sudoku qui s'installe sur l'écran d'accueil de l'iPhone depuis Safari et se
joue **sans réseau**, y compris en mode avion : les grilles sont créées sur le
téléphone, il n'y a ni compte, ni publicité, ni suivi.

Neuf niveaux : **Facile**, **Moyen**, **Difficile**, **Expert**, **Master**,
**Extrême**, **Démoniaque**, **Titan**, **Légende**.

## Où est le jeu

| Chemin | Rôle |
|---|---|
| `Web/index.html` | le jeu entier — un seul fichier HTML autonome (moteur + interface) |
| `docs/` | la version installable hors ligne : la même page, plus un manifeste et un service worker. **Générée**, ne pas éditer à la main |
| `Tools/build-pwa.py` | régénère `docs/` depuis `Web/index.html` |
| `Tools/vercel-shell/` | le sas déployé sur Vercel : il sert le jeu depuis le cache et va chercher tout seul la dernière version publiée dans `docs/` |
| `Tools/EngineCheck/` | la batterie de tests (Node + Playwright) |

Installation sur l'iPhone : [INSTALLATION.md](INSTALLATION.md).
Détails de la version web : [Web/README.md](Web/README.md).

Après toute modification du jeu :

```bash
python3 Tools/build-pwa.py     # régénère docs/
```

Une poussée sur la branche suffit ensuite à mettre à jour l'app déjà installée :
le sas récupère la nouvelle version à la première ouverture avec du réseau.

## Fonctionnalités

**Jeu**
- Grille 9×9 dessinée sur mesure, surlignage de la ligne, de la colonne, du bloc et des chiffres identiques.
- Mode notes à position fixe (1 en haut à gauche … 9 en bas à droite), effacement automatique des notes des cases voisines, remplissage automatique des notes.
- Annulation illimitée, gomme, chronomètre avec pause, compteur d'erreurs.
- Pavé numérique avec compteur de chiffres restants (un chiffre placé neuf fois se grise).
- Chiffre faux signalé par la couleur **et** par la forme : secousse à la saisie, cercle autour du chiffre tant qu'il n'est pas corrigé.
- **Indices explicatifs** : le jeu ne se contente pas de révéler une case, il nomme la technique utilisée (candidat unique, candidat caché, paire pointante, paire nue, paire cachée, triplet nu, X-Wing, XY-Wing, Swordfish, XYZ-Wing, W-Wing, Gratte-ciel) et met les notes à jour.
- Reprise automatique de la partie en cours, même après avoir quitté le jeu.

**Score**
- Chaque bonne case rapporte `10 × rang du niveau`, multiplié par la série de bonnes réponses en cours (jusqu'à ×2). Fermer une ligne, une colonne ou un bloc rapporte `50 × rang` avec une vague lumineuse.
- Une erreur coûte `20 × rang`, un indice `30 × rang` ; l'un comme l'autre cassent la série.
- À l'arrivée : `200 × rang`, un bonus de rapidité, et `100 × rang` si la partie s'est jouée sans faute ni indice.

**Suivi**
- Statistiques par niveau : parties, victoires, meilleur score, meilleur temps **sans indice** (c'est ce qui compte comme record), temps moyen, série en cours, meilleure série, victoires sans faute ni indice.
- Écran de victoire avec confettis, détail des points et signalement des nouveaux records.

**Confort**
- Thème clair / sombre / automatique (l'automatique suit le réglage du téléphone en direct).
- Retours haptiques, animations discrètes, aides visuelles activables une par une.
- Numéro de version visible dans **Réglages → Version** ; historique dans [CHANGELOG.md](CHANGELOG.md).

## Comment les niveaux sont calibrés

La difficulté n'est pas déduite du seul nombre de cases vides : elle est **mesurée**.

1. **Grille complète** : remplissage aléatoire par retour sur trace.
2. **Creusement** :
   - *Facile* et *Moyen* : une case n'est retirée que si la grille reste résoluble avec les techniques simples (candidats uniques et cachés, puis groupes verrouillés et paires nues).
   - *Difficile* à *Légende* : une case est retirée tant que la **solution reste unique**, ce qui laisse apparaître des grilles exigeant des techniques avancées. À partir de Master le creusement est asymétrique, ce qui permet de descendre plus bas en nombre d'indices.
3. **Notation** : la grille est rejouée coup par coup comme le ferait un joueur. Chaque coup coûte d'autant plus cher qu'il est difficile à repérer — un candidat unique parmi quatre disponibles coûte 1, un candidat caché isolé 22, une technique de palier 3 vaut 45, de palier 4 vaut 80, de palier 5 vaut 140, de palier 6 vaut 220.
4. **Sélection** : si le score ne tombe pas dans la fourchette du niveau, la grille est régénérée — sans limite d'essais, jusqu'à obtenir le niveau demandé. Les essais sont découpés en tranches de 90 ms, avec compteur et bouton d'annulation, pour que l'écran ne se fige jamais.

| Niveau | Score visé | Indices | Techniques typiques |
|---|---|---|---|
| Facile | ≤ 85 | ~40 | candidats uniques |
| Moyen | 95–200 | ~30 | candidats cachés |
| Difficile | 210–330 | 26–29 | les coups évidents se raréfient |
| Expert | 345–480 | 24–30 | groupes verrouillés, paires nues |
| Master | 495–680 | 22–28 | triplets, paires cachées, X-Wing |
| Extrême | 700–849 | 22–27 | XY-Wing, Swordfish |
| Démoniaque | 850–1049 | 22–26 | XYZ-Wing, W-Wing |
| Titan | 1050–1299 | 22–26 | palier 6 exigé |
| Légende | ≥ 1300 | 22–27 | le sommet, palier 6 exigé |

Techniques implémentées : candidat unique, candidat caché, paire pointante,
chiffre revendiqué, paire nue, paire cachée, triplet nu, triplet caché, X-Wing,
XY-Wing, Swordfish, XYZ-Wing, W-Wing, Gratte-ciel.

Deux garanties pour toutes les grilles produites : **solution unique** et
**résolution possible sans deviner** — le système d'indices peut donc toujours
proposer une déduction logique.

## Organisation du code

`Web/index.html` tient en trois parties, dans l'ordre du fichier :

```
<style>              charte graphique : jetons de couleur, thèmes clair/sombre, mise en page
<script id="engine"> moteur pur : géométrie, techniques de résolution, notation,
                     générateur — aucune dépendance au DOM, exportable pour les tests
<script>             application : état de partie, rendu, score, sauvegarde locale,
                     réglages, écrans (accueil, partie, statistiques, victoire)
```

Les candidats d'une case sont encodés dans un masque de bits, ce qui rend le
solveur assez rapide pour évaluer des dizaines de grilles par seconde sur le
téléphone. Le moteur est isolé volontairement : les tests le chargent seul, sans
navigateur.

## Vérification

```bash
npm i playwright                                   # une fois
node Tools/EngineCheck/webengine.test.js           # moteur : neuf niveaux, unicité, indices
node Tools/EngineCheck/webui.test.js               # partie complète pilotée sur iPhone 13
```

La liste complète des suites et ce qu'elles couvrent : [Tools/EngineCheck/README.md](Tools/EngineCheck/README.md).

## Vie privée

Aucune donnée ne quitte l'appareil : pas de requête réseau pendant le jeu, pas de
SDK tiers, pas d'identifiant publicitaire. Partie en cours, statistiques et
réglages sont stockés dans le `localStorage` du navigateur, sur le téléphone.
