# Parlance — anglais juridique et RH

Application d'apprentissage de l'anglais professionnel (droit du travail et
ressources humaines) pour iPhone, iPad et Mac. Elle s'installe depuis Safari et
fonctionne ensuite **sans réseau**. Interface en anglais, aide en français d'un
geste, palette bleu poudré, modes clair et sombre.

## Où en est-on

**Étapes 1 et 2 (livrées)** : quatorze thèmes, 1 400 expressions.

| Thèmes | Contenu par thème |
|---|---|
| Contrat de travail · Relations collectives · Restructurations et plan social · Transformations et M&A · Discipline et licenciement · Ruptures négociées · Contentieux · Recrutement · Rémunération · Temps de travail · Santé et sécurité · Discrimination et harcèlement · Protection des données · Formation et carrières | 100 expressions en trois niveaux (registres soutenu, courant, familier ; UK / US ; phonétique ; pièges), 4 documents à lire, 6 sujets d'écrit avec corrigés commentés, 4 dialogues, 4 jeux de rôle, 3 familles de formules propres au thème |

Communs à tous les thèmes : mots de liaison (13 fonctions, 127 connecteurs),
formules d'atténuation, marqueurs de l'oral, rythme de la phrase, 6 leçons de
grammaire, 5 leçons de prononciation, chiffres et dates, test de
positionnement, répétition espacée, carnet personnel, tableau de bord.

Les thèmes relations collectives, restructurations et transformations sont
rédigés pour une pratique de direction des relations sociales (présidence du
CSE, PSE, reclassement, opérations sur le capital, reporting à un siège
étranger). Sociétés et personnes des mises en situation : fictives.

Une cinquantaine d'expressions figurent dans deux thèmes voisins, avec des
exemples différents : c'est volontaire.

**Étape 3** : correction en ligne par Claude, avec un plafond bloquant de 20 $
par mois sur le crédit API de l'abonnement Max.

Droit de référence : le droit français expliqué en anglais, avec les
équivalents britanniques et américains.

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
