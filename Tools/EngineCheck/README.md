# Contrôle du moteur

`engine.py` est une **translittération fidèle** du moteur Swift de l'app
(`ZenSudoku/Core/*.swift` et `ZenSudoku/Game/GameState.swift`) : mêmes
techniques de résolution, mêmes constantes de difficulté, mêmes règles de
saisie, de notes et d'annulation.

`tests.py` fait tourner dessus la batterie de vérifications utilisée pour
valider l'app sans Xcode :

```bash
python3 Tools/EngineCheck/tests.py
```

Ce que la batterie vérifie, sur 45 grilles générées (15 par niveau) :

1. Solution complète et valide, indices compatibles avec elle, **solution unique**,
   grille résoluble sans deviner, plancher d'indices respecté.
2. Les trois niveaux sont bien ordonnés (scores médians croissants).
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
