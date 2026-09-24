# Sas de publication (Vercel)

Le jeu est publié sur Vercel : projet `sudoku-zen-app`, adresses
`sudoku-zen-app.vercel.app` et
`sudoku-zen-app-fantomette30-8687s-projects.vercel.app`.

La page mise en ligne est un sas : elle ne contient pas le jeu, elle installe
un service worker qui

1. garde le jeu complet dans le cache de l'appareil et le sert à chaque
   ouverture, **y compris sans réseau** ;
2. va chercher, quand une connexion est là, la dernière version publiée dans
   `docs/index.html` (branche `claude/sudoku-premium-iphone-app-ji3x03`), et
   remplace la copie en cache.

Résultat : l'adresse et l'icône ne changent jamais, et les apps déjà installées
se mettent à jour d'elles-mêmes. Depuis la version 1.10, le jeu relit lui-même
ce cache (sans requête réseau) : dès que le service worker y a rangé une
version plus récente que celle qui tourne, l'accueil affiche « Version … prête »
et l'installe d'un appui.

## Fichiers

* `index.html` — le sas (écran de préparation, enregistrement du service worker)
* `sw.js` — cache hors ligne et mise à jour silencieuse
* `build.js`, `package.json` — copie exacte de la construction du projet
  Vercel : elle place le sas dans `public/` et y ajoute le jeu et les icônes
  pris dans `docs/` sur la branche publiée.

Le `sw.js` en ligne est une variante antérieure de celui-ci (installation sans
`cache: 'reload'`). Redéployer le projet Vercel tel quel le conserve octet pour
octet : les appareils déjà installés gardent leur service worker. Publier ce
`sw.js`-ci à la place déclencherait sa mise à jour sur tous les appareils — à
faire en connaissance de cause.

## Publier une nouvelle version

1. `python3 Tools/build-pwa.py`, puis pousser sur la branche
   `claude/sudoku-premium-iphone-app-ji3x03` : c'est là que les apps
   installées vont chercher la nouvelle version.
2. Redéployer le projet Vercel `sudoku-zen-app` (bouton *Redeploy* du dernier
   déploiement de production, ou API avec son identifiant de déploiement) : le
   site lui-même embarque alors la nouvelle version, pour les nouvelles
   installations. Le journal de construction affiche la taille de `game.html`,
   qui doit être celle de `docs/index.html`.

## Accès

Le projet est protégé par l'authentification Vercel sur ses adresses
`vercel.app` : une nouvelle installation demande d'être connecté au compte
Vercel du projet. Les apps installées n'en dépendent pas : elles jouent depuis
leur cache et se mettent à jour depuis le dépôt, en accès public.

## Vérification

`node Tools/EngineCheck/webshell.test.js` (sert le sas en local, coupe le
serveur et le réseau, puis termine une partie hors ligne) et
`node Tools/EngineCheck/webupdate.test.js` (mise à jour en un geste).
