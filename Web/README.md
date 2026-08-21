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

## Grilles illimitées

Rien n'est stocké ni téléchargé : chaque partie fabrique une grille neuve sur
l'appareil, autant de fois que vous le voulez, sur les six niveaux. La
recherche continue jusqu'à obtenir une grille du niveau demandé — elle n'est
plus interrompue par un budget de temps. Pour que l'écran reste vivant, les
essais sont découpés en tranches de 90 ms, le compteur d'essais s'affiche et
un bouton *Annuler* apparaît au bout d'une seconde et demie.

Mesures (145 grilles enchaînées, aucune répétition) : 1 essai et 1 ms par
grille facile, 3 essais et 24 ms en difficile, 37 essais et 725 ms en extrême.

## Score

Chaque bonne case rapporte `10 × rang du niveau` (Facile 10 … Extrême 60),
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

Les notes s'affichent toujours **en ordre croissant, de gauche à droite puis
ligne suivante, sans position réservée ni trou** : une note seule est centrée,
deux notes sont côte à côte, neuf notes remplissent la case. L'ordre de saisie
ne change rien à l'affichage.

Un chiffre faux reste en rouge, mais il est aussi signalé **par la forme et le
mouvement** : la case est secouée au moment de la saisie et le chiffre garde un
soulignement ondulé tant qu'il n'est pas corrigé — repérable même avec des
lunettes filtrant la lumière bleue ou une perception altérée des couleurs.

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
node Tools/EngineCheck/webengine.test.js    # moteur : six niveaux, unicité, indices
node Tools/EngineCheck/webui.test.js        # interface réelle (Chromium, iPhone 13)
node Tools/EngineCheck/webunlimited.test.js # 145 grilles enchaînées, aucune répétition
node Tools/EngineCheck/webrobustness.test.js # cas limites : sauvegarde corrompue, annulation…
node Tools/EngineCheck/webscore.test.js     # score : gains, malus, bonus, report
node Tools/EngineCheck/webnotes.test.js     # notes triées, secousse et soulignement d'erreur
node Tools/EngineCheck/webmigration.test.js # reprise d'anciennes sauvegardes, transitions de rendu
node Tools/EngineCheck/webregress.test.js   # non-régression de la revue adversariale
node Tools/EngineCheck/webtheme.test.js     # mode Auto : suit le téléphone, en direct
node Tools/EngineCheck/weboffline.test.js   # PWA : serveur arrêté, réseau coupé
```

Les tests navigateur nécessitent `npm i playwright`. Le test d'interface pilote
une vraie partie : sélection, saisie, erreur signalée, annulation, notes, pause,
indices jusqu'à la victoire, statistiques, reprise après rechargement, thème
sombre, génération d'une grille extrême. Le test hors ligne va plus loin : il
sert `docs/`, laisse le service worker s'installer, **tue le serveur**, coupe le
réseau, puis rouvre le jeu et termine une partie de niveau Master.

Le test de robustesse couvre les cas tordus : sauvegarde ou statistiques
corrompues, annulation d'une génération, double appui sur deux niveaux,
40 saisies puis annulation complète, cases fixes, notes sur case remplie,
pause, victoire rejouée, reprise après rechargement, recommencer, tous les
réglages désactivés, stockage indisponible, historique saturé au-delà de
400 coups, clavier, changement de thème en pleine partie.
