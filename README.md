# DrivePulse V9.7 — Fast Sensors

Version cumulative avec 14 morceaux en lecture continue.

## Changements V9.7

- PULSE progresse avec la vitesse sur tous les morceaux.
- BOUNCE progresse avec la vitesse et reçoit un renfort d’accélération.
- Accélération : IMU 60 Hz prioritaire pour une attaque immédiate, GPS utilisé comme confirmation lente.
- Compensation lente du biais longitudinal pour réduire les faux signaux dus aux pentes et à l’orientation.
- SWIRL plus sélectif : gyroscope ou cap GPS requis ; l’accélération latérale ne suffit plus seule.
- SWIRL : attaque 0,18 s, maintien 0,35 s, relâchement 1,55 s.
- CSV enrichi avec les composantes de fusion afin de mesurer précisément la latence.

Les fichiers audio protégés restent réservés aux essais privés et ne doivent pas être publiés publiquement.
