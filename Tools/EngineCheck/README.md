# Contrôle du moteur et de l'app

Deux batteries se complètent : l'une valide le **moteur iOS** sans Xcode,
l'autre valide le **jeu web** tel qu'il tourne réellement dans Safari.

## 1. Moteur iOS (Python)

`engine.py` est une **translittération fidèle** du moteur Swift de l'app
(`ZenSudoku/Core/*.swift` et `ZenSudoku/Game/GameState.swift`) : mêmes
techniques de résolution, mêmes constantes de difficulté, mêmes règles de
saisie, de notes et d'annulation.

```bash
python3 Tools/EngineCheck/tests.py        # long : jusqu'à 5 min pour Légende
```

Ce que la batterie vérifie, sur 35 grilles générées (des neuf niveaux) :

1. Solution complète et valide, indices compatibles avec elle, **solution unique**,
   grille résoluble sans deviner, plancher d'indices respecté.
2. Les neuf niveaux sont bien ordonnés (scores médians croissants).
3. Le système d'indices termine la grille et **ne place jamais une valeur fausse**.
4. Un indice demandé alors qu'une case est fausse signale l'erreur sans la corriger d'office.
5. Après une série aléatoire de coups, notes et remplissage automatique des notes,
   annuler tout ramène **exactement** à la grille de départ.
6. Poser un chiffre efface la note correspondante chez les voisines, et l'annulation la restaure.
7. La victoire est détectée et la grille devient non modifiable.
8. Le compteur de chiffres restants est correct.
9. La sauvegarde survit à un aller-retour JSON, masques de notes dans les bornes `UInt16`.
10. Cas limites : grille pleine, grille vide, cases fixes protégées.

Ces fichiers ne font pas partie de la cible iOS (ils sont hors du dossier
`ZenSudoku/`) : ils ne sont ni compilés ni embarqués dans l'app.

## 2. Jeu web (Node + Playwright)

Chaque fichier `web*.test.js` s'exécute seul et sort en code 0 s'il n'a rien
trouvé. Ils lisent `Web/index.html` (ou `docs/`) directement : aucun montage
préalable n'est nécessaire.

```bash
NODE_PATH=<dossier node_modules> node Tools/EngineCheck/webengine.test.js
```

| Fichier | Ce qu'il couvre |
| --- | --- |
| `webengine.test.js` | génération des neuf niveaux : fourchette de score, unicité, résolution sans deviner, médianes croissantes |
| `webfallback.test.js` | filet de sécurité : la recherche se termine toujours, même si aucune grille notable ne sort |
| `webui.test.js` | parcours complet sur iPhone : accueil, partie, notes, indices, victoire |
| `webultimate.test.js` | Démoniaque, Titan, Légende : annulation, fourchette, partie entière, statistiques, version |
| `webregress.test.js` | revue de non-régression des corrections passées |
| `webscore.test.js` | points, combos, bonus de fin, meilleur score |
| `webnotes.test.js` | notes à position fixe et signalement des chiffres faux |
| `webtheme.test.js` | thème Auto qui suit le téléphone, y compris sous un hôte imposant son thème |
| `webmigration.test.js` | anciennes sauvegardes et transitions de version |
| `webrobustness.test.js` | sauvegardes corrompues, annulations, double appui, stockage indisponible, clavier |
| `weboffline.test.js` | service worker : serveur arrêté, réseau coupé, partie jouable |
| `webshell.test.js` | sas Vercel : première ouverture, jeu servi hors ligne, mise à jour automatique |
| `webunlimited.test.js` | grilles en nombre illimité, jamais deux fois la même |
