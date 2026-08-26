# Journal des versions

Le numéro de la version installée est visible dans **Réglages → Version**.
Les mises à jour s'installent toutes seules : ouvrez le jeu avec du réseau,
la nouvelle version est active au lancement suivant.

## 1.9.1 — 23 août 2026
- Le verrou de note se relâche aussi quand on recommence la partie depuis le
  menu (il survivait au « Recommencer »).
- Contrôles : deux suites de tests comparaient encore les grilles à des seuils
  écrits en dur, désormais périmés depuis le remaniement des niveaux ; elles
  lisent maintenant les fourchettes directement dans le jeu, si bien qu'elles
  ne peuvent plus se désynchroniser.

## 1.9.0 — 23 août 2026
- **Verrou de note** : en mode Notes, appuyez une fois sur un chiffre — il
  reste « en main », mis en avant sur le pavé. Touchez ensuite les cases : la
  note s'y pose (ou s'en retire) sans repasser par le pavé. Un nouvel appui
  sur le même chiffre relâche le verrou, tout comme la sortie du mode Notes.
  Les cases qui portent déjà cette note sont discrètement cerclées.
- **Touches du pavé plus hautes** : 57 → 72 px, plus faciles à viser. La
  grille garde exactement la même taille.

## 1.8.1 — 23 août 2026
- Deux descriptions de niveaux (Extrême et Légende) débordaient sur deux
  lignes : leurs cartes étaient plus hautes que les autres sur l'accueil.
  Textes raccourcis, les neuf cartes ont de nouveau la même hauteur.
- L'attente est désormais **bornée** sur les deux niveaux les plus rares : au
  bout de quelques centaines d'essais, le jeu retient la meilleure grille
  rencontrée plutôt que de continuer à chercher. Titan et Légende sortent en
  1,3 s et 3 s en moyenne, sans dépasser une dizaine de secondes dans le pire
  des cas.

## 1.8.0 — 23 août 2026
- **La difficulté monte vraiment d'un niveau à l'autre.** Jusqu'ici seul le
  score était calibré : une grille Difficile pouvait exiger un XY-Wing, une
  Expert un Swordfish, tandis qu'une Master se contentait parfois de paires
  nues — d'où l'impression que les niveaux se ressemblaient. Désormais chaque
  niveau exige **exactement** sa famille de techniques : candidats évidents,
  candidats cachés, groupes verrouillés, X-Wing, XY-Wing, XYZ-Wing…
- Les quatre derniers niveaux se distinguent par le nombre de **« murs »** —
  les coups avancés sur lesquels on bute vraiment : deux pour Extrême, trois
  pour Démoniaque, quatre pour Titan, cinq ou plus pour Légende.
- Mesures sur les neuf niveaux : palier le plus dur 1, 2, 3, 4, 5, 6, 6, 6, 6
  (aucun recouvrement, contre des chevauchements systématiques auparavant) ;
  murs 0, 0, 0, 0, 1, 2, 3, 4, 5+ ; scores médians 48, 129, 290, 562, 799,
  1014, 1245, 1372, 1859.
- Les descriptions des niveaux sur l'accueil annoncent maintenant la technique
  réellement exigée.

## 1.7.5 — 23 août 2026
- **Ligne fine dans la grille** : une ligne entièrement vide (ni chiffre ni
  note) se tassait à moins de la moitié de la hauteur normale, et les autres
  s'élargissaient d'autant ; tout rentrait dans l'ordre dès qu'un chiffre y
  était posé. Les cases sont désormais carrées et les neuf lignes de hauteur
  imposée : elles restent identiques quel que soit leur contenu.
- Les chiffres et les notes se mesurent maintenant sur la largeur du plateau
  et non sur celle de l'écran : taille inchangée en usage normal, mais plus de
  chiffres trop grands pour leur case quand le plateau rétrécit (téléphone
  couché, petit écran).

## 1.7.4 — 23 août 2026
- **Téléphone couché** : la grille se réduisait à quelques pixels quand
  l'iPhone passait en mode paysage. Le plateau et les commandes se placent
  désormais côte à côte, grille entière et pavé numérique bien visibles ;
  l'écran de victoire, lui aussi trop haut, se compacte et défile pour que
  ses boutons restent atteignables.
- La zone tactile du chronomètre (bouton pause) est élargie à 45 px de haut
  sans changer son apparence.
- **Statistiques** : le bouton rouge « Réinitialiser les statistiques »
  effaçait tout au premier appui. Il demande maintenant confirmation, et
  revient de lui-même au repos si on n'y touche plus.
- Le texte d'installation de l'app annonçait encore « six niveaux ».
- Documentation : la page n'utilise que les polices du système, elle ne fait
  aucune requête réseau — la description qui parlait de polices distantes
  était fausse.

## 1.7.3 — 23 août 2026
- Lisibilité de la barre de jeu : erreurs, indices et points passent de 12,5 à
  14,5 px, le chronomètre à 16 px, et les petits chiffres du pavé numérique de
  12 à 13,5 px. Le gain de points affiché à chaque bonne case suit la même
  échelle.
- La grille, elle, garde exactement la même taille : mesuré sur iPhone 13,
  13 Mini, 12 Pro Max et sur un écran étroit de 320 px, sans défilement ni
  débordement. Les écrans très étroits reçoivent une taille légèrement réduite
  pour que la barre tienne toujours sur une ligne.

## 1.7.2 — 23 août 2026
- Les petits chiffres sous le pavé numérique — combien de fois chaque chiffre
  reste à placer — sont agrandis (9,5 → 12 px), plus lisibles le soir sans rien
  changer à la taille des touches ni à la mise en page.

## 1.7.1 — 22 août 2026
- Un record ne se gagne plus avec des indices : le meilleur temps enregistré
  correspond enfin à ce que l'écran de victoire appelle un record. La feuille
  de statistiques le précise.
- Recherche d'une grille des paliers ultimes : au bout de huit secondes,
  l'écran d'attente le dit clairement au lieu de laisser tourner une roue
  muette. La recherche reste annulable à tout moment.
- Filet de sécurité de la génération : dans le cas extrême où aucune grille
  ne conviendrait, la recherche se termine désormais toujours par une grille
  jouable au lieu de tourner indéfiniment.
- iOS : même règle de record, et même pondération que le web lors du choix
  d'une grille de repli.
- Vérifications : trois trous dans la batterie de tests comblés (niveaux
  ultimes ignorés par deux suites, sas testé sur une copie périmée) et une
  vérification de plus — 850 000 déductions du moteur contrôlées une à une
  contre la solution, aucune fausse.

## 1.7.0 — 21 août 2026
- Trois paliers au-dessus d'Extrême : **Démoniaque**, **Titan** et **Légende**,
  regroupés dans une section « Défis ultimes ». Pour les rendre possibles sans
  jamais devoir deviner, le solveur apprend trois techniques de plus :
  XYZ-Wing, W-Wing et Gratte-ciel — les indices savent donc les expliquer.
- Extrême est recentré (700–849) pour laisser la place aux nouveaux paliers ;
  la jauge de difficulté passe à neuf barres.
- Calibration mesurée : les scores médians des neuf niveaux s'étagent de 48 à
  plus de 1 600, sans recouvrement. Solution unique et résolution sans deviner
  garanties à tous les niveaux.

## 1.6.0 — 21 août 2026
- Les notes retrouvent leur position fixe, comme sur une grille papier :
  1 en haut à gauche, 2 en haut au milieu … 9 en bas à droite. Une note
  absente laisse sa place vide.
- Le numéro de version s'affiche dans les réglages et sera incrémenté à
  chaque mise à jour.

## 1.5.0 — 21 août 2026
- Le chiffre faux est entouré d'un cercle — comme une correction au stylo —
  à la place du soulignement ondulé. La secousse à la saisie est conservée.
- Le thème Auto suit vraiment le réglage clair/sombre du téléphone, en
  direct, même quand la page est ouverte dans une enveloppe qui impose son
  propre thème ou après une longue veille de l'app.

## 1.4.0 — 21 août 2026
- Onze correctifs issus d'une revue adversariale du code, dont : la pose
  d'un chiffre identique à l'unique note de la case laissait l'affichage en
  mode note ; recommencer une grille gagnée re-créditait stats et points ;
  l'indice sur une case fausse se comptait à chaque appui sans malus ; le
  multiplicateur de série se perdait à la reprise et plafonnait à x1,9 au
  lieu de x2 ; la vague de ligne complétée était tronquée.
- Le lien du manifeste, perdu par le script de publication, est rétabli.

## 1.3.0 — 20 août 2026
- Système de points : chaque bonne case rapporte 10 x le niveau, multiplié
  par la série en cours (jusqu'à x2) ; fermer une ligne, une colonne ou un
  bloc rapporte 50 x le niveau avec une vague lumineuse ; erreurs et indices
  coûtent des points ; bonus d'arrivée, de rapidité et de partie parfaite.
- Meilleur score et total de points par niveau dans les statistiques.
- Signal d'erreur indépendant de la couleur : secousse de la case à la
  saisie d'un chiffre faux.

## 1.2.0 — 19 août 2026
- Version installable garantie hors ligne : le jeu se met en cache sur
  l'appareil à la première ouverture et se lance ensuite sans aucun réseau.
- Mise à jour automatique : l'app va chercher la dernière version publiée
  quand une connexion est disponible.

## 1.1.0 — 19 août 2026
- Six niveaux au lieu de trois : Expert, Master et Extrême rejoignent
  Facile, Moyen et Difficile. Le solveur apprend le triplet caché, le
  XY-Wing et le Swordfish pour garantir des grilles corsées résolubles
  sans deviner.

## 1.0.0 — 19 août 2026
- Première version : trois niveaux calibrés, notes, annulation, indices
  expliqués, statistiques, thème clair/sombre, fonctionnement hors ligne.
