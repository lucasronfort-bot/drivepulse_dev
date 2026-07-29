# Audio DrivePulse V9.8

Ce dossier contient les manifests et stems synchronisés des 14 morceaux de test.

Chaque manifeste définit les comportements de VOICE, SPARK, KEYS, PULSE et BOUNCE ainsi qu’une section `turn_layer` pour SWIRL. Les fichiers jouent en continu ; le moteur adapte les gains et les effets sans déplacer la position de lecture.

SWIRL fonctionne sans fichier audio supplémentaire grâce au bus Web Audio partagé. Un stem spécial peut toutefois être ajouté avec la clé `swirl`, `turn_stem` ou `turn_layer.stem_file`.

THRUST fonctionne également sans fichier supplémentaire. Il réutilise brièvement les couches BOUNCE et mélodiques du morceau lors du départ d’une accélération.
