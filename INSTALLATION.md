# Installer Sudoku Zen sur votre iPhone

Aucun Mac, aucun compte, aucune application à télécharger sur l'App Store : le
jeu s'ajoute à l'écran d'accueil depuis Safari et fonctionne ensuite sans réseau.

## Installation (deux minutes)

1. Ouvrez l'adresse du jeu dans **Safari** sur l'iPhone (Chrome ne sait pas
   installer une app web sur iOS) :
   **https://sudoku-zen-app-fantomette30-8687s-projects.vercel.app**
2. Appuyez sur le bouton **Partager** (le carré avec la flèche, en bas de
   l'écran).
3. Faites défiler et choisissez **« Sur l'écran d'accueil »**, puis **Ajouter**.
4. Fermez Safari et lancez le jeu depuis sa nouvelle icône.

À la première ouverture, le jeu se copie entièrement sur le téléphone. Ensuite
il démarre **sans aucun réseau** — en avion, dans le métro, à l'étranger — et
même après un redémarrage de l'iPhone. Rien n'expire.

## Les mises à jour

Elles s'installent toutes seules : ouvrez le jeu une fois avec du réseau, la
nouvelle version est active au lancement suivant. Le numéro installé s'affiche
dans **Réglages → Version** ; ce qui a changé est listé dans
[CHANGELOG.md](CHANGELOG.md).

## Si ça coince

| Symptôme | Remède |
|---|---|
| Pas de « Sur l'écran d'accueil » dans le menu Partager | Vous n'êtes pas dans Safari, ou la page est ouverte dans un onglet privé. Rouvrez l'adresse dans un onglet Safari normal. |
| L'icône ouvre une page blanche | Relancez avec du réseau une fois : le jeu se recopie et repart. |
| Le jeu ne se met pas à jour | Ouvrez-le avec du réseau, puis fermez-le complètement (glissez-le hors du sélecteur d'apps) et rouvrez-le. |
| La partie en cours a disparu | Elle est stockée par Safari sur le téléphone : vider les données de navigation ou supprimer l'icône l'efface aussi. |

## Publier soi-même une autre copie

Le dossier `docs/` est la version installable complète (page du jeu, manifeste,
service worker, icônes). Il se régénère avec :

```bash
python3 Tools/build-pwa.py
```

Deux façons de le mettre en ligne :

* **Vercel** — celle en service : le sas décrit dans
  [Tools/vercel-shell/README.md](Tools/vercel-shell/README.md) sert le jeu depuis
  le cache du téléphone et va chercher tout seul la dernière version publiée dans
  `docs/`. Une poussée sur la branche suffit donc à mettre à jour l'app installée.
* **GitHub Pages** — *Settings → Pages → Deploy from a branch → dossier `/docs`*.
  Le workflow `.github/workflows/pages.yml` s'en charge dès que les permissions
  d'Actions sont en écriture.
