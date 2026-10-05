# NÛR (نور) — application installable (PWA), version 1.0.0

Coran en Warsh ʿan Nâfiʿ, heures de prière, qibla, mémorisation, tajwid, méditation, compteurs de dhikr, espace enfant. Sans publicité, sans traceur ; les données restent sur l'appareil. Fonctionne hors ligne après le premier chargement.

## Publier (GitHub Pages)
1. Créer un dépôt public (ex. `nur`).
2. Y déposer tout le contenu de ce dossier (fichiers et dossiers `data`, `fonts`, `icons`).
3. Settings > Pages > Deploy from a branch > `main` / `(root)` > Save.
4. L'adresse est de la forme `https://<compte>.github.io/nur/`.

## Contenu
- `index.html`, `styles.css`, `app.js` : application.
- `prayer.js` : calcul astronomique des prières et de la qibla.
- `sw.js`, `manifest.webmanifest` : mode hors ligne et installation.
- `data/quran.json` : texte Warsh (KFGQPC, v0.10, 6 214 versets).
- `fonts/` : police KFGQPC Warsh (non modifiée) et sa licence.

## Sources
Texte et police : King Fahd Glorious Quran Printing Complex (KFGQPC), via github.com/thetruetruth/quran-data-kfgqpc. Voir `fonts/LICENCE-KFGQPC.txt`.

## Points en attente
Validation de l'imam garant ; traduction française et translittération ; audio ; abonnements ; notifications d'adhan en arrière-plan (application native).
