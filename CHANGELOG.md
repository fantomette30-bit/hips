# Journal des versions

Le numéro de la version installée est visible dans **Réglages → Version**.
Les mises à jour s'installent toutes seules : ouvrez le jeu avec du réseau,
la nouvelle version est active au lancement suivant.

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
