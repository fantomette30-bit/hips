# Sas de publication (Vercel)

Le jeu est publié sur Vercel, et uniquement là : projet `sudoku-zen-app`,
adresse **https://sudoku-zen-app.vercel.app** (également servie sous
`sudoku-zen-app-fantomette30-8687s-projects.vercel.app`). Ni le site ni les
apps installées ne dépendent de GitHub : le dépôt ne sert qu'à conserver les
sources.

La page mise en ligne est un sas : elle ne contient pas le jeu, elle installe
un service worker qui

1. garde le jeu complet dans le cache de l'appareil et le sert à chaque
   ouverture, **y compris sans réseau** ;
2. va chercher, quand une connexion est là, le `game.html` publié sur ce même
   site, et remplace la copie en cache s'il a changé.

Le service worker refuse les redirections et tout ce qui ne ressemble pas au
jeu : une page de connexion ou d'erreur ne peut jamais prendre sa place. Depuis
la version 1.10, le jeu relit lui-même ce cache (sans requête réseau) : dès
qu'une version plus récente y est rangée, l'accueil affiche « Version … prête »
et l'installe d'un appui.

## Fichiers

* `index.html` — le sas (écran de préparation, enregistrement du service worker)
* `sw.js` — cache hors ligne et mise à jour silencieuse, depuis le site lui-même
* `build.js`, `package.json` — la construction exécutée par Vercel : elle
  reconstitue le site dans `public/` à partir des seuls fichiers envoyés,
  compare chacun à son empreinte SHA-1 et interrompt la publication au moindre
  écart. Le journal se termine par « publication prete, version … ».
* `deploiement.js` — prépare l'envoi (voir ci-dessous)
* `en-ligne.json` — la liste des fichiers de la publication en place (chemin,
  empreinte SHA-1, taille)

`index.html`, `sw.js`, `build.js` et `package.json` sont en ligne à l'octet près
(mêmes empreintes que dans `en-ligne.json`).

## Publier une nouvelle version

1. `python3 Tools/build-pwa.py` régénère `docs/`.
2. `node Tools/vercel-shell/deploiement.js /tmp/sudoku-vercel` assemble l'envoi
   (le jeu compressé et découpé en morceaux), rejoue la construction de Vercel
   en local, puis affiche la liste complète des fichiers et nomme ceux que
   Vercel n'a pas encore. Un fichier inchangé reprend le découpage de la
   publication en place : l'icône, par exemple, n'est jamais renvoyée tant
   qu'elle ne change pas.
3. Envoyer chacun des fichiers nommés (API `POST https://api.vercel.com/v2/files`,
   en-tête `x-vercel-digest` = empreinte SHA-1). Vercel refuse un contenu qui
   ne correspond pas à son empreinte. Si un envoi est refusé ou coupé,
   redécouper plus fin, par exemple `… deploiement.js /tmp/sudoku-vercel 2000` :
   la construction accepte des morceaux de toute taille.
4. Créer le déploiement de production du projet avec la liste complète
   (API `POST https://api.vercel.com/v13/deployments`, `target: "production"`,
   fichiers référencés par `file`, `sha` et `size`). Le journal doit se
   terminer par « publication prete, version … ».
5. Copier `/tmp/sudoku-vercel/en-ligne.json` sur `Tools/vercel-shell/en-ligne.json`
   et l'enregistrer dans le dépôt.

Les apps installées récupèrent la nouvelle version à leur prochaine ouverture
avec du réseau. En cas de problème, remettre en production le déploiement
précédent (onglet *Deployments*, *Instant Rollback*) : les apps reprendront la
version qu'il contient. Seule exception : les déploiements antérieurs au
24 septembre 2026 portent l'ancien sas, qui lisait ses mises à jour sur GitHub.

## Accès

La production est publique : l'authentification Vercel ne protège plus que
les déploiements de prévisualisation (Deployment Protection du projet, valeur
`preview` de `ssoProtection` dans l'API). Une nouvelle installation ne demande
donc aucun compte. Si la protection devait un jour couvrir de nouveau la
production, les apps installées continueraient de jouer depuis leur cache :
elles cesseraient seulement de recevoir les mises à jour.

## Passage depuis l'ancien sas

Jusqu'au 24 septembre 2026, le service worker allait chercher les mises à jour
sur GitHub (`raw.githubusercontent.com`). Le nouveau `sw.js` est en ligne depuis
cette date : à sa première ouverture avec du réseau, chaque iPhone le détecte,
l'installe et bascule seul, sans rien réinstaller. La partie en cours, les
statistiques et les réglages sont conservés : ils sont rangés à part, hors du
cache du service worker.

## Vérification

* `node Tools/EngineCheck/webshell.test.js` — construit le site comme Vercel,
  contrôle le découpage de l'envoi, la première ouverture, le jeu servi hors
  ligne et l'absence de toute requête vers un autre site.
* `node Tools/EngineCheck/webupdate.test.js` — mise à jour en un geste à
  travers le vrai sas.
* `node Tools/EngineCheck/webmigrationsas.test.js` — bascule d'un iPhone déjà
  installé de l'ancien sas vers le nouveau : site encore protégé, puis ouvert,
  puis de nouveau protégé, et enfin hors ligne.
