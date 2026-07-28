DrivePulse V9.7 — correctif GitHub sans fichiers audio

À remplacer à la racine :
- app.js
- index.html
- style.css
- sw.js
- manifest.webmanifest

À remplacer dans audio :
- audio/library.json
- les 14 fichiers audio/<morceau>/manifest.json

Les fichiers MP3 et FLAC ne changent pas.
Après déploiement, fermer complètement la PWA puis la rouvrir afin de vider l’ancien service worker.
