# Guide de test capteurs — DrivePulse V9.8

## Calibration

1. Fixer fermement l’iPhone dans la voiture.
2. Lancer DrivePulse et désactiver le simulateur PC.
3. Effectuer la calibration 3D : immobile, puis accélération douce en ligne droite.
4. Ne plus déplacer le téléphone pendant le trajet.

## Test THRUST

Effectuer plusieurs départs d’accélération francs, puis des accélérations progressives. THRUST doit réagir au début de l’appui, avant que la vitesse GPS n’ait réellement augmenté.

Le personnage THRUST doit s’activer brièvement. BOUNCE doit ensuite rester renforcé pendant la durée de l’accélération.

## Test BOUNCE

À vitesse stable, BOUNCE doit rester présent sans être saturé. Une accélération doit disposer d’une marge clairement audible jusqu’au niveau maximal.

## Test freinage

Le freinage n’a pas été modifié en V9.8. Noter les moments où l’interface indique un freinage alors que la voiture ne ralentit pas afin de comparer avec le CSV.

## Journal CSV V9.8

- `thrust_jerk` : montée rapide normalisée de l’accélération ;
- `thrust_trigger` : intensité de l’impulsion déclenchée ;
- `thrust_level` : enveloppe sonore réellement appliquée ;
- `imu_accel_fast`, `gps_accel_slow`, `accel_target`, `accel_signal` : chaîne d’accélération ;
- `brake_signal` : freinage actuel à diagnostiquer.
