# DrivePulse V9.1 — Simulateur ordinateur

Cette version conserve la lecture continue des cinq stems de Dubidubidu et ajoute un banc d’essai manuel pour ordinateur.

## Commandes

- Vitesse : 0 à 180 km/h.
- Accélération : 0 à 100 %.
- Freinage : 0 à 100 %.
- Virage : gauche à droite, avec intensité signée.
- Option « Lier les pédales à la vitesse » : l’accélérateur augmente réellement la vitesse simulée et le frein la réduit.

## Clavier

- W ou flèche haute : accélérer.
- S, flèche basse ou espace : freiner.
- A ou flèche gauche : tourner à gauche.
- D ou flèche droite : tourner à droite.
- R : relâcher l’accélération, le freinage et le virage.

Le curseur de vitesse peut toujours être déplacé directement. Les préréglages permettent de rejoindre rapidement 0, 30, 50, 80 ou 130 km/h.

## CSV

L’export ajoute `input_mode`, `turn_signed` et `pedals_linked` afin de distinguer les essais ordinateur des trajets réels.
