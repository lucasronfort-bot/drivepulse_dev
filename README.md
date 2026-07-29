# DrivePulse V9.8 — THRUST

Version cumulative avec 14 morceaux en lecture continue.

## Changements V9.8

- **PULSE** progresse avec la vitesse sur tous les morceaux.
- **BOUNCE** conserve un socle lié à la vitesse, plafonné pour garder de la marge dynamique.
- L’accélération continue renforce BOUNCE.
- **THRUST** détecte le départ d’une accélération à partir du jerk et produit un impact court.
- THRUST ajoute brièvement du grave, de la brillance et une ouverture du filtre sans nouveau fichier audio.
- **SWIRL** reste réservé aux virages validés par le gyroscope ou le cap GPS.
- Le freinage reste inchangé pour le prochain essai comparatif.
- Le CSV ajoute `thrust_jerk`, `thrust_trigger` et `thrust_level`.

Les fichiers audio protégés restent réservés aux essais privés et ne doivent pas être publiés publiquement.
