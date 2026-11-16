# NÛR (نور) — application installable (PWA), version 1.2.1

Coran en Warsh ʿan Nâfiʿ, heures de prière, qibla, mémorisation, tajwid, méditation, compteurs de dhikr. Application gratuite, sans abonnement, sans publicité, sans traceur ; les données restent sur l'appareil. Fonctionne hors ligne après le premier chargement.

## Nouveautés des versions 1.2.0 et 1.2.1
- **Accueil au premier lancement** : présentation en quatre écrans, choix du profil, choix du lieu.
- **Profils** : jusqu'à cinq par appareil. Choix « Homme », « Femme », et sous chacun « Enfant (garçon) » ou « Enfant (fille) ». Un profil enfant demande l'âge (7 ans au moins), l'accord de l'adulte responsable et un code parental. Ce code est ensuite exigé pour quitter le profil enfant, ouvrir ses réglages et déclarer ses paliers.
- **Objectifs du jour** : lecture du jour, verset du jour, dhikr du jour, hadith du jour. Quinze points de pratique au plus par jour.
- **Lecture complète du Coran (khatm)** : versets marqués comme lus, progression par sourate, ordre « débutant » (Al-Fâtiha et sourates courtes d'abord) ou ordre du Coran.
- **Mon parcours** : premier palier, Étincelle (Initié), en neuf étapes ; chaque étape comporte quatre leçons, un quiz de cinq questions et des fiches de révision. Les paliers Flamme (Intermédiaire), Lanterne (Disciple) et Étoile (Cheikh Premium) sont annoncés, leur contenu reste à écrire.
- **Phonétique sur tout le Coran** : chaque verset est accompagné de sa phonétique (lecteur, lecture du jour, verset du jour, leçons, méditation). Une case « Lire en arabe seul » la masque. Elle est produite automatiquement à partir du texte Warsh par `translit.js`.
- **Points** : privés, sans classement ni pénalité. La grille tarifaire de la version précédente (`plans.json`) est supprimée.
- Les données d'une installation en version 1.1 sont reprises automatiquement dans un premier profil.

## Barème des points
| Action | Points |
| --- | --- |
| Leçon terminée | 10 |
| Quiz réussi (80 % au moins), une fois par étape | 30 |
| Lecture du jour | 5 |
| Verset du jour | 3 |
| Dhikr du jour | 4 |
| Hadith du jour | 3 |
| Prière cochée (suivi facultatif, désactivé par défaut) | 2, soit 10 par jour au plus |

Seuils des paliers : Étincelle 800, Flamme 1 200, Lanterne 1 800. Le passage de palier demande toutes les étapes terminées, le seuil atteint et la déclaration d'une validation orale auprès d'un imam ou d'un cheikh.

La répartition des quinze points quotidiens entre les quatre objectifs (5, 3, 4, 3) est provisoire ; elle se règle dans `quotidien.json`.

## Publier (GitHub Pages)
1. Settings > Pages > Deploy from a branch > `main` / `(root)` > Save.
2. L'adresse est de la forme `https://<compte>.github.io/nur/`.
3. Toute modification fusionnée dans `main` est publiée automatiquement.

## Contenu du dépôt
- `index.html`, `styles.css`, `app.js` : application.
- `prayer.js` : calcul astronomique des prières et de la qibla.
- `sw.js`, `manifest.webmanifest` : mode hors ligne et installation.
- `quran.json` : texte Warsh (KFGQPC, v0.10, 6 214 versets).
- `translit.js` : phonétique automatique du texte Warsh (ou = « ou » français ; â, î, oû = voyelles longues ; forme de pause en fin de verset).
- `phonetique.json` : corrections de phonétique validées par l'imam garant ; vide pour l'instant, la phonétique automatique s'applique partout.
- `parcours.json` : paliers, étapes, leçons et quiz du parcours.
- `quotidien.json` : dhikr et hadiths du jour, points des objectifs.
- `config.json` : lien de don de l'association (vide tant que le lien n'existe pas ; l'encart « Soutenir NÛR (en construction) » s'affiche alors sans bouton, et il n'apparaît jamais dans un profil enfant).
- `KFGQPC-Warsh-Uthmanic.ttf`, `LICENCE-KFGQPC.txt` : police KFGQPC Warsh (non modifiée) et sa licence.

## Modifier les contenus sans toucher au code
Les leçons, les questions, les dhikr et les hadiths se corrigent directement dans `parcours.json` et `quotidien.json`. Après une modification, augmenter le numéro de version dans `sw.js` (`nur-v1.2.1`) pour que les appareils déjà installés reçoivent la mise à jour.

## Sources
- Texte et police : King Fahd Glorious Quran Printing Complex (KFGQPC), via github.com/thetruetruth/quran-data-kfgqpc. Voir `LICENCE-KFGQPC.txt`.
- Hadiths du jour : sens reformulé de dix hadiths des Quarante hadiths d'an-Nawawî (n° 1, 7, 12, 13, 15, 16, 18, 21, 26, 36), numérotation et recueils vérifiés sur sunnah.com/nawawi40.
- Leçons, quiz et formulations du sens des versets : rédigés pour NÛR ; aucun texte n'est repris d'une autre application.

## Points en attente
- Relecture par l'imam garant des leçons, des quiz, des hadiths, des dhikr et de la phonétique automatique (fiches d'export dans « À propos »). La phonétique automatique a été comparée aux 105 versets rédigés à la main dans la version 1.1 : 89 versets identiques ; les écarts restants tiennent à des choix de notation ou corrigent l'ancien brouillon. Les particularités de Warsh (hamza adoucie, imâla) y sont rendues de façon simplifiée.
- Contenu des paliers Flamme, Lanterne et Étoile.
- Traduction française.
- Audio (récitations, lettres, leçons) et accord des ayants droit.
- Lien de don de l'association.
- Notifications d'adhan en arrière-plan (application native).
