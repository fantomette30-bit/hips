# Batterie de tests

Le jeu tient dans `Web/index.html` ; ces suites le vérifient telles qu'il tourne
réellement, dans un vrai navigateur piloté (Chromium, profil iPhone 13) ou en
chargeant son moteur seul.

Chaque fichier `web*.test.js` s'exécute seul et sort en code 0 s'il n'a rien
trouvé. Ils lisent `Web/index.html` (ou `docs/`) directement : aucun montage
préalable n'est nécessaire.

```bash
cd Tools/EngineCheck && npm i && npm test    # toute la batterie, dans l'ordre
node webengine.test.js                       # ou une suite seule
```

`npm test` parcourt tous les fichiers `web*.test.js` du dossier : une suite
ajoutée est prise en compte sans rien déclarer.

| Fichier | Ce qu'il couvre |
| --- | --- |
| `webengine.test.js` | génération des neuf niveaux : fourchette de score, unicité, résolution sans deviner, médianes croissantes (douze grilles par niveau) |
| `webfallback.test.js` | filet de sécurité : la recherche se termine toujours, même si aucune grille notable ne sort |
| `webfuzz.test.js` | 3 000 gestes aléatoires sur trois niveaux : aucune exception, invariants tenus, grille toujours finissable |
| `webprivacy.test.js` | aucune requête réseau, même page ouverte en ligne (le Worker, créé en mémoire via `blob:`, n'en est pas une) ; sauvegarde nettoyée après la victoire |
| `webreset.test.js` | remise à zéro des statistiques : confirmation en deux temps, rien d'effacé par accident |
| `webladder.test.js` | échelle de difficulté : palier exigé et nombre de murs croissants, profil mesuré niveau par niveau |
| `webgrid.test.js` | hauteur des neuf lignes de la grille, y compris une ligne vide ou seulement annotée |
| `weblandscape.test.js` | téléphone couché : accueil, feuille de statistiques et écran de victoire utilisables |
| `webpartie.test.js` | une partie de bout en bout comme au doigt : saisie, notes au verrou, erreur, gomme, annulation, indice, reprise, victoire |
| `webui.test.js` | parcours complet sur iPhone : accueil, partie, notes, indices, victoire |
| `webultimate.test.js` | Démoniaque, Titan, Légende : annulation, fourchette, partie entière, statistiques, version |
| `webregress.test.js` | revue de non-régression des corrections passées, tailles de la barre et du pavé, disposition en paysage |
| `webscore.test.js` | points, combos, bonus de fin, meilleur score |
| `webnotelock.test.js` | verrou de note : chiffre gardé en main, pose d'un appui, bascule, relâche, cases fixes épargnées |
| `webnotelock2.test.js` | le verrou face aux autres commandes : pause, gomme, indice, remplissage des notes, recommencer, reprise, victoire |
| `webnotes.test.js` | notes à position fixe et signalement des chiffres faux |
| `webtheme.test.js` | thème Auto qui suit le téléphone, y compris sous un hôte imposant son thème |
| `webmigration.test.js` | anciennes sauvegardes et transitions de version |
| `webrobustness.test.js` | sauvegardes corrompues, annulations, double appui, stockage indisponible, clavier |
| `weboffline.test.js` | service worker : serveur arrêté, réseau coupé, partie jouable |
| `webshell.test.js` | sas Vercel reconstruit par la construction même de Vercel : découpage de l'envoi (morceaux déjà en ligne repris, fichier modifié recoupé), première ouverture, jeu servi hors ligne, aucune requête vers un autre site |
| `webunlimited.test.js` | grilles en nombre illimité, jamais deux fois la même |
| `webstock.test.js` | réserve de grilles : préparée pendant la partie, servie sans attente et une seule fois, six réserves défectueuses écartées, Titan instantané, relais de l'écran d'attente, relance depuis la victoire, navigateur sans Worker |
| `webwakelock.test.js` | écran allumé : verrou pris en partie, rendu en pause, à l'accueil, en arrière-plan, après cinq minutes sans geste et à la victoire ; réglage, refus du navigateur, navigateur sans API, API réelle de Chromium |
| `webupdate.test.js` | mise à jour en un geste à travers le vrai sas : version plus récente publiée sur le site, proposée puis installée sans perdre la partie ; rien de proposé pour une version égale ou plus ancienne |
| `webmigrationsas.test.js` | bascule d'un iPhone déjà installé de l'ancien sas (mises à jour lues sur GitHub) vers le sas autonome : site protégé sans effet, nouveau service worker installé à l'ouverture, mises à jour venues du site seul, protection remise sans dommage, partie hors ligne |
| `webconfort.test.js` | notes du chiffre suivi, couleur de la barre du navigateur sous thème imposé, stockage protégé dans l'app installée seulement, écran de victoire complet du SE au Pro Max |
