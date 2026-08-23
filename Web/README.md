# Le jeu — un seul fichier autonome

`index.html` contient tout : la charte graphique, le moteur (techniques de
résolution, notation de difficulté, garanties d'unicité), l'interface et les
neuf niveaux. Aucune dépendance, aucun réglage à faire.

**À quoi ça sert :** la page s'ouvre dans Safari sur l'iPhone et s'ajoute à
l'écran d'accueil en deux gestes (Partager → « Sur l'écran d'accueil »). Elle
s'affiche alors en plein écran, avec sa propre icône, et fonctionne sans réseau.

**Ce qui est stocké** : la partie en cours, les statistiques et les réglages,
dans le `localStorage` du navigateur — rien ne sort du téléphone.

**Polices** : uniquement celles du système (SF Pro pour le texte, New York /
Georgia pour les titres). La page ne fait **aucune requête réseau** — pas même
pour une police.

## Grilles illimitées

Rien n'est stocké ni téléchargé : chaque partie fabrique une grille neuve sur
l'appareil, autant de fois que vous le voulez, sur les neuf niveaux. La
recherche continue jusqu'à obtenir une grille du niveau demandé — elle n'est
pas interrompue par un budget de temps. Pour que l'écran reste vivant, les
essais sont découpés en tranches de 90 ms, le compteur d'essais s'affiche, un
bouton *Annuler* apparaît au bout d'une seconde et demie, et un message
explicite prend le relais si la recherche dépasse huit secondes.

Mesures (169 grilles enchaînées, aucune répétition) : 1 essai et 1 ms par
grille facile, 3 essais et 24 ms en difficile, 17 essais et 256 ms en extrême,
53 essais et 757 ms en titan. Si aucune grille notable ne sortait — cas jamais
observé — la recherche se termine malgré tout par une grille jouable plutôt que
de tourner sans fin.

## Score

Chaque bonne case rapporte `10 × rang du niveau` (Facile 10 … Légende 90),
multiplié par la série de bonnes réponses en cours (×1,1 par bonne case d'affilée, jusqu'à ×2). Fermer une
ligne, une colonne ou un bloc rapporte `50 × rang` et déclenche une vague
lumineuse sur les cases concernées. Une erreur coûte `20 × rang`, un indice
`30 × rang`, et l'un comme l'autre remettent la série à zéro ; une ligne fermée
grâce à un indice ne rapporte pas de bonus. À l'arrivée s'ajoutent `200 × rang`,
un bonus de rapidité, et `100 × rang` si la partie s'est jouée sans faute ni
indice. Une case déjà comptée ne rapporte pas deux fois, même effacée puis
ressaisie.

Le score court est affiché pendant la partie, le détail à la victoire, et les
totaux par niveau dans les statistiques.

## Notes et signal d'erreur

Chaque note occupe **une position fixe dans la case, comme sur une grille
papier** : 1 en haut à gauche, 2 en haut au milieu … 9 en bas à droite. Une
note absente laisse sa place vide, et l'ordre de saisie ne change rien à
l'affichage.

Un chiffre faux reste en rouge, mais il est aussi signalé **par la forme et le
mouvement** : la case est secouée au moment de la saisie et le chiffre est
entouré d'un cercle — comme une correction au stylo — tant qu'il n'est pas
corrigé. Repérable même avec des lunettes filtrant la lumière bleue ou une
perception altérée des couleurs.

## Numéro de version

Le numéro de version affiché dans **Réglages → Version** vient de la constante
`APP_VERSION` (en tête du script applicatif) : l'incrémenter à chaque mise à
jour publiée, et consigner le changement dans [CHANGELOG.md](../CHANGELOG.md).

## Version hors ligne garantie (`docs/`)

`Web/index.html` fonctionne déjà sans réseau une fois la page chargée, mais rien
ne garantit que Safari la conservera en cache. Le dossier `docs/` ajoute ce qui
manque pour une garantie réelle :

* `manifest.webmanifest` — nom, icône et affichage plein écran de l'app installée ;
* `sw.js` — un *service worker* qui met la page, le manifeste et les icônes en
  cache à la première ouverture, puis sert toujours depuis ce cache ;
* `icon-180.png`, `icon-1024.png` — l'icône de l'écran d'accueil.

Une fois `docs/` publié, ouvrez l'adresse une fois sur l'iPhone et ajoutez-la à
l'écran d'accueil : le jeu se lance ensuite sans aucun réseau, même après un
redémarrage du téléphone.

Deux façons de le publier :

* **Vercel** (celle en service) — un sas décrit dans
  [Tools/vercel-shell](../Tools/vercel-shell/README.md) sert le jeu depuis le
  cache et va chercher tout seul la dernière version publiée dans `docs/`. Une
  poussée sur la branche suffit donc à mettre à jour l'app installée.
* **GitHub Pages** — *Settings → Pages → Deploy from a branch → dossier `/docs`*.
  Le workflow `.github/workflows/pages.yml` s'en charge dès que les permissions
  d'Actions sont en écriture.

`docs/` est généré, ne l'éditez pas à la main :

```bash
python3 Tools/build-pwa.py
```

## Tests

```bash
npm i playwright        # une fois
node Tools/EngineCheck/<suite>.test.js
```

Treize suites, chacune autonome et silencieuse quand tout va bien. La liste
complète et ce que couvre chaque suite : [Tools/EngineCheck/README.md](../Tools/EngineCheck/README.md).

Les plus parlantes :

* `webengine` — génère les neuf niveaux et vérifie fourchette de score, solution
  unique, résolution sans deviner, médianes strictement croissantes.
* `webui` — pilote une vraie partie sur iPhone 13 : sélection, saisie, erreur
  signalée, annulation, notes, pause, indices jusqu'à la victoire, statistiques,
  reprise après rechargement, thème sombre.
* `weboffline` — sert `docs/`, laisse le service worker s'installer, **tue le
  serveur**, coupe le réseau, puis rouvre le jeu et termine une partie.
* `webshell` — monte le sas Vercel à neuf et vérifie la mise à jour automatique.
* `webrobustness` — les cas tordus : sauvegarde ou statistiques corrompues,
  annulation d'une génération, double appui sur deux niveaux, 40 saisies puis
  annulation complète, cases fixes, notes sur case remplie, pause, victoire
  rejouée, reprise, recommencer, réglages désactivés, stockage indisponible,
  historique saturé au-delà de 400 coups, clavier, changement de thème en
  pleine partie.
* `webultimate` — Démoniaque, Titan et Légende : recherche annulable, fourchette,
  partie entière, statistiques, version affichée.
