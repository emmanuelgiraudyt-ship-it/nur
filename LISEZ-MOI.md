# NÛR (نور) — application installable (PWA), version 1.6.0

Coran en Warsh ʿan Nâfiʿ, heures de prière, qibla, mémorisation, tajwid, méditation, compteurs de dhikr. Application gratuite, sans abonnement, sans publicité, sans traceur ; les données restent sur l'appareil. Fonctionne hors ligne après le premier chargement.

## Version 1.6.0
- Guide des ablutions et de la prière pas à pas, selon l'école malikite (al-Akhdarî, ar-Risâla, al-Muwaṭṭaʾ ; Muslim 234 et 405).
- Écoute hors ligne : chaque sourate se télécharge (cache « nur-audio ») ; écoute en boucle (verset répété, passage répété) ; enregistrement de sa propre récitation, gardé le temps de la session.
- Révision programmée des versets mémorisés (1, 3, 7, 14, 30, 60, 120 jours).
- Glossaire de 58 termes ; son des lettres par la voix arabe de l'appareil ; lecture de l'écran à voix haute (toujours pour l'enfant, sur option pour l'adulte) ; temps d'écran quotidien de l'enfant fixé par l'adulte ; rappel du vendredi.
- Parcours du nouveau musulman (30 jours, shahâda, grand lavage, Abû Dâwûd 355 et 832, Muslim 121).
- Espace femme : règles malikites (Khalîl, ar-Risâla, al-Akhdarî ; Bukhârî 579) et pause du suivi des prières pendant les règles ou les lochies, gardée sur l'appareil.
- Jeûne (Ramaḍân, jours à rattraper, jeûnes recommandés, Abû Dâwûd 2357) et calculateur de zakât (or 85 g ou argent 595 g, 2,5 % ; FCFA converti en euros à 655,957).
- Traduction intégrale de l'interface et des contenus (leçons, quiz, hadiths, dhikr, guides) en anglais, chinois et arabe : dictionnaires i18n-en.json, i18n-zh.json, i18n-ar.json, gardés hors ligne ; la phonétique passe en transcription internationale hors du français.

## Version 1.5.1
- Notifications de prière et de rappel affichées par le service worker : elles fonctionnent aussi sur Android, application ouverte ou installée et active. Un toucher ouvre l'écran Prière.

## Version 1.5.0
- Langue de l'interface au choix dès le premier écran et dans le profil : français, anglais (États-Unis ou Royaume-Uni), chinois, arabe (de droite à gauche).
- La traduction du Coran suit la langue : anglais, Rowwad Translation Center (QuranEnc.com, english_rwwad) ; chinois, Muhammad Makin (QuranEnc.com, chinese_makin v1.0.0) ; arabe, al-Tafsîr al-Muyassar (complexe du Roi Fahd, via tanzil.net).
- Les leçons, quiz et hadiths restent en français pour l'instant.

## Version 1.4.0
- Traduction française cochable sous chaque verset : Muhammad Hamidullah, QuranEnc.com (french_hameedullah v1.0.0), reproduite sans modification ; affichée sous le verset de Warsh qui se termine au même endroit que le verset de Ḥafṣ (`traduction-fr.json`).
- Récitation en Warsh verset par verset, barre de lecture et lecture guidée ; trois récitateurs (EveryAyah.com) ; correspondance Warsh-Ḥafṣ dans `hafs.json`.
- Hadiths sur chaque prière, vérifiés sur sunnah.com (Muslim 725a, al-Boukhârî 615, 552 et 528, Abû Dâwoud 418, Muslim 656a).
- Qibla : boussole sur téléphone ; sur ordinateur, direction en degrés et méthode du soleil.
- Lieu : recherche de ville dans le monde entier (Open-Meteo), position GPS précise nommée par OpenStreetMap, mise à jour automatique à chaque ouverture ; page Mawaqit de sa mosquée enregistrable.
- Cartes de vœux envoyées par WhatsApp, par lien ou en image.

## Version 1.3.0 : structure de MAARIFA
NÛR reprend la structure fonctionnelle de l'application MAARIFA (version Android 1.55.02, captures du 16 novembre 2026), sans le chat de questions ni l'abonnement, et avec des textes, des visuels et un code propres :
- cinq onglets : Apprendre, Prière, Quotidien, Coran, Plus ;
- Quotidien : salutation et lieu, prochaine prière et décompte, Imsak, Chourouq et Iftar, prières à marquer, « Explorer NÛR » (Cours / Quiz, Tafsir, Khatm), objectifs du jour dans l'ordre verset, dhikr, hadith, Coran, personnalisation de la routine ;
- Prière : qibla, horaires du jour avec alerte par prière, navigation par jour, fiche de chaque prière (rite malikite), recommandations et invocations après la prière, Âyat al-Koursî ;
- Coran : continuer la lecture, progression du khatm, grille des 114 sourates avec leur nom français, recherche, signets ; lecteur verset par verset ou page, paramètres Récitateur et Khatm (arabe, phonétique, taille de police) ;
- Apprendre : thèmes, cours à poursuivre, rubriques avec durée, quiz et fiches ;
- Plus : tafsir (en construction), cartes de vœux, dhikr, scanner halal (bêta), événements à venir, qibla ;
- Profil : prénom et lieu, partage, points, paramètres, conditions, confidentialité, suppression des données, version et identifiant d'installation ;
- premier lancement : présentation, projection à 21 jours, rappels, prénom, profil, âge, lieu.

## Nouveautés des versions 1.2.0 et 1.2.1
- **Accueil au premier lancement** : présentation en quatre écrans, choix du profil, choix du lieu.
- **Profils** : jusqu'à cinq par appareil. Choix « Homme », « Femme », et sous chacun « Enfant (garçon) » ou « Enfant (fille) ». Un profil enfant demande l'âge (7 ans au moins), l'accord de l'adulte responsable et un code parental. Ce code est ensuite exigé pour quitter le profil enfant, ouvrir ses réglages et déclarer ses paliers.
- **Objectifs du jour** : lecture du jour, verset du jour, dhikr du jour, hadith du jour. Quinze points de pratique au plus par jour.
- **Lecture complète du Coran (khatm)** : versets marqués comme lus, progression par sourate, ordre « débutant » (Al-Fâtiha et sourates courtes d'abord) ou ordre du Coran.
- **Mon parcours** : premier palier, Étincelle (Initié), en neuf étapes ; chaque étape comporte quatre leçons, un quiz de cinq questions et des fiches de révision. Les paliers Flamme (Intermédiaire), Lanterne (Disciple) et Étoile (Cheikh Premium) sont annoncés, leur contenu reste à écrire.
- **Phonétique sur tout le Coran** : chaque verset est accompagné de sa phonétique (lecteur, lecture du jour, verset du jour, leçons, méditation). Une case « Lire en arabe seul » la masque. Elle est produite automatiquement à partir du texte Warsh par `translit.js`.
- **Points** : privés, sans classement ni pénalité. La grille tarifaire de la version précédente (`plans.json`) est supprimée.
- Les données d'une installation en version 1.1 sont reprises automatiquement dans un premier profil.

## Affichage
L'application garde la même présentation sur ordinateur et sur téléphone : une colonne de la largeur d'un téléphone, centrée à l'écran. Le compteur de points est visible en permanence en haut de l'écran.

## Barème des points
| Action | Points |
| --- | --- |
| Leçon terminée | 10 |
| Quiz réussi (80 % au moins), une fois par étape | 30 |
| Lecture du jour (objectif du jour, ou 5 versets marqués « lu » dans « Réciter ») | 5 |
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
- `contenus.js` : guides de la version 1.6 (ablutions, prière, glossaire, nouveau musulman, espace femme, jeûne, zakât, vendredi), en français.
- `i18n-en.json`, `i18n-zh.json`, `i18n-ar.json` : traductions de tous les textes de l'application (clé = texte français ; les nombres sont notés {0}, {1}…). Une correction de traduction se fait dans ces fichiers.
- `traduction-en.json` (Rowwad, QuranEnc), `traduction-zh.json` (Muhammad Makin, QuranEnc), `tafsir-ar.json` (al-Tafsîr al-Muyassar, tanzil.net) : sens du Coran selon la langue choisie.
- `config.json` : lien de don de l'association (vide tant que le lien n'existe pas ; l'encart « Soutenir NÛR (en construction) » s'affiche alors sans bouton, et il n'apparaît jamais dans un profil enfant).
- `KFGQPC-Warsh-Uthmanic.ttf`, `LICENCE-KFGQPC.txt` : police KFGQPC Warsh (non modifiée) et sa licence.

## Modifier les contenus sans toucher au code
Les leçons, les questions, les dhikr et les hadiths se corrigent directement dans `parcours.json` et `quotidien.json`. Si un texte français change, sa traduction doit être reprise dans les trois fichiers `i18n-*.json` (sinon le texte reste en français dans les autres langues). Après une modification, augmenter le numéro de version dans `sw.js` (`nur-v1.6.0`) pour que les appareils déjà installés reçoivent la mise à jour.

## Sources
- Texte et police : King Fahd Glorious Quran Printing Complex (KFGQPC), via github.com/thetruetruth/quran-data-kfgqpc. Voir `LICENCE-KFGQPC.txt`.
- Hadiths du jour : sens reformulé de dix hadiths des Quarante hadiths d'an-Nawawî (n° 1, 7, 12, 13, 15, 16, 18, 21, 26, 36), numérotation et recueils vérifiés sur sunnah.com/nawawi40.
- Leçons, quiz et formulations du sens des versets : rédigés pour NÛR ; aucun texte n'est repris d'une autre application.

## Points en attente
- Contenus validés par l'imam garant (leçons, quiz, hadiths, dhikr, phonétique) : d'éventuelles corrections de phonétique s'ajoutent dans `phonetique.json`. La phonétique automatique a été comparée aux 105 versets rédigés à la main dans la version 1.1 : 89 versets identiques ; les écarts restants tiennent à des choix de notation ou corrigent l'ancien brouillon. Les particularités de Warsh (hamza adoucie, imâla) y sont rendues de façon simplifiée.
- Contenu des paliers Flamme, Lanterne et Étoile.
- Traduction française.
- Audio (récitations, lettres, leçons) et accord des ayants droit.
- Lien de don de l'association.
- Notifications d'adhan en arrière-plan (application native).

## Versions 1.7.0 à 2.3.0 (novembre 2026)

- **1.7.0** : couleurs claires, nouveau logo, pastille « mémorisé » sur chaque verset, événements expliqués et sourcés, qibla par ville, scanner retiré.
- **1.8.0** : correctifs de l'audit fonctionnel (date hégirienne, Imsak, Quotidien sur un écran, Plus en grille, Coran en liste, écoles et tariqas, confidentialité réécrite, icônes, grands écrans, export complet).
- **1.9.0** : ambiance selon le moment de la journée, le jour particulier et le profil ; anneau d'astrolabe ; garde-fous d'autonomie.
- **2.0.x** : constellation, 99 noms de Dieu, jeux d'apprentissage, quêtes ; ciel animé et message du moment sur toutes les pages ; dhikr sur 100 extensible ; prières oubliées des jours précédents.
- **2.1.0 et 2.2.0** : pages principales découpées en écrans pleins, un écran par glissement, contenu ajusté à la hauteur du téléphone, transitions entre onglets.
- **2.3.0** : diagnostic technique. Suppression d'une requête vers un fichier inexistant (audio.json), politique de sécurité du contenu, aperçu de partage (Open Graph), raccourcis d'installation, protection des données contre l'effacement automatique du navigateur, écran de secours en cas d'incident, zones tactiles agrandies.

Tests automatiques : `/home/claude/work/scripts` (test_v13 à test_v17, test_offline16, test_pc2, test_palier, diag.py, domcheck.py).
