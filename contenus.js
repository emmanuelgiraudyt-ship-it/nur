/* NÛR — contenus des guides (version 1.6). Rédigés pour NÛR selon l'école malikite, validés par l'imam garant.
   Sources : Ibn Abî Zayd al-Qayrawânî, ar-Risâla ; ʿAbd ar-Raḥmân al-Akhdarî, al-Mukhtaṣar fî al-ʿibâdât ;
   Khalîl ibn Isḥâq, al-Mukhtaṣar ; Mâlik, al-Muwaṭṭaʾ ; hadiths vérifiés sur sunnah.com.
   Chaque texte est en français ; la traduction se fait par les dictionnaires i18n-*.json. */
(function (root) {
  "use strict";
  var SRC_RISALA = "Ibn Abî Zayd al-Qayrawânî, ar-Risâla.";
  var SRC_AKHDARI = "ʿAbd ar-Raḥmân al-Akhdarî, al-Mukhtaṣar fî al-ʿibâdât.";
  var SRC_KHALIL = "Khalîl ibn Isḥâq, al-Mukhtaṣar.";
  root.NUR_C = {
    /* ------------------------------------------------ ablutions */
    wudu: {
      intro: "Les ablutions (al-woudoûʾ) sont obligatoires avant chaque prière, si elles ont été annulées. Elles se font avec une eau pure, dans l'ordre ci-dessous.",
      etapes: [
        ["L'intention", "Dans le cœur, décider de faire les ablutions pour la prière. Il n'est pas nécessaire de la prononcer.", "obligatoire"],
        ["Dire « bismi llâh »", "Au moment de commencer.", "recommandé", "بِسْمِ اللَّهِ", "bismi llâh", "Au nom de Dieu."],
        ["Laver les mains", "Laver les deux mains jusqu'aux poignets, trois fois.", "sunna"],
        ["Rincer la bouche", "Prendre de l'eau dans la bouche, la faire tourner, puis la rejeter, trois fois.", "sunna"],
        ["Rincer le nez", "Aspirer un peu d'eau par le nez, puis la rejeter en soufflant, trois fois.", "sunna"],
        ["Laver le visage", "Du haut du front jusqu'au menton, et d'une oreille à l'autre, trois fois. La première fois est obligatoire, les deux suivantes sont recommandées.", "obligatoire"],
        ["Laver les bras", "Le bras droit puis le gauche, du bout des doigts jusqu'aux coudes compris, trois fois.", "obligatoire"],
        ["Passer les mains sur la tête", "Mains mouillées, passer sur toute la tête, du front jusqu'à la nuque. Revenir ensuite de la nuque vers le front.", "obligatoire", null, null, null, "Le passage sur toute la tête est obligatoire ; le retour vers le front est sunna."],
        ["Passer l'eau sur les oreilles", "Avec une eau renouvelée, l'intérieur et l'extérieur des oreilles.", "sunna"],
        ["Laver les pieds", "Le pied droit puis le gauche, chevilles comprises, en passant entre les orteils, trois fois.", "obligatoire"]
      ],
      tout: "Pendant toutes les ablutions : frotter chaque membre avec la main (ad-dalk) et enchaîner sans interruption (al-fawr). Ces deux points sont obligatoires dans l'école malikite.",
      fard: ["L'intention", "Laver le visage", "Laver les bras, coudes compris", "Passer les mains sur toute la tête", "Laver les pieds, chevilles comprises", "Frotter les membres (ad-dalk)", "Enchaîner sans interruption (al-fawr)"],
      sunan: ["Laver les mains jusqu'aux poignets au début", "Rincer la bouche", "Aspirer l'eau par le nez", "Rejeter l'eau du nez", "Revenir de la nuque vers le front", "Passer l'eau sur les oreilles", "Renouveler l'eau pour les oreilles", "Respecter l'ordre des membres"],
      annule: ["L'urine, les selles et les gaz", "Le liquide prostatique (madhy) et le liquide qui suit parfois l'urine (wady)", "Le sommeil profond", "La perte de conscience : évanouissement, ivresse", "Le toucher avec désir, et le toucher du sexe avec l'intérieur de la main", "Le doute sur l'état de pureté, quand on était sûr de l'avoir perdue"],
      apres: ["أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", "ach-hadou an lâ ilâha illâ llâhou waḥdahou lâ charîka lah, wa ach-hadou anna Mouḥammadan ʿabdouhou wa rasoûlouh", "J'atteste qu'il n'y a de divinité que Dieu, seul, sans associé, et j'atteste que Muhammad est Son serviteur et Son messager.", "Muslim 234"],
      ghusl: "Le grand lavage (al-ghousl) est obligatoire après les rapports conjugaux, l'émission de sperme, la fin des règles et la fin des lochies. On commence par les ablutions, puis on lave tout le corps en frottant et sans interruption.",
      tayammum: "Sans eau, ou si l'eau est nuisible pour la santé, on fait les ablutions sèches (at-tayammoum) : poser les mains sur une terre pure, les passer sur le visage, puis sur les mains et les avant-bras.",
      sources: [SRC_AKHDARI, SRC_RISALA]
    },
    /* ------------------------------------------------ prière */
    salat: {
      intro: "La prière se fait en état de pureté, avec des vêtements et un lieu propres, le corps couvert comme il convient, face à la qibla, une fois l'heure de la prière arrivée.",
      /* Prière du Soubḥ (Fajr), de A à Z, en trois couches : [titre, position, gestes et regard, statut, arabe, phonétique, sens, ce que l'on dit] */
      fajr: [
        ["L'intention", "Debout, face à la qibla.", "Bras le long du corps. Le regard reste devant soi.", "obligatoire", "", "", "", "Rien à voix haute : dans le cœur, décider d'accomplir la prière du Soubḥ."],
        ["Le takbîr d'entrée", "Debout.", "En le disant, lever les mains à hauteur des épaules, puis les laisser retomber le long du corps. C'est le seul moment de la prière où l'on lève les mains.", "obligatoire", "اللَّهُ أَكْبَرُ", "Allâhou akbar", "Dieu est le plus grand.", "« Allâhou akbar »."],
        ["La station debout et Al-Fâtiḥa", "Debout, les bras le long du corps (as-sadl).", "Le regard reste devant soi, sans le lever au ciel ni regarder autour de soi.", "obligatoire", "آمِين", "âmîn", "Exauce-nous.", "Al-Fâtiḥa à voix haute, sans la basmala, puis « âmîn » à voix basse."],
        ["L'inclinaison (ar-roukoûʿ)", "Incliné, le dos droit et horizontal, la tête dans l'alignement du dos.", "Dire « Allâhou akbar » en descendant. Les mains posées sur les genoux.", "obligatoire", "سُبْحَانَ رَبِّيَ الْعَظِيمِ", "soubḥâna rabbiya l-ʿaẓîm", "Gloire à mon Seigneur, le Très-Grand.", "« Soubḥâna rabbiya l-ʿaẓîm », trois fois, à voix basse."],
        ["Le redressement", "Debout, droit, les bras le long du corps.", "Se redresser sans lever les mains.", "obligatoire", "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ، رَبَّنَا وَلَكَ الْحَمْدُ", "samiʿa llâhou li-man ḥamidah, rabbanâ wa laka l-ḥamd", "Dieu entend celui qui Le loue. Notre Seigneur, à Toi la louange.", "« Samiʿa llâhou li-man ḥamidah » en se redressant, puis « rabbanâ wa laka l-ḥamd » une fois debout."],
        ["La première prosternation (as-soujoûd)", "Le front et le nez au sol, les paumes au sol, les genoux et les orteils au sol, les orteils tournés vers la qibla.", "Dire « Allâhou akbar » en descendant. L'homme écarte les bras du corps et le ventre des cuisses ; la femme reste plus ramassée.", "obligatoire", "سُبْحَانَ رَبِّيَ الْأَعْلَى", "soubḥâna rabbiya l-aʿlâ", "Gloire à mon Seigneur, le Très-Haut.", "« Soubḥâna rabbiya l-aʿlâ », trois fois, à voix basse."],
        ["L'assise entre les deux prosternations", "Assis sur la hanche gauche, le pied gauche sous la jambe droite, le pied droit dressé, les orteils vers la qibla (at-tawarrouk).", "Dire « Allâhou akbar » en se relevant de la prosternation. Les mains posées sur les cuisses, près des genoux.", "obligatoire", "رَبِّ اغْفِرْ لِي", "rabbi ghfir lî", "Seigneur, pardonne-moi.", "« Rabbi ghfir lî », trois fois, à voix basse."],
        ["La seconde prosternation", "Comme la première prosternation.", "Dire « Allâhou akbar » en descendant.", "obligatoire", "سُبْحَانَ رَبِّيَ الْأَعْلَى", "soubḥâna rabbiya l-aʿlâ", "Gloire à mon Seigneur, le Très-Haut.", "« Soubḥâna rabbiya l-aʿlâ », trois fois, à voix basse. La première rakʿa est terminée."],
        ["Se relever pour la deuxième rakʿa", "Debout, les bras le long du corps.", "Dire « Allâhou akbar » en se relevant, sans lever les mains.", "obligatoire", "اللَّهُ أَكْبَرُ", "Allâhou akbar", "Dieu est le plus grand.", "« Allâhou akbar »."],
        ["Deuxième rakʿa : Al-Fâtiḥa", "Debout, les bras le long du corps.", "Le regard reste devant soi.", "obligatoire", "آمِين", "âmîn", "Exauce-nous.", "Al-Fâtiḥa à voix haute, puis « âmîn » à voix basse."],
        ["Le qounoût", "Debout, après Al-Fâtiḥa, avant l'inclinaison.", "Les bras restent le long du corps, sans lever les mains.", "recommandé", "اللَّهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ، وَنُؤْمِنُ بِكَ وَنَتَوَكَّلُ عَلَيْكَ، وَنَخْنَعُ لَكَ، وَنَخْلَعُ وَنَتْرُكُ مَنْ يَكْفُرُكَ. اللَّهُمَّ إِيَّاكَ نَعْبُدُ، وَلَكَ نُصَلِّي وَنَسْجُدُ، وَإِلَيْكَ نَسْعَى وَنَحْفِدُ، نَرْجُو رَحْمَتَكَ، وَنَخَافُ عَذَابَكَ الْجِدَّ، إِنَّ عَذَابَكَ بِالْكَافِرِينَ مُلْحِقٌ", "allâhoumma innâ nastaʿînouka wa nastaghfirouk, wa nouʾminou bika wa natawakkalou ʿalayk, wa nakhnaʿou lak, wa nakhlaʿou wa natroukou man yakfourouk. Allâhoumma iyyâka naʿboud, wa laka nouṣallî wa nasdjoud, wa ilayka nasʿâ wa naḥfid, nardjoû raḥmatak, wa nakhâfou ʿadhâbaka l-djidd, inna ʿadhâbaka bi-l-kâfirîna moulḥiq", "Ô Dieu, nous implorons Ton aide et Ton pardon, nous croyons en Toi et nous nous en remettons à Toi, nous nous humilions devant Toi, nous rejetons et délaissons quiconque Te renie. Ô Dieu, c'est Toi que nous adorons, c'est pour Toi que nous prions et nous prosternons, c'est vers Toi que nous nous empressons ; nous espérons Ta miséricorde et craignons Ton châtiment véritable : Ton châtiment atteint les mécréants.", "Le qounoût, à voix basse."],
        ["Inclinaison, redressement et deux prosternations", "Comme dans la première rakʿa.", "Mêmes gestes que dans la première rakʿa.", "obligatoire", "", "", "", "Les mêmes paroles que dans la première rakʿa."],
        ["L'assise finale et le tachahhoud", "Assis en at-tawarrouk, comme entre les deux prosternations.", "Dire « Allâhou akbar » en se relevant de la seconde prosternation. Main gauche sur la cuisse gauche, doigts étendus ; main droite fermée sur la cuisse droite, l'index tendu, que l'on remue pendant le tachahhoud. Le regard reste devant soi.", "sunna", "", "", "", "Le tachahhoud, à voix basse (texte complet plus bas)."],
        ["La prière sur le Prophète", "Toujours assis.", "Mêmes gestes que pendant le tachahhoud.", "recommandé", "", "", "", "La prière sur le Prophète, à voix basse (texte complet plus bas)."],
        ["Le salut final (at-taslîm)", "Toujours assis.", "Tourner la tête vers la droite en disant la formule, puis vers la gauche en disant la même formule.", "obligatoire", "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ", "as-salâmou ʿalaykoum wa raḥmatou llâh", "Que la paix et la miséricorde de Dieu soient sur vous.", "« As-salâmou ʿalaykoum wa raḥmatou llâh » à droite, puis la même formule à gauche. La prière est terminée."]
      ],
      ajout: [
        "Maghrib (3 rakʿa) et Dhouhr, ʿAsr, ʿIchâʾ (4 rakʿa) : faire les deux premières rakʿa comme au Soubḥ, sans le qounoût.",
        "À la fin de la deuxième rakʿa : s'asseoir et réciter seulement le tachahhoud, sans la prière sur le Prophète ni le salut.",
        "Se relever en disant « Allâhou akbar », sans lever les mains.",
        "Troisième rakʿa, et quatrième pour le Dhouhr, le ʿAsr et le ʿIchâʾ : réciter seulement Al-Fâtiḥa, à voix basse, puis l'inclinaison, le redressement et les deux prosternations.",
        "Après la dernière rakʿa : l'assise finale, le tachahhoud, la prière sur le Prophète, puis le salut.",
        "Le qounoût ne se dit qu'au Soubḥ."
      ],
      ecole: "NÛR décrit la prière selon l'école malikite. Chacun la pratique selon son école.",
      tableau: [["Soubḥ", "2", "À voix haute"], ["Dhouhr", "4", "À voix basse"], ["ʿAsr", "4", "À voix basse"], ["Maghrib", "3", "À voix haute dans les deux premières"], ["ʿIchâʾ", "4", "À voix haute dans les deux premières"]],
      tachahhoud: ["التَّحِيَّاتُ لِلَّهِ، الزَّاكِيَاتُ لِلَّهِ، الطَّيِّبَاتُ الصَّلَوَاتُ لِلَّهِ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", "at-taḥiyyâtou lillâh, az-zâkiyâtou lillâh, aṭ-ṭayyibâtou ṣ-ṣalawâtou lillâh, as-salâmou ʿalayka ayyouhâ n-nabiyyou wa raḥmatou llâhi wa barakâtouh, as-salâmou ʿalaynâ wa ʿalâ ʿibâdi llâhi ṣ-ṣâliḥîn, ach-hadou an lâ ilâha illâ llâhou waḥdahou lâ charîka lah, wa ach-hadou anna Mouḥammadan ʿabdouhou wa rasoûlouh", "Les salutations sont à Dieu, les œuvres pures sont à Dieu, les bonnes paroles et les prières sont à Dieu. Que la paix soit sur toi, ô Prophète, ainsi que la miséricorde de Dieu et Ses bénédictions. Que la paix soit sur nous et sur les serviteurs vertueux de Dieu. J'atteste qu'il n'y a de divinité que Dieu, seul, sans associé, et j'atteste que Muhammad est Son serviteur et Son messager.", "Texte de la Risâla d'Ibn Abî Zayd ; tachahhoud de ʿOumar rapporté dans le Mouwaṭṭaʾ de Mâlik."],
      ibrahimiyya: ["اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَىٰ آلِ إِبْرَاهِيمَ، وَبَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَىٰ آلِ إِبْرَاهِيمَ، فِي الْعَالَمِينَ إِنَّكَ حَمِيدٌ مَجِيدٌ", "allâhoumma ṣalli ʿalâ Mouḥammadin wa ʿalâ âli Mouḥammad, kamâ ṣallayta ʿalâ âli Ibrâhîm, wa bârik ʿalâ Mouḥammadin wa ʿalâ âli Mouḥammad, kamâ bârakta ʿalâ âli Ibrâhîm, fî l-ʿâlamîna innaka ḥamîdoun madjîd", "Ô Dieu, prie sur Muhammad et sur la famille de Muhammad, comme Tu as prié sur la famille d'Abraham ; et bénis Muhammad et la famille de Muhammad, comme Tu as béni la famille d'Abraham, dans les mondes. Tu es digne de louange et de gloire.", "Muslim 405"],
      sources: [SRC_RISALA, SRC_AKHDARI, "Mâlik, al-Muwaṭṭaʾ, livre de la prière."]
    },
    /* ------------------------------------------------ glossaire */
    glossaire: [
      ["Allâh", "الله", "Dieu, en arabe. Le même mot est employé par les chrétiens arabophones."],
      ["Islam", "الإسلام", "Soumission confiante à Dieu ; nom de la religion."],
      ["Musulman", "مسلم", "Celui qui se soumet à Dieu et suit l'islam."],
      ["Coran", "القرآن", "La parole de Dieu révélée au Prophète Muhammad, en arabe."],
      ["Sourate", "سورة", "Chapitre du Coran. Le Coran en compte 114."],
      ["Verset (âya)", "آية", "Phrase du Coran ; le mot signifie aussi « signe »."],
      ["Riwaya", "رواية", "Manière transmise de réciter le Coran. NÛR suit celle de Warsh d'après Nâfiʿ."],
      ["Warsh", "ورش", "Transmetteur de la lecture de Nâfiʿ de Médine ; lecture répandue en Afrique du Nord et de l'Ouest."],
      ["Ḥafṣ", "حفص", "Transmetteur de la lecture de ʿÂṣim ; lecture la plus répandue dans le monde."],
      ["Tajwid", "تجويد", "Règles de prononciation et de récitation du Coran."],
      ["Ḥifẓ", "حفظ", "Mémorisation du Coran."],
      ["Khatm", "ختم", "Lecture complète du Coran, du début à la fin."],
      ["Tafsir", "تفسير", "Explication du sens des versets."],
      ["Hadith", "حديث", "Parole, acte ou approbation rapportés du Prophète."],
      ["Sunna", "سنة", "La voie du Prophète ; en fiqh, un acte recommandé avec insistance."],
      ["Fiqh", "فقه", "Science des règles pratiques de l'islam."],
      ["École malikite", "المذهب المالكي", "École de fiqh de l'imam Mâlik de Médine, suivie en Afrique du Nord et de l'Ouest."],
      ["Farḍ (obligatoire)", "فرض", "Acte obligatoire : le délaisser volontairement est un péché."],
      ["Recommandé (moustaḥabb)", "مستحب", "Acte récompensé, sans péché s'il est délaissé."],
      ["Ḥalâl", "حلال", "Permis."],
      ["Ḥarâm", "حرام", "Interdit."],
      ["Makroûh", "مكروه", "Déconseillé, sans être interdit."],
      ["Niyya", "نية", "L'intention, dans le cœur."],
      ["Basmala", "البسملة", "La formule « bismi llâhi r-raḥmâni r-raḥîm », « au nom de Dieu, le Tout Miséricordieux, le Très Miséricordieux »."],
      ["Shahâda", "الشهادة", "L'attestation de foi : il n'y a de divinité que Dieu, et Muhammad est Son messager."],
      ["Ṣalât", "الصلاة", "La prière rituelle, cinq fois par jour."],
      ["Rakʿa", "ركعة", "Unité de la prière : station debout, inclinaison et deux prosternations."],
      ["Takbîr", "تكبير", "Dire « Allâhou akbar », « Dieu est le plus grand »."],
      ["Tachahhoud", "التشهد", "Attestation récitée en position assise dans la prière."],
      ["Taslîm", "التسليم", "Le salut « as-salâmou ʿalaykoum » qui termine la prière."],
      ["Qounoût", "القنوت", "Invocation dite au Soubḥ, avant l'inclinaison de la deuxième rakʿa, dans l'école malikite."],
      ["Woudoûʾ", "الوضوء", "Les ablutions avant la prière."],
      ["Ghousl", "الغسل", "Le grand lavage de tout le corps."],
      ["Tayammoum", "التيمم", "Les ablutions sèches, avec de la terre pure, quand l'eau manque."],
      ["Qibla", "القبلة", "La direction de la Kaʿba, vers laquelle on prie."],
      ["Kaʿba", "الكعبة", "Le sanctuaire cubique de La Mecque."],
      ["Adhân", "الأذان", "L'appel à la prière."],
      ["Iqâma", "الإقامة", "Le second appel, juste avant la prière en commun."],
      ["Imam", "إمام", "Celui qui dirige la prière."],
      ["Mosquée (masdjid)", "مسجد", "Lieu de prière ; le mot signifie « lieu de prosternation »."],
      ["Djoumouʿa", "الجمعة", "La prière du vendredi en commun, qui remplace le Dhouhr."],
      ["Dhikr", "ذكر", "Le rappel de Dieu par des formules répétées."],
      ["Douʿâʾ", "دعاء", "L'invocation : demander à Dieu."],
      ["Wird", "ورد", "Ensemble de lectures et de dhikr récités chaque jour."],
      ["Ramaḍân", "رمضان", "Neuvième mois du calendrier hégirien, mois du jeûne."],
      ["Ṣawm", "الصوم", "Le jeûne : ni nourriture, ni boisson, ni rapport conjugal, de l'aube au coucher du soleil."],
      ["Souḥoûr", "السحور", "Le repas pris avant l'aube, les jours de jeûne."],
      ["Ifṭâr", "الإفطار", "La rupture du jeûne, au coucher du soleil."],
      ["Zakât", "الزكاة", "L'aumône obligatoire, prélevée sur certains biens."],
      ["Zakât al-fiṭr", "زكاة الفطر", "L'aumône de la fin du Ramaḍân, due pour chaque personne."],
      ["Ṣadaqa", "صدقة", "L'aumône volontaire."],
      ["Ḥadjj", "الحج", "Le grand pèlerinage à La Mecque, une fois dans la vie pour qui en a les moyens."],
      ["ʿOumra", "العمرة", "Le petit pèlerinage, possible toute l'année."],
      ["Hégire", "الهجرة", "L'émigration du Prophète vers Médine, point de départ du calendrier musulman."],
      ["Ḥayḍ", "الحيض", "Les règles."],
      ["Nifâs", "النفاس", "Les lochies : les saignements qui suivent l'accouchement."],
      ["Cheikh", "شيخ", "Maître, savant ou guide spirituel."],
      ["Mouqaddam", "مقدم", "Représentant d'une voie soufie, habilité à transmettre ses litanies."]
    ],
    /* ------------------------------------------------ converti */
    converti: {
      intro: "Bienvenue. Ce parcours accompagne tes trente premiers jours. Avance à ton rythme : l'essentiel est la prière, le reste viendra avec le temps.",
      chahada: ["أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ", "ach-hadou an lâ ilâha illâ llâh, wa ach-hadou anna Mouḥammadan rasoûlou llâh", "J'atteste qu'il n'y a de divinité que Dieu, et j'atteste que Muhammad est le messager de Dieu."],
      chahadaNote: "On entre en islam en prononçant la shahâda avec sincérité et en comprenant son sens. Un témoin n'est pas une condition ; le faire devant l'imam de ta mosquée permet d'être accompagné.",
      ghusl: "Après la shahâda, l'école malikite demande au nouveau musulman de faire le grand lavage (al-ghousl). Le Prophète l'a demandé à Qays ibn ʿÂṣim quand il a embrassé l'islam.",
      ghuslSrc: "Abû Dâwûd 355 ; Khalîl, al-Mukhtaṣar.",
      efface: "L'islam efface ce qui le précède : tu commences une page blanche.",
      effaceSrc: "Muslim 121",
      semaines: [
        ["Semaine 1 : les bases", ["Prononcer la shahâda et comprendre son sens", "Faire le grand lavage (al-ghousl)", "Apprendre les ablutions avec le guide", "Apprendre Al-Fâtiḥa en phonétique, verset par verset", "Commencer les cinq prières, même de façon simple"]],
        ["Semaine 2 : la prière", ["Connaître les cinq prières et leurs heures", "Apprendre les gestes de la prière avec le guide", "Apprendre « soubḥâna rabbiya l-ʿaẓîm » et « soubḥâna rabbiya l-aʿlâ »", "Prier une fois à la mosquée"]],
        ["Semaine 3 : les sourates courtes", ["Apprendre la sourate Al-Ikhlâṣ (112)", "Apprendre la sourate Al-Falaq (113)", "Apprendre la sourate An-Nâs (114)", "Apprendre le tachahhoud"]],
        ["Semaine 4 : la vie de musulman", ["Lire le glossaire pour comprendre les mots de l'islam", "Faire le parcours Étincelle (leçons et quiz)", "Apprendre la prière sur le Prophète", "Garder chaque jour un moment de dhikr"]]
      ],
      minimale: "Tant que tu ne sais pas encore réciter la Fâtiḥa, ne retarde pas la prière : prie avec l'imam à la mosquée quand tu le peux, et apprends la Fâtiḥa en priorité. Un homme a dit au Prophète qu'il ne pouvait rien retenir du Coran ; le Prophète lui a enseigné de dire, en attendant : « soubḥâna llâh, wa l-ḥamdou lillâh, wa lâ ilâha illâ llâh, wa llâhou akbar, wa lâ ḥawla wa lâ qouwwata illâ bi-llâh ».",
      minimaleSrc: "Abû Dâwûd 832",
      sourates: [1, 112, 113, 114],
      obligatoire: ["Croire en Dieu, en Ses anges, en Ses livres, en Ses messagers, au Jour dernier et au destin", "Accomplir les cinq prières, en état de pureté", "Jeûner le mois de Ramaḍân", "Verser la zakât si l'on remplit ses conditions", "Faire le pèlerinage une fois dans sa vie, si l'on en a les moyens", "S'abstenir de ce qui est interdit : alcool, porc, mensonge, injustice"],
      recommande: ["Les prières surérogatoires, en particulier les deux rakʿa avant le Soubḥ et le witr", "Lire le Coran chaque jour, même un peu", "Le dhikr matin et soir", "Jeûner le lundi et le jeudi", "L'aumône volontaire"],
      pasOblige: ["Changer de prénom : ce n'est pas une obligation", "Porter un vêtement d'un pays particulier", "Parler arabe : la prière se récite en arabe, mais on apprend pas à pas", "Tout savoir dès le premier jour"],
      sources: ["Muslim 121", "Abû Dâwûd 355", "Abû Dâwûd 832", SRC_KHALIL, SRC_RISALA]
    },
    /* ------------------------------------------------ femme */
    femme: {
      intro: "Les règles propres à la femme, selon l'école malikite, et une pause qui suspend le suivi des prières pendant les règles ou les lochies, sans perte de points.",
      confid: "La pause et ses dates restent uniquement sur cet appareil. Rien n'est envoyé.",
      sections: [
        ["Les règles (al-ḥayḍ)", ["Dans l'école malikite, il n'y a pas de durée minimale pour les actes d'adoration : un seul écoulement de sang suffit pour qu'il s'agisse des règles.", "La durée maximale est de quinze jours. Pour une femme qui a une habitude, on retient sa durée habituelle, prolongée de trois jours au plus, sans dépasser quinze jours.", "La période de pureté entre deux règles est d'au moins quinze jours."]],
        ["Les lochies (an-nifâs)", ["Ce sont les saignements qui suivent l'accouchement. Leur durée maximale est de soixante jours. Si le sang s'arrête avant, la femme est pure."]],
        ["Ce qui est suspendu pendant les règles et les lochies", ["La prière : elle n'est pas due et ne se rattrape pas.", "Le jeûne : il n'est pas valable et se rattrape plus tard.", "Les rapports conjugaux.", "Le séjour à la mosquée et la circumambulation autour de la Kaʿba.", "Le toucher du mouṣḥaf. La lecture du Coran, elle, n'est pas interdite : NÛR reste donc utilisable pour lire et écouter."]],
        ["La fin des règles", ["La pureté se reconnaît à un écoulement blanc (al-qaṣṣa al-bayḍâʾ) ou à la sécheresse complète.", "Le grand lavage (al-ghousl) est alors obligatoire avant de reprendre la prière.", "Si la pureté arrive alors qu'il reste le temps d'une rakʿa avant la fin de l'heure d'une prière, cette prière est due."]],
        ["Les saignements hors des règles (al-istiḥâḍa)", ["Un saignement qui dépasse la durée maximale, ou qui n'est pas celui des règles, n'empêche ni la prière ni le jeûne.", "Il est recommandé à la femme concernée de refaire les ablutions pour chaque prière."]],
        ["La prière de la femme", ["Elle prie comme l'homme, avec les mêmes gestes, mais en restant plus ramassée : bras près du corps, cuisses rapprochées.", "Tout le corps est couvert, sauf le visage et les mains."]]
      ],
      sources: [SRC_KHALIL, SRC_RISALA, SRC_AKHDARI, "Bukhârî 579 (la rakʿa qui fait atteindre la prière)."]
    },
    /* ------------------------------------------------ jeûne */
    jeune: {
      intro: "Le jeûne du Ramaḍân est l'un des piliers de l'islam. On s'abstient de manger, de boire et des rapports conjugaux, de l'aube (heure du Fadjr) jusqu'au coucher du soleil (heure du Maghrib).",
      regles: [
        ["L'intention", "Elle se fait la nuit, avant l'aube. Dans l'école malikite, une seule intention au début du mois suffit pour tout le Ramaḍân, tant que le jeûne n'est pas interrompu."],
        ["Ce qui rompt le jeûne", "Manger, boire, les rapports conjugaux, le vomissement provoqué, et tout ce qui parvient à la gorge ou à l'estomac."],
        ["L'oubli", "Dans l'école malikite, celui qui mange ou boit par oubli pendant le Ramaḍân continue son jeûne, puis rattrape ce jour, sans expiation."],
        ["Rompre volontairement", "Rompre volontairement un jour du Ramaḍân, en mangeant, en buvant ou par un rapport conjugal, oblige à rattraper ce jour et à l'expiation : nourrir soixante pauvres (choix préféré dans l'école malikite) ou jeûner soixante jours de suite."],
        ["Qui est dispensé", "Le malade et le voyageur (trajet d'environ 80 km ou plus) peuvent ne pas jeûner et rattrapent plus tard. La femme en règles ou en lochies ne jeûne pas et rattrape. La femme enceinte ou qui allaite, si elle craint pour elle ou pour l'enfant, rattrape ; celle qui allaite ajoute une aumône d'un moudd de nourriture par jour. La personne âgée qui ne peut plus jeûner donne, de façon recommandée, un moudd par jour."]
      ],
      iftar: ["ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ", "dhahaba ẓ-ẓamaʾou wa btallati l-ʿouroûqou wa thabata l-adjrou in châʾa llâh", "La soif est partie, les veines sont humectées, et la récompense est acquise, si Dieu le veut.", "Abû Dâwûd 2357"],
      suregatoires: ["Le lundi et le jeudi", "Les trois jours blancs : 13, 14 et 15 de chaque mois hégirien", "Le jour de ʿArafa (9 dhoû l-ḥidjdja), pour qui n'est pas en pèlerinage", "ʿÂchoûrâʾ (10 mouḥarram), avec le 9", "Six jours du mois de chawwâl"],
      fitr: ["Elle est due pour chaque personne à charge, à la fin du Ramaḍân.", "Dans l'école malikite, elle se donne en nourriture : un ṣâʿ, soit environ 2,5 kg, de l'aliment de base du pays (riz, mil, blé…).", "On la donne de préférence le matin de l'Aïd, avant la prière, et au plus tôt un ou deux jours avant.", "Le montant pratiqué localement est fixé par les mosquées : renseigne-toi auprès de la tienne."],
      sources: [SRC_KHALIL, SRC_RISALA, "Abû Dâwûd 2357"]
    },
    /* ------------------------------------------------ zakât */
    zakat: {
      intro: "La zakât est due sur l'épargne et les biens qui dépassent un seuil minimal (le niṣâb) et que l'on possède depuis une année lunaire complète. Son taux est de 2,5 %.",
      regles: ["Le seuil se calcule sur l'or (85 g) ou sur l'argent métal (595 g). Choisis la base retenue par ta mosquée ; l'argent métal donne un seuil plus bas, plus favorable aux pauvres.", "On additionne l'épargne, l'or et l'argent possédés, la valeur des marchandises destinées à la vente et les créances que l'on est sûr de recouvrer ; on retire les dettes à payer immédiatement.", "Le bétail et les récoltes ont des règles et des seuils propres : demande à l'imam de ta mosquée.", "La zakât est versée aux catégories citées dans le Coran (sourate At-Tawba, verset 60 dans la numérotation de Ḥafṣ), en premier lieu les pauvres et les nécessiteux."],
      note: "Ce calcul est une aide. Pour un cas particulier (entreprise, placements, dettes importantes), demande l'avis de l'imam.",
      sources: [SRC_RISALA, SRC_KHALIL, "Coran, sourate At-Tawba (9), verset 60 (Ḥafṣ)."]
    },
    /* ------------------------------------------------ vendredi */
    djoumoua: {
      texte: "C'est vendredi. La prière du Djoumouʿa, en commun à la mosquée, remplace le Dhouhr. Il est recommandé de faire le grand lavage avant d'y aller.",
      src: "Bukhârî 877",
      kahf: "Celui qui lit la sourate Al-Kahf (18) le vendredi, une lumière l'éclaire d'un vendredi à l'autre.",
      kahfSrc: "al-Ḥâkim ; al-Bayhaqî ; authentifié par al-Albânî, Ṣaḥîḥ al-Djâmiʿ 6470."
    },
    /* ------------------------------------------------ explications des événements (clé : mois.jour hégirien) */
    evts: {
      "1.1": ["Le premier jour de l'année hégirienne. Le calendrier musulman compte les années à partir de l'émigration du Prophète de La Mecque à Médine, en 622.", "Aucune prière ni aucun jeûne particuliers ne sont prescrits ce jour-là : c'est un moment pour se souvenir de l'hégire et faire le point sur sa pratique.", "Bukhârî 3934"],
      "1.10": ["Le dixième jour de mouḥarram. Le Prophète a jeûné ce jour où Dieu a sauvé Moïse et son peuple, et il a recommandé de le jeûner.", "Il est recommandé de jeûner aussi le neuvième jour. Le jeûne de ʿÂchoûrâʾ efface les fautes de l'année précédente.", "Bukhârî 2004 ; Muslim 1134a ; Muslim 1162b"],
      "3.12": ["La date retenue, dans la tradition, pour la naissance du Prophète Muhammad à La Mecque.", "Les savants divergent sur la célébration de ce jour. Il reste une occasion de lire sa vie (la sîra) et de multiplier la prière sur lui, que Dieu a ordonnée.", "Coran, sourate Al-Aḥzâb (33), verset 56 (Ḥafṣ)"],
      "7.27": ["La date retenue, dans la tradition, pour le voyage nocturne du Prophète de La Mecque à Jérusalem (al-isrâʾ), puis son ascension (al-miʿrâj).", "C'est au cours de cette nuit que les cinq prières quotidiennes ont été prescrites.", "Coran, sourate Al-Isrâʾ (17), verset 1 ; Bukhârî 349"],
      "8.15": ["Le milieu du mois de chaʿbân, qui précède le Ramaḍân.", "Le Prophète jeûnait beaucoup pendant chaʿbân. Les récits sur une adoration propre à cette nuit sont discutés par les savants : on s'en tient à la prière et à l'invocation habituelles.", "Bukhârî 1969"],
      "9.1": ["Le début du mois de Ramaḍân, dont le jeûne est obligatoire pour tout musulman pubère et capable.", "Le mois commence à la vue du croissant ; suivez l'annonce de votre mosquée.", "Coran, sourate Al-Baqara (2), verset 183 (Ḥafṣ) ; Bukhârî 1909"],
      "9.27": ["Laylat al-Qadr, la Nuit du destin, meilleure que mille mois. Elle se cherche dans les nuits impaires des dix dernières nuits du Ramaḍân ; la vingt-septième est la plus souvent retenue.", "On la passe en prière, en lecture du Coran et en invocation.", "Coran, sourate Al-Qadr (97), verset 3 ; Bukhârî 2017"],
      "10.1": ["La fête de la rupture du jeûne, le premier jour de chawwâl.", "La zakât al-fiṭr se donne avant la prière de l'Aïd, sunna confirmée dans l'école malikite. Il est interdit de jeûner ce jour-là.", "Bukhârî 1990"],
      "12.9": ["Le jour où les pèlerins se tiennent sur le mont ʿArafa, sommet du pèlerinage.", "Pour celui qui n'est pas en pèlerinage, le jeûne de ce jour efface les fautes de l'année passée et de l'année à venir.", "Muslim 1162b"],
      "12.10": ["La fête du sacrifice, en souvenir d'Abraham qui fut prêt à sacrifier son fils, racheté par Dieu.", "Le sacrifice d'une bête est une sunna confirmée dans l'école malikite pour qui en a les moyens ; il se fait après la prière de l'Aïd. Il est interdit de jeûner ce jour-là.", "Coran, sourate Aṣ-Ṣâffât (37), verset 107 ; Bukhârî 1990"]
    },
    /* ------------------------------------------------ la prière expliquée à un enfant de 7 ans */
    enfantPriere: ["Je fais mes ablutions.", "Je me mets debout, tourné vers La Mecque.", "Je lève les mains et je dis : « Allâhou akbar ».", "Je récite Al-Fâtiḥa, puis une petite sourate.", "Je me penche, les mains sur les genoux.", "Je me relève.", "Je pose mon front par terre : c'est la prosternation. Je le fais deux fois.", "Je recommence pour la deuxième rakʿa.", "Je m'assois et je récite le tachahhoud.", "Je tourne la tête à droite et je dis : « as-salâmou ʿalaykoum ». C'est fini !"],
    enfantWudu: ["Je pense : je me lave pour prier.", "Je dis : « bismi llâh ».", "Je lave mes mains.", "Je rince ma bouche, puis mon nez.", "Je lave mon visage.", "Je lave mes bras jusqu'aux coudes.", "Je passe mes mains mouillées sur ma tête et mes oreilles.", "Je lave mes pieds jusqu'aux chevilles. Je suis prêt pour prier !"],
    /* ------------------------------------------------ qibla de quelques villes (calcul NÛR, vérifié par la formule du grand cercle) */
    qiblaVilles: [["Paris", 119], ["Londres", 119], ["New York", 59], ["Dakar", 74], ["Abidjan", 65], ["Pékin", 279], ["Le Caire", 136], ["Beyrouth", 162], ["Casablanca", 94], ["Alger", 105]],
    /* ------------------------------------------------ noms des lettres, pour la voix arabe de l'appareil */
    lettresAr: ["أَلِف", "بَاء", "تَاء", "ثَاء", "جِيم", "حَاء", "خَاء", "دَال", "ذَال", "رَاء", "زَاي", "سِين", "شِين", "صَاد", "ضَاد", "طَاء", "ظَاء", "عَيْن", "غَيْن", "فَاء", "قَاف", "كَاف", "لَام", "مِيم", "نُون", "هَاء", "وَاو", "يَاء"]
  };
})(typeof self !== "undefined" ? self : this);
