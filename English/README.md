# Parlance — anglais juridique et RH

Application d'apprentissage de l'anglais professionnel (droit du travail et
ressources humaines) pour iPhone, iPad et Mac. Elle s'installe depuis Safari et
fonctionne ensuite **sans réseau**. Interface en anglais, aide en français d'un
geste, palette bleu poudré, modes clair et sombre.

## Où en est-on

**Étape 1 (livrée)** : structure complète de l'application et premier thème
entièrement rédigé, à valider avant d'écrire les onze autres.

| Rubrique | Contenu de l'étape 1 |
|---|---|
| Thème « The employment contract » | 100 expressions en trois niveaux : registres soutenu, courant et familier, variantes britannique et américaine, phonétique, pièges, notions françaises à expliquer |
| Mots de liaison | 13 fonctions, 127 connecteurs classés par registre, 78 exercices |
| Tact, marqueurs de l'oral, rythme | 35 formules d'atténuation, 16 marqueurs, 8 réécritures |
| Grammaire | 6 leçons (3 juridiques, 3 de niveau intermédiaire), 60 exercices de production |
| Prononciation, chiffres et dates | 5 leçons avec enregistrement, 14 fiches UK / US |
| Lecture | 4 documents avec glossaire, décodage du jargon et questions |
| Écrit | 6 sujets en trois temps, corrigés modèles commentés |
| Oral | 4 dialogues, 4 jeux de rôle chronométrés, 8 familles de formules de réunion |
| Suivi | test de positionnement (32 questions), répétition espacée, carnet personnel, tableau de bord, export et import de la progression |

**Étape 2** : les onze autres thèmes, sur le même modèle.
**Étape 3** : correction en ligne par Claude (crédit API de l'abonnement Max).

Droit de référence retenu par défaut : le droit français expliqué en anglais,
avec les équivalents britanniques et américains.

## Organisation

| Chemin | Rôle |
|---|---|
| `English/src/` | sources : gabarit, styles, scripts |
| `English/src/content/` | contenus pédagogiques (JSON), décrits dans `SCHEMA.md` |
| `English/app/` | application assemblée, prête à mettre en ligne. **Générée**, ne pas modifier à la main |
| `Tools/build-english.py` | contrôle les contenus puis assemble `English/app/` |
| `Tools/EnglishCheck/parlance.test.js` | essais de bout en bout, y compris hors connexion |
| `Tools/vercel-parlance/` | projet Vercel `parlance-english` : à chaque déploiement, il récupère `English/app/` depuis la branche |

```bash
python3 Tools/build-english.py              # contrôle + assemblage
node Tools/EnglishCheck/parlance.test.js    # 162 écrans, séances, mode hors ligne
```

## Installation

Adresse : **https://parlance-english-fantomette30-8687s-projects.vercel.app**

- **iPhone et iPad** : ouvrir l'adresse dans Safari, bouton Partager, puis
  « Sur l'écran d'accueil ».
- **Mac** : ouvrir l'adresse dans Safari, menu Fichier, puis « Ajouter au Dock ».

Après la première ouverture, tout est copié sur l'appareil. La progression est
propre à chaque appareil : Settings > Export, puis Import sur l'autre.

Pour des voix plus naturelles : Réglages > Accessibilité > Contenu énoncé >
Voix > Anglais, télécharger une voix « améliorée » ou « premium » (britannique
et américaine).

## Limites connues

- Les transcriptions phonétiques n'ont pas été vérifiées une à une dans un
  dictionnaire de prononciation.
- Les contenus juridiques sont généraux ; ils n'ont pas été relus par un
  juriste anglophone.
- L'enregistrement de la voix dépend de l'autorisation du micro par Safari.
