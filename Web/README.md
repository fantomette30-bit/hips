# Version web — jouable sans Mac

`index.html` est le même jeu que l'app iOS, en un seul fichier autonome :
même moteur (techniques de résolution, notation de difficulté, garanties
d'unicité), même trois niveaux, mêmes réglages.

**À quoi ça sert :** installer l'app iOS demande un Mac et Xcode. Cette page,
elle, s'ouvre dans Safari sur l'iPhone et s'ajoute à l'écran d'accueil en deux
gestes (Partager → « Sur l'écran d'accueil »). Elle s'affiche alors en plein
écran, avec sa propre icône, et fonctionne sans réseau.

**Ce qui est stocké** : la partie en cours, les statistiques et les réglages,
dans le `localStorage` du navigateur — rien ne sort du téléphone.

**Polices** : Fraunces et Manrope sont chargées depuis Google Fonts quand une
connexion est disponible ; hors ligne, le jeu bascule proprement sur les polices
système (Georgia / SF). Aucune autre ressource externe.

## Tests

```bash
node Tools/EngineCheck/webengine.test.js   # moteur : unicité, difficulté, indices
node Tools/EngineCheck/webui.test.js       # interface réelle (Chromium, iPhone 13, hors ligne)
```

Le test d'interface nécessite `npm i playwright` ; il pilote une vraie partie :
sélection, saisie, erreur signalée, annulation, notes, pause, indices jusqu'à la
victoire, statistiques, reprise après rechargement, thème sombre.
