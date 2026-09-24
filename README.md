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
| `Tools/vercel-shell/` | le sas publié sur Vercel, la construction du projet Vercel et l'outil d'envoi : le sas sert le jeu depuis le cache et va chercher tout seul la dernière version publiée sur le site |
| `Tools/EngineCheck/` | la batterie de tests (Node + Playwright) |

Installation sur l'iPhone : [INSTALLATION.md](INSTALLATION.md).
Détails de la version web : [Web/README.md](Web/README.md).

Après toute modification du jeu :

```bash
python3 Tools/build-pwa.py     # régénère docs/
```

Pour publier, on envoie ensuite la nouvelle version à Vercel (projet
`sudoku-zen-app`) — la marche à suivre est dans
[Tools/vercel-shell/README.md](Tools/vercel-shell/README.md). L'app déjà
installée la récupère à la première ouverture avec du réseau, et l'accueil
propose de l'installer d'un appui. Ni le site ni l'app ne dépendent de GitHub.

## Fonctionnalités

**Jeu**
- Grille 9×9 dessinée sur mesure, surlignage de la ligne, de la colonne, du bloc et des chiffres identiques.
- Mode notes à position fixe (1 en haut à gauche … 9 en bas à droite), effacement automatique des notes des cases voisines, remplissage automatique des notes.
- **Verrou de note** : en mode Notes, un appui sur un chiffre le garde en main ; il suffit ensuite de toucher les cases pour y poser cette note. Les cases qui la portent déjà sont cerclées.
- Annulation illimitée, gomme, chronomètre avec pause, compteur d'erreurs.
- Pavé numérique avec compteur de chiffres restants (un chiffre placé neuf fois se grise).
- **Notes du chiffre suivi** : quand la case choisie porte un chiffre (ou qu'un chiffre est gardé en main par le verrou), ce chiffre ressort dans les notes de toutes les autres cases.
- Chiffre faux signalé par la couleur **et** par la forme : secousse à la saisie, cercle autour du chiffre tant qu'il n'est pas corrigé.
- **Indices explicatifs** : le jeu ne se contente pas de révéler une case, il nomme la technique utilisée (candidat unique, candidat caché, paire pointante, paire nue, paire cachée, triplet nu, X-Wing, XY-Wing, Swordfish, XYZ-Wing, W-Wing, Gratte-ciel) et met les notes à jour.
- Reprise automatique de la partie en cours, même après avoir quitté le jeu.
- **Grille suivante prête d'avance** : pendant la partie, la prochaine grille du même niveau se prépare en arrière-plan (dans un Worker, sans ralentir l'écran) ; la suivante démarre sans attente, Titan et Légende compris. L'écran de victoire propose « Nouvelle grille » pour enchaîner d'un geste.

**Score**
- Chaque bonne case rapporte `10 × rang du niveau`, multiplié par la série de bonnes réponses en cours (jusqu'à ×2). Fermer une ligne, une colonne ou un bloc rapporte `50 × rang` avec une vague lumineuse.
- Une erreur coûte `20 × rang`, un indice `30 × rang` ; l'un comme l'autre cassent la série.
- À l'arrivée : `200 × rang`, un bonus de rapidité, et `100 × rang` si la partie s'est jouée sans faute ni indice.

**Suivi**
- Statistiques par niveau : parties, victoires, meilleur score, meilleur temps **sans indice** (c'est ce qui compte comme record), temps moyen, série en cours, meilleure série, victoires sans faute ni indice.
- Écran de victoire avec confettis, détail des points et signalement des nouveaux records.

**Confort**
- Thème clair / sombre / automatique (l'automatique suit le réglage du téléphone en direct).
- **Écran maintenu allumé** pendant la partie (iOS 18.4 et plus, app installée) : rendu en pause, à la victoire, à l'accueil et après cinq minutes sans geste. Réglage « Garder l'écran allumé ».
- Animations discrètes, aides visuelles activables une par une. Vibrations sur Android ; Safari ne donne pas accès au vibreur de l'iPhone, le jeu s'en passe donc sur iOS.
- **Mise à jour en un geste** : une nouvelle version téléchargée est annoncée sur l'accueil et s'installe d'un appui, partie en cours conservée.
- **Stockage protégé** : dans l'app installée, le jeu demande au système de ne pas purger ses données quand l'appareil manque de place.
- Numéro de version visible dans **Réglages → Version** ; historique dans [CHANGELOG.md](CHANGELOG.md).

## Comment les niveaux sont calibrés

La difficulté n'est pas déduite du seul nombre de cases vides : elle est **mesurée**.

1. **Grille complète** : remplissage aléatoire par retour sur trace.
2. **Creusement** :
   - chaque niveau creuse **jusqu'à son propre palier** : une case n'est retirée que si la grille reste résoluble avec les techniques autorisées à ce niveau. Une grille Facile reste donc résoluble aux seuls candidats évidents, une Difficile aux groupes verrouillés, etc.
   - à partir d'Expert le creusement est asymétrique, ce qui permet de descendre plus bas en nombre d'indices.
3. **Notation** : la grille est rejouée coup par coup comme le ferait un joueur. Chaque coup coûte d'autant plus cher qu'il est difficile à repérer — un candidat unique parmi quatre disponibles coûte 1, un candidat caché isolé 22, une technique de palier 3 vaut 45, de palier 4 vaut 80, de palier 5 vaut 140, de palier 6 vaut 220. On compte aussi les « murs » : les coups de palier 5 ou 6.
4. **Sélection** : la grille n'est retenue que si elle exige exactement le palier du niveau et le bon nombre de murs, dans la fourchette de score prévue ; sinon on régénère. Les essais sont découpés en tranches de 90 ms, avec compteur et bouton d'annulation, pour que l'écran ne se fige jamais ; les niveaux rares ont une patience bornée, au-delà de laquelle la meilleure grille rencontrée est retenue.
5. **Réserve** : pendant la partie, un Worker fabrique la grille suivante du même niveau selon exactement les mêmes règles. Elle est rangée sur l'appareil, vérifiée à la lecture (grille complète valide, indices conformes, résolution sans deviner), servie une seule fois, et ignorée si une autre version du jeu l'a produite.

| Niveau | Palier exigé | « Murs » | Indices | Ce qu'il faut savoir faire |
|---|---|---|---|---|
| Facile | 1 | 0 | ~40 | candidats évidents |
| Moyen | 2 | 0 | ~30 | candidats cachés |
| Difficile | 3 | 0 | 26–31 | groupes verrouillés, paires nues |
| Expert | 4 | 0 | 23–26 | paires cachées, triplets, X-Wing |
| Master | 5 | 1 | 22–26 | XY-Wing, Swordfish |
| Extrême | 6 | 2 | 23–26 | XYZ-Wing, W-Wing, Gratte-ciel |
| Démoniaque | 6 | 3 | 23–26 | trois murs à franchir |
| Titan | 6 | 4 | 22–27 | quatre murs |
| Légende | 6 | 5 et + | 22–27 | cinq murs ou davantage |

Un « mur » est un coup avancé (palier 5 ou 6) sur lequel on bute vraiment :
c'est ce qui se ressent le plus en jouant. Le palier exigé est **exact** — une
grille Difficile ne peut pas réclamer un XY-Wing, ni une Expert un Swordfish —
et le creusement s'arrête au palier du niveau, si bien que la difficulté monte
d'une marche à chaque niveau.

Scores mesurés (médianes) : 48, 129, 290, 562, 799, 1014, 1245, 1372, 1859.

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
SDK tiers, pas d'identifiant publicitaire. Partie en cours, statistiques,
réglages et grilles en réserve sont stockés dans le `localStorage` du
navigateur, sur le téléphone. Le Worker qui prépare les grilles est créé en
mémoire à partir du moteur de la page, et la recherche d'une mise à jour se
contente de relire le cache de l'appareil : ni l'un ni l'autre ne touche au
réseau. Seul le service worker du sas va chercher, à l'ouverture, la dernière
version publiée du jeu, sur le site même d'où il a été installé — sans rien
envoyer.
