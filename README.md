# DrivePulse V9.5 — Bibliothèque séquentielle

Cette version conserve la lecture continue des stems et le banc d’essai manuel pour ordinateur.


## Lecture de la bibliothèque

- La rotation automatique minutée a été supprimée.
- À la fin d’un morceau, DrivePulse prépare et lance automatiquement le titre suivant de la bibliothèque.
- Le changement reste possible à tout moment par la liste, le bouton **Précédent** ou le bouton **Suivant**.
- La mémoire de conduite court/long terme reste utilisée en interne pour lisser l’énergie musicale et éviter des réactions trop brutales, mais son panneau de diagnostic a été retiré de l’interface.

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


## Butterfly — Private Drive Test

Nouveau morceau de test local en lecture continue :

- VOICE et SPARK toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à l’accélération et aux virages ;
- aucun personnage KEYS.

Durée : 2 min 50 s. Tempo détecté : 136 BPM.


## Blame It On Me — Private Drive Test

Nouveau morceau continu :

- VOICE et SPARK toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à l’accélération et aux virages ;
- aucun personnage KEYS.

Durée : 2 min 46 s. Tempo utilisé : 89,9 BPM.

Morceau ajouté au projet de travail : **On & On — Cartoon & Jéja**.

## That Don't Impress Me Much — Xelpy Remix

Morceau ajouté au projet de travail en lecture continue :

- VOICE et KEYS toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à la vitesse, à l’énergie et au freinage ;
- SPARK réagit à l’accélération et aux virages.

Durée : 3 min 03 s. Tempo détecté : environ 123 BPM.


## I Will Survive (Disco Remix) — Ziak

Morceau ajouté au projet de travail en lecture continue :

- VOICE et SPARK toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à l’accélération et aux virages ;
- aucun personnage KEYS.

Durée : 2 min 50 s. Tempo détecté : environ 143,6 BPM.


## Whispering Still — Little Rose Remix

Morceau ajouté au projet de travail en lecture continue :

- VOICE, SPARK et KEYS toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à l’accélération et aux virages.

Durée : 3 min 15 s. Tempo détecté : 120,2 BPM.


## First Thing

Morceau ajouté au projet de travail en lecture continue :

- VOICE, SPARK et KEYS toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à l’accélération et aux virages.

Durée : 3 min 03 s. Tempo détecté : environ 126 BPM. Artiste à préciser.


## Unsteady — Justin Caruso Remix

Morceau ajouté au projet de travail en lecture continue :

- VOICE et KEYS toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE et SPARK réagissent à l’accélération et aux virages.

Durée : 3 min 02 s. Tempo détecté : environ 143,6 BPM.

## Danza Kuduro Instrumental Remix — Don Omar ft. Lucenzo

Morceau ajouté au projet de travail en lecture continue :

- VOICE, SPARK et KEYS toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à l’accélération et aux virages.

Le pack ne contenant pas de piste Piano, KEYS et SPARK sont deux bandes complémentaires du stem Other, séparées à 2,8 kHz. Durée : 2 min 09 s. Tempo détecté : environ 129,2 BPM.

## Minuit Jacuzi — datA Remix

Morceau ajouté au projet de travail en lecture continue :

- VOICE et SPARK toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à l’accélération et aux virages ;
- aucun personnage KEYS.

Durée : 4 min 24 s. Tempo détecté : environ 123 BPM.

## Jerk It Out — Let’s Go! Remix

Morceau ajouté au projet de travail en lecture continue :

- VOICE et SPARK toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à l’accélération et aux virages ;
- aucun personnage KEYS.

Durée : 3 min 33 s. Tempo détecté : environ 136 BPM.

## I Will Wait For You — Tomas Skyldeberg

Morceau ajouté en lecture continue :

- VOICE, SPARK et KEYS toujours actifs ;
- PULSE progresse avec la vitesse ;
- BOUNCE réagit à l’accélération et aux virages.

Durée utile synchronisée : 3 min 32 s. Tempo détecté : environ 123 BPM.
Le fichier `Bass.mp3` fourni était une réponse XML d’erreur et non un fichier audio. Une couche BOUNCE de secours a donc été dérivée des graves de Drum et Other, sans modifier les quatre stems valides.
