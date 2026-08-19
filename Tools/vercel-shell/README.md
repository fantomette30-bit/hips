# Sas de publication (Vercel)

Le connecteur Vercel de cette session ne peut créer que de **nouveaux** projets :
impossible de redéployer un projet existant, donc impossible de pousser une mise
à jour sur une adresse déjà installée sur l'iPhone.

D'où ce sas. La page mise en ligne ne contient pas le jeu : elle installe un
service worker qui

1. garde le jeu complet dans le cache de l'appareil et le sert à chaque
   ouverture, **y compris sans réseau** ;
2. va chercher, quand une connexion est là, la dernière version publiée dans
   `docs/index.html` sur GitHub, et remplace la copie en cache.

Résultat : l'adresse et l'icône ne changent plus jamais, et une simple poussée
sur la branche suffit à mettre le jeu à jour sur le téléphone.

* `index.html` — le sas (écran de préparation, enregistrement du service worker)
* `sw.js` — cache hors ligne et mise à jour silencieuse
* le `build.js` du projet Vercel assemble ces deux fichiers avec le jeu et les
  icônes récupérés depuis le dépôt.

Vérification : `node Tools/EngineCheck/webshell.test.js` (sert le sas en local,
coupe le serveur et le réseau, puis termine une partie hors ligne).
