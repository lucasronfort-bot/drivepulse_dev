# Guide de test capteurs — DrivePulse V9.7

## Calibration

1. Fixer fermement l’iPhone dans la voiture.
2. Lancer DrivePulse et désactiver le simulateur PC.
3. Effectuer la calibration 3D : immobile, puis accélération douce en ligne droite.
4. Ne plus déplacer le téléphone pendant le trajet.

## Test accélération

Effectuer plusieurs accélérations progressives puis franches. La jauge Accélération et le renfort de BOUNCE doivent commencer à réagir presque immédiatement, avant la mise à jour GPS.

## Test SWIRL

Comparer une ligne droite bosselée, de petites corrections de volant et de vrais virages. SWIRL doit rester sec sur les bosses et s’ouvrir surtout lorsque le gyroscope ou le cap GPS confirme une rotation.

## Journal CSV V9.7

Les colonnes `imu_accel_fast`, `gps_accel_slow`, `accel_target` et `accel_signal` permettent de mesurer la chaîne d’accélération. Les colonnes `turn_imu_evidence`, `turn_gyro_evidence`, `turn_gps_evidence` et `turn_confidence` permettent d’identifier la source d’un déclenchement SWIRL.
