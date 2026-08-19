# Version web — jouable sans Mac

`index.html` est le même jeu que l'app iOS, en un seul fichier autonome :
même moteur (techniques de résolution, notation de difficulté, garanties
d'unicité), mêmes six niveaux, mêmes réglages.

**À quoi ça sert :** installer l'app iOS demande un Mac et Xcode. Cette page,
elle, s'ouvre dans Safari sur l'iPhone et s'ajoute à l'écran d'accueil en deux
gestes (Partager → « Sur l'écran d'accueil »). Elle s'affiche alors en plein
écran, avec sa propre icône, et fonctionne sans réseau.

**Ce qui est stocké** : la partie en cours, les statistiques et les réglages,
dans le `localStorage` du navigateur — rien ne sort du téléphone.

**Polices** : Fraunces et Manrope sont chargées depuis Google Fonts quand une
connexion est disponible ; hors ligne, le jeu bascule proprement sur les polices
système (Georgia / SF). Aucune autre ressource externe.

## Version hors ligne garantie (`docs/`)

`Web/index.html` fonctionne déjà sans réseau une fois la page chargée, mais rien
ne garantit que Safari la conservera en cache. Le dossier `docs/` ajoute ce qui
manque pour une garantie réelle :

* `manifest.webmanifest` — nom, icône et affichage plein écran de l'app installée ;
* `sw.js` — un *service worker* qui met la page, le manifeste et les icônes en
  cache à la première ouverture, puis sert toujours depuis ce cache ;
* `icon-180.png`, `icon-1024.png` — l'icône de l'écran d'accueil.

Une fois `docs/` publié (GitHub Pages : *Settings → Pages → Deploy from a
branch → dossier `/docs`*), ouvrez l'adresse une fois sur l'iPhone, ajoutez-la à
l'écran d'accueil : le jeu se lance ensuite sans aucun réseau, même après un
redémarrage du téléphone.

`docs/` est généré, ne l'éditez pas à la main :

```bash
python3 Tools/build-pwa.py
```

## Tests

```bash
node Tools/EngineCheck/webengine.test.js    # moteur : six niveaux, unicité, indices
node Tools/EngineCheck/webui.test.js        # interface réelle (Chromium, iPhone 13)
node Tools/EngineCheck/weboffline.test.js   # PWA : serveur arrêté, réseau coupé
```

Les tests navigateur nécessitent `npm i playwright`. Le test d'interface pilote
une vraie partie : sélection, saisie, erreur signalée, annulation, notes, pause,
indices jusqu'à la victoire, statistiques, reprise après rechargement, thème
sombre, génération d'une grille extrême. Le test hors ligne va plus loin : il
sert `docs/`, laisse le service worker s'installer, **tue le serveur**, coupe le
réseau, puis rouvre le jeu et termine une partie de niveau Master.
