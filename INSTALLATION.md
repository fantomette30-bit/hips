# Installer Sudoku Zen sur votre iPhone

Aucun Mac, aucun compte, aucune application à télécharger sur l'App Store : le
jeu s'ajoute à l'écran d'accueil depuis Safari et fonctionne ensuite sans réseau.

## Installation (deux minutes)

1. Ouvrez l'adresse du jeu dans **Safari** sur l'iPhone (Chrome ne sait pas
   installer une app web sur iOS) :
   **https://sudoku-zen-app.vercel.app**
   L'adresse est publique : aucun compte n'est demandé.
2. Appuyez sur le bouton **Partager** (le carré avec la flèche, en bas de
   l'écran).
3. Faites défiler et choisissez **« Sur l'écran d'accueil »**, puis **Ajouter**.
4. Fermez Safari et lancez le jeu depuis sa nouvelle icône.

À la première ouverture, le jeu se copie entièrement sur le téléphone. Ensuite
il démarre **sans aucun réseau** — en avion, dans le métro, à l'étranger — et
même après un redémarrage de l'iPhone. Rien n'expire.

## Les mises à jour

Elles se téléchargent toutes seules : ouvrez le jeu avec du réseau, et quelques
secondes plus tard l'accueil affiche **« Version … prête »**. Touchez la carte :
la nouvelle version s'installe aussitôt, la partie en cours est conservée. Si
vous ne touchez à rien, elle s'appliquera au lancement suivant. Le numéro
installé s'affiche dans **Réglages → Version** ; ce qui a changé est listé dans
[CHANGELOG.md](CHANGELOG.md).

## Écran allumé pendant la partie

Depuis la version 1.10, l'iPhone ne se met plus en veille pendant que vous
réfléchissez sur une grille (iOS 18.4 ou plus récent, jeu lancé depuis son
icône). L'écran redevient normal en pause, à la victoire, sur l'accueil et
après cinq minutes sans toucher l'écran. Pour s'en passer : **Réglages →
Garder l'écran allumé**.

## Si ça coince

| Symptôme | Remède |
|---|---|
| Pas de « Sur l'écran d'accueil » dans le menu Partager | Vous n'êtes pas dans Safari, ou la page est ouverte dans un onglet privé. Rouvrez l'adresse dans un onglet Safari normal. |
| L'icône ouvre une page blanche | Relancez avec du réseau une fois : le jeu se recopie et repart. |
| Le jeu ne se met pas à jour | Ouvrez-le avec du réseau et attendez une dizaine de secondes sur l'accueil : la carte « Version … prête » apparaît, touchez-la. Si elle ne vient pas, fermez complètement le jeu (glissez-le hors du sélecteur d'apps) et rouvrez-le avec du réseau. |
| L'écran se met quand même en veille | Vérifiez **Réglages → Garder l'écran allumé** et la version d'iOS (18.4 ou plus récente). Le mode Économie d'énergie peut aussi l'en empêcher. |
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
  le cache du téléphone et va chercher tout seul la dernière version publiée sur
  le site lui-même, sans passer par GitHub. Publier une version, c'est l'envoyer
  à Vercel (marche à suivre dans ce README) : les apps déjà installées la
  récupèrent à leur prochaine ouverture avec du réseau.
* **GitHub Pages** (copie de secours, sans lien avec le site Vercel) —
  *Settings → Pages → Source : GitHub Actions* : le workflow
  `.github/workflows/pages.yml` publie alors `docs/` à chaque envoi sur la
  branche publiée. Tant que Pages n'est pas activé, il s'arrête avec une simple
  note au lieu d'échouer.
