# Parlance — anglais juridique et RH

Application d'apprentissage de l'anglais professionnel (droit du travail et
ressources humaines) pour iPhone, iPad et Mac. Elle s'installe depuis Safari et
fonctionne ensuite **sans réseau**. Interface en anglais, aide en français d'un
geste, palette bleu poudré, modes clair et sombre.

## Où en est-on

**Version 0.3** : dix-huit thèmes, 1 800 expressions, correction en ligne.

| Thèmes | Contenu par thème |
|---|---|
| Contrat de travail · Relations collectives · Restructurations et plan social · Transformations et M&A · Stratégie RH et conseil aux managers · Discipline et licenciement · Ruptures négociées · Contentieux · Recrutement · Rémunération · Temps de travail · Santé et sécurité · Discrimination et harcèlement · Protection des données · Administration, paie et conformité · Mobilité internationale · QVCT, engagement et RSE · Formation et carrières | 100 expressions en trois niveaux (registres soutenu, courant, familier ; UK / US ; phonétique ; pièges), 4 documents à lire, 6 sujets d'écrit avec corrigés commentés, 4 dialogues, 4 jeux de rôle, 3 familles de formules propres au thème |

Communs à tous les thèmes : mots de liaison, formules d'atténuation, marqueurs
de l'oral, rythme de la phrase, grammaire, prononciation, chiffres et dates,
test de positionnement, répétition espacée, carnet personnel, tableau de bord.

Droit de référence : le droit français expliqué en anglais, avec les
équivalents britanniques et américains. Sociétés et personnes des mises en
situation : fictives. Une cinquantaine d'expressions figurent dans deux thèmes
voisins, avec des exemples différents : c'est volontaire.

## Correction en ligne

Relais `Tools/vercel-parlance/api/correct.js`, déployé avec l'application :

- la clé API reste sur le serveur ; l'application envoie seulement un code d'accès ;
- **plafond bloquant de 20 $ par mois** (`MONTHLY_CAP_USD`) : avant chaque appel,
  le coût maximal possible est réservé sur le compteur du mois, et l'appel n'a pas
  lieu s'il ne tient pas dans le budget restant ;
- qualité « Best » (Claude Opus 5.5, effort bas) ou « Economy » (Claude Haiku 5.5) ;
- rien ne part sans confirmation ; anonymisation proposée avant chaque envoi ;
- conversation désactivée par défaut.

Variables Vercel du projet `parlance-english` : `ANTHROPIC_API_KEY` (à créer
dans la Claude Console), `ACCESS_CODE`, `MONTHLY_CAP_USD`, et
`BLOB_STORE_ID` (créée en connectant le magasin Blob privé `parlance-budget` au projet ; l'accès se fait par OIDC, ou par `BLOB_READ_WRITE_TOKEN` sur les anciens magasins).
Sans l'une d'elles, le relais refuse de fonctionner et l'application reste sur
les corrigés modèles.

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
node Tools/EnglishCheck/parlance.test.js    # tous les écrans, séances, mode hors ligne
node Tools/EnglishCheck/online.test.js      # relais et plafond, avec une API simulée
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
