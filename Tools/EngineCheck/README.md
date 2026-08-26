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
| `webengine.test.js` | génération des neuf niveaux : fourchette de score, unicité, résolution sans deviner, médianes croissantes |
| `webfallback.test.js` | filet de sécurité : la recherche se termine toujours, même si aucune grille notable ne sort |
| `webfuzz.test.js` | 3 000 gestes aléatoires sur trois niveaux : aucune exception, invariants tenus, grille toujours finissable |
| `webprivacy.test.js` | aucune requête réseau, même page ouverte en ligne ; sauvegarde nettoyée après la victoire |
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
| `webshell.test.js` | sas Vercel : première ouverture, jeu servi hors ligne, mise à jour automatique |
| `webunlimited.test.js` | grilles en nombre illimité, jamais deux fois la même |
