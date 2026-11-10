/**
 * Banque de questions du Quiz. `answer` = index de la bonne réponse dans `choices`
 * (les choix sont mélangés automatiquement à chaque partie).
 */
export interface QuizQuestion {
  category: 'culture' | 'enigme' | 'piege';
  question: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation?: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // 🌍 Culture générale
  { category: 'culture', question: 'Quelle est la capitale de l’Australie ?', choices: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },
  { category: 'culture', question: 'Combien de cœurs possède une pieuvre ?', choices: ['1', '2', '3', '8'], answer: 2, explanation: 'Deux cœurs pour les branchies, un pour le reste du corps.' },
  { category: 'culture', question: 'Quel est le plus grand océan du monde ?', choices: ['Atlantique', 'Indien', 'Pacifique', 'Arctique'], answer: 2 },
  { category: 'culture', question: 'En quelle année l’Homme a-t-il marché sur la Lune pour la première fois ?', choices: ['1965', '1969', '1972', '1975'], answer: 1 },
  { category: 'culture', question: 'Qui a peint « La Jeune Fille à la perle » ?', choices: ['Rembrandt', 'Vermeer', 'Van Gogh', 'Rubens'], answer: 1 },
  { category: 'culture', question: 'Quel est le symbole chimique de l’or ?', choices: ['Or', 'Ag', 'Au', 'Go'], answer: 2, explanation: 'Du latin « aurum ».' },
  { category: 'culture', question: 'Quel pays a remporté la Coupe du monde de football 2022 ?', choices: ['France', 'Argentine', 'Brésil', 'Croatie'], answer: 1 },
  { category: 'culture', question: 'Combien d’os compte le squelette d’un adulte ?', choices: ['186', '206', '226', '256'], answer: 1 },
  { category: 'culture', question: 'Quelle planète est surnommée « la planète rouge » ?', choices: ['Vénus', 'Jupiter', 'Mars', 'Mercure'], answer: 2 },
  { category: 'culture', question: 'Quel est le plus long fleuve de France ?', choices: ['La Seine', 'Le Rhône', 'La Garonne', 'La Loire'], answer: 3 },
  { category: 'culture', question: 'Qui a écrit « Les Misérables » ?', choices: ['Émile Zola', 'Victor Hugo', 'Honoré de Balzac', 'Alexandre Dumas'], answer: 1 },
  { category: 'culture', question: 'Dans quel pays se trouve le Machu Picchu ?', choices: ['Bolivie', 'Mexique', 'Pérou', 'Chili'], answer: 2 },
  { category: 'culture', question: 'Quelle langue compte le plus de locuteurs natifs ?', choices: ['Anglais', 'Espagnol', 'Mandarin', 'Hindi'], answer: 2 },
  { category: 'culture', question: 'Quel gaz les plantes absorbent-elles pour la photosynthèse ?', choices: ['Oxygène', 'Azote', 'Dioxyde de carbone', 'Hydrogène'], answer: 2 },
  { category: 'culture', question: 'Quel est le plus petit pays du monde ?', choices: ['Monaco', 'Vatican', 'Saint-Marin', 'Liechtenstein'], answer: 1 },
  { category: 'culture', question: 'Quel est le jeu vidéo le plus vendu de l’histoire ?', choices: ['GTA V', 'Minecraft', 'Tetris', 'Wii Sports'], answer: 1 },
  { category: 'culture', question: 'En quelle année est tombé le mur de Berlin ?', choices: ['1987', '1989', '1991', '1993'], answer: 1 },
  { category: 'culture', question: 'Quel est l’os le plus long du corps humain ?', choices: ['Le tibia', 'Le fémur', 'L’humérus', 'Le péroné'], answer: 1 },

  // 🧩 Énigmes
  { category: 'enigme', question: 'Je suis plein de trous mais je retiens l’eau. Qui suis-je ?', choices: ['Une passoire', 'Une éponge', 'Un filet', 'Un gruyère'], answer: 1 },
  { category: 'enigme', question: 'Le père de Toto a trois fils : Riri, Fifi et… ?', choices: ['Loulou', 'Toto', 'Titi', 'Lulu'], answer: 1 },
  { category: 'enigme', question: 'Qu’est-ce qui monte et descend sans jamais bouger ?', choices: ['Un ascenseur', 'Un escalier', 'Un yo-yo', 'La marée'], answer: 1 },
  { category: 'enigme', question: 'Si tu prononces mon nom, je disparais. Qui suis-je ?', choices: ['Un secret', 'Le silence', 'L’ombre', 'Un rêve'], answer: 1 },
  { category: 'enigme', question: 'Quel nombre complète la suite : 2, 6, 12, 20, 30, … ?', choices: ['40', '42', '44', '36'], answer: 1, explanation: 'n × (n + 1) : 6 × 7 = 42.' },
  { category: 'enigme', question: 'Quel nombre complète la suite : 1, 1, 2, 3, 5, 8, … ?', choices: ['11', '12', '13', '15'], answer: 2, explanation: 'Suite de Fibonacci : chaque terme est la somme des deux précédents.' },
  { category: 'enigme', question: 'Une batte et une balle coûtent 1,10 € au total. La batte coûte 1 € de plus que la balle. Combien coûte la balle ?', choices: ['0,10 €', '0,05 €', '0,01 €', '0,15 €'], answer: 1, explanation: 'Balle 0,05 € + batte 1,05 € = 1,10 €.' },
  { category: 'enigme', question: 'Qu’est-ce qui t’appartient mais que les autres utilisent plus que toi ?', choices: ['Ton téléphone', 'Ton prénom', 'Ta voiture', 'Ton temps'], answer: 1 },
  { category: 'enigme', question: 'Je commence la nuit et je termine le matin. Qui suis-je ?', choices: ['Le sommeil', 'La lettre N', 'La lune', 'Un rêve'], answer: 1 },
  { category: 'enigme', question: '5 machines fabriquent 5 objets en 5 minutes. Combien de temps faut-il à 100 machines pour fabriquer 100 objets ?', choices: ['5 minutes', '20 minutes', '100 minutes', '1 minute'], answer: 0 },
  { category: 'enigme', question: 'Un fermier a 17 moutons. Tous sauf 9 meurent. Combien en reste-t-il ?', choices: ['8', '9', '17', '0'], answer: 1 },

  // 🪤 Pièges & questions « scolaires »
  { category: 'piege', question: 'Combien de mois de l’année comptent 28 jours ?', choices: ['1', '2', '6', '12'], answer: 3, explanation: 'Tous les mois ont au moins 28 jours !' },
  { category: 'piege', question: 'Combien font 8 ÷ 2 × (2 + 2) ?', choices: ['1', '16', '8', '4'], answer: 1, explanation: 'Parenthèses d’abord, puis division et multiplication de gauche à droite : 4 × 4 = 16.' },
  { category: 'piege', question: 'Quelle est la capitale du Canada ?', choices: ['Toronto', 'Montréal', 'Ottawa', 'Vancouver'], answer: 2 },
  { category: 'piege', question: 'Complète : « Les fleurs que j’ai … »', choices: ['cueilli', 'cueillies', 'cueillis', 'cueillie'], answer: 1, explanation: 'COD placé avant l’auxiliaire avoir : accord avec « les fleurs ».' },
  { category: 'piege', question: 'Quelle est l’orthographe correcte ?', choices: ['Elle s’est rendue compte', 'Elle s’est rendu compte', 'Elle c’est rendu compte', 'Elle s’est rendus compte'], answer: 1, explanation: '« Se rendre compte » : le participe reste invariable.' },
  { category: 'piege', question: 'De quelle couleur est la « boîte noire » d’un avion ?', choices: ['Noire', 'Orange', 'Rouge', 'Grise'], answer: 1, explanation: 'Orange vif, pour être retrouvée facilement.' },
  { category: 'piege', question: 'Combien de temps a duré la guerre de Cent Ans ?', choices: ['100 ans', '116 ans', '99 ans', '105 ans'], answer: 1, explanation: 'De 1337 à 1453.' },
  { category: 'piege', question: 'Dans quel pays les chapeaux « panama » sont-ils fabriqués à l’origine ?', choices: ['Panama', 'Équateur', 'Colombie', 'Mexique'], answer: 1 },
  { category: 'piege', question: 'Quel est le plus grand désert du monde ?', choices: ['Le Sahara', 'Le Gobi', 'L’Antarctique', 'Le Kalahari'], answer: 2, explanation: 'Un désert se définit par le peu de précipitations, pas par la chaleur.' },
  { category: 'piege', question: 'Combien de fois peut-on soustraire 10 de 100 ?', choices: ['10 fois', '9 fois', '1 fois', 'À l’infini'], answer: 2, explanation: 'Après la première fois, on soustrait 10 de 90…' },
  { category: 'piege', question: 'Quelle est la formule de l’aire d’un disque ?', choices: ['2πr', 'πr²', 'πd', '2πr²'], answer: 1 },
  { category: 'piege', question: 'Quelle était la taille approximative de Napoléon Ier ?', choices: ['1,52 m', '1,69 m', '1,80 m', '1,60 m'], answer: 1, explanation: 'Taille moyenne pour l’époque : le mythe vient d’une confusion entre pouces français et anglais.' },

  // ───────── Pack 2 ─────────
  // 🌍 Culture générale
  { category: 'culture', question: 'Quelle est la monnaie du Japon ?', choices: ['Le yuan', 'Le won', 'Le yen', 'Le ringgit'], answer: 2 },
  { category: 'culture', question: 'Qui a peint « La Joconde » ?', choices: ['Michel-Ange', 'Léonard de Vinci', 'Raphaël', 'Botticelli'], answer: 1 },
  { category: 'culture', question: 'Quel métal est le meilleur conducteur d’électricité ?', choices: ['Le cuivre', 'L’or', 'L’argent', 'L’aluminium'], answer: 2 },
  { category: 'culture', question: 'Quelle est la capitale du Brésil ?', choices: ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Salvador'], answer: 2 },
  { category: 'culture', question: 'Quel est l’animal national de l’Écosse ?', choices: ['Le lion', 'La licorne', 'Le cerf', 'L’aigle'], answer: 1 },
  { category: 'culture', question: 'Quelle planète possède le plus de lunes connues ?', choices: ['Jupiter', 'Saturne', 'Uranus', 'Neptune'], answer: 1 },
  { category: 'culture', question: 'Qui a écrit « Le Petit Prince » ?', choices: ['Jules Verne', 'Antoine de Saint-Exupéry', 'Albert Camus', 'Marcel Pagnol'], answer: 1 },
  { category: 'culture', question: 'En quelle année a eu lieu la prise de la Bastille ?', choices: ['1776', '1789', '1792', '1804'], answer: 1 },
  { category: 'culture', question: 'Quel est le plus haut sommet des Alpes ?', choices: ['Le mont Rose', 'Le mont Blanc', 'Le Cervin', 'La Barre des Écrins'], answer: 1 },
  { category: 'culture', question: 'Combien de cordes possède une guitare classique ?', choices: ['4', '5', '6', '7'], answer: 2 },
  { category: 'culture', question: 'Quel est le pays le plus peuplé du monde ?', choices: ['La Chine', 'L’Inde', 'Les États-Unis', 'L’Indonésie'], answer: 1, explanation: 'L’Inde a dépassé la Chine en 2023.' },
  { category: 'culture', question: 'Qui a composé « Les Quatre Saisons » ?', choices: ['Mozart', 'Bach', 'Vivaldi', 'Beethoven'], answer: 2 },
  { category: 'culture', question: 'Quel est le plus grand organe du corps humain ?', choices: ['Le foie', 'La peau', 'Les poumons', 'L’intestin'], answer: 1 },
  { category: 'culture', question: 'Quel est le plus grand pays du monde par la superficie ?', choices: ['Le Canada', 'La Chine', 'La Russie', 'Les États-Unis'], answer: 2 },
  { category: 'culture', question: 'Dans quelle ville se trouve la Sagrada Família ?', choices: ['Madrid', 'Séville', 'Barcelone', 'Valence'], answer: 2 },
  { category: 'culture', question: 'Quelle est la vitesse approximative de la lumière ?', choices: ['30 000 km/s', '300 000 km/s', '3 000 000 km/s', '150 000 km/s'], answer: 1 },
  { category: 'culture', question: 'Combien de temps met la lumière du Soleil pour atteindre la Terre ?', choices: ['8 secondes', 'Environ 8 minutes', '8 heures', '1 seconde'], answer: 1 },
  { category: 'culture', question: 'Qui a été le premier humain à marcher sur la Lune ?', choices: ['Buzz Aldrin', 'Neil Armstrong', 'Youri Gagarine', 'Michael Collins'], answer: 1 },
  { category: 'culture', question: 'Quel club a remporté le plus de Ligues des champions ?', choices: ['L’AC Milan', 'Le Bayern Munich', 'Le Real Madrid', 'Liverpool'], answer: 2 },
  { category: 'culture', question: 'En quelle année est sorti le premier iPhone ?', choices: ['2005', '2007', '2009', '2010'], answer: 1 },
  { category: 'culture', question: 'Quel est le fleuve le plus long d’Afrique ?', choices: ['Le Congo', 'Le Niger', 'Le Nil', 'Le Zambèze'], answer: 2 },
  { category: 'culture', question: 'Combien de pattes possède une araignée ?', choices: ['6', '8', '10', '12'], answer: 1 },
  { category: 'culture', question: 'Quel peintre s’est tranché une partie de l’oreille ?', choices: ['Paul Gauguin', 'Vincent van Gogh', 'Claude Monet', 'Pablo Picasso'], answer: 1 },
  { category: 'culture', question: 'Quel est le plus grand mammifère du monde ?', choices: ['L’éléphant d’Afrique', 'La baleine bleue', 'La girafe', 'Le cachalot'], answer: 1 },
  { category: 'culture', question: 'Dans quel pays sont nés les Jeux olympiques antiques ?', choices: ['L’Italie', 'L’Égypte', 'La Grèce', 'La Turquie'], answer: 2 },

  // 🧩 Énigmes
  { category: 'enigme', question: 'Plus il y en a, moins on voit. Qu’est-ce que c’est ?', choices: ['Le vent', 'L’obscurité', 'La lumière', 'La pluie'], answer: 1 },
  { category: 'enigme', question: 'Qu’est-ce qui a des dents mais ne mord jamais ?', choices: ['Un peigne', 'Un requin', 'Un chien', 'Un crocodile'], answer: 0 },
  { category: 'enigme', question: 'Qu’est-ce qui se mouille en séchant ?', choices: ['Une éponge', 'Une serviette', 'Un parapluie', 'Le linge'], answer: 1 },
  { category: 'enigme', question: 'C’est l’enfant de tes parents, mais ce n’est ni ton frère ni ta sœur. Qui est-ce ?', choices: ['Ton cousin', 'Toi-même', 'Ton oncle', 'Ton neveu'], answer: 1 },
  { category: 'enigme', question: 'Quel nombre complète la suite : 3, 9, 27, 81, … ?', choices: ['162', '243', '324', '729'], answer: 1, explanation: 'On multiplie par 3 à chaque fois.' },
  { category: 'enigme', question: 'Quel nombre complète la suite : 1, 4, 9, 16, 25, … ?', choices: ['30', '34', '36', '49'], answer: 2, explanation: 'Ce sont les carrés : 6 × 6 = 36.' },
  { category: 'enigme', question: 'Quelle lettre complète la suite : J, F, M, A, M, J, J, … ?', choices: ['S', 'A', 'O', 'N'], answer: 1, explanation: 'Les initiales des mois : … juin, juillet, août.' },
  { category: 'enigme', question: 'Quelle lettre complète la suite : L, M, M, J, V, S, … ?', choices: ['L', 'D', 'S', 'M'], answer: 1, explanation: 'Les jours de la semaine : … samedi, dimanche.' },
  { category: 'enigme', question: 'Un escargot au fond d’un puits de 10 m monte de 3 m le jour et redescend de 2 m la nuit. En combien de jours sort-il ?', choices: ['7 jours', '8 jours', '10 jours', '12 jours'], answer: 1, explanation: 'Au matin du 8ᵉ jour il est à 7 m : il grimpe ses 3 m et sort avant de redescendre.' },
  { category: 'enigme', question: 'Si 3 chats attrapent 3 souris en 3 minutes, combien faut-il de chats pour attraper 100 souris en 100 minutes ?', choices: ['3', '33', '100', '300'], answer: 0, explanation: 'Chaque chat attrape une souris toutes les 3 minutes.' },
  { category: 'enigme', question: 'Je suis toujours devant toi mais tu ne peux jamais me voir. Qui suis-je ?', choices: ['Ton ombre', 'L’avenir', 'L’horizon', 'Le vent'], answer: 1 },
  { category: 'enigme', question: 'Qu’est-ce qui peut remplir une pièce sans prendre de place ?', choices: ['L’air', 'La lumière', 'L’eau', 'Un meuble gonflable'], answer: 1 },
  { category: 'enigme', question: 'Un père et son fils ont 36 ans à eux deux. Le père a 30 ans de plus que son fils. Quel âge a le fils ?', choices: ['6 ans', '3 ans', '4 ans', '5 ans'], answer: 1, explanation: 'Fils 3 ans + père 33 ans = 36 ans.' },
  { category: 'enigme', question: 'Combien de fois la lettre « a » apparaît-elle dans « abracadabra » ?', choices: ['3', '4', '5', '6'], answer: 2, explanation: 'A-br-A-c-A-d-A-br-A.' },

  // 🪤 Pièges & questions « scolaires »
  { category: 'piege', question: 'Un avion s’écrase pile sur la frontière franco-espagnole. Où enterre-t-on les survivants ?', choices: ['En France', 'En Espagne', 'Dans leur pays d’origine', 'On n’enterre pas les survivants'], answer: 3 },
  { category: 'piege', question: 'Combien d’animaux de chaque espèce Moïse a-t-il emmenés dans l’arche ?', choices: ['1', '2', '7', 'Aucun'], answer: 3, explanation: 'C’est Noé qui a construit l’arche, pas Moïse !' },
  { category: 'piege', question: 'Quel est le pluriel de « festival » ?', choices: ['Des festivaux', 'Des festivals', 'Des festivales', 'Des festivaus'], answer: 1, explanation: 'Comme bal, carnaval, chacal, récital, régal…' },
  { category: 'piege', question: 'Quel est le pluriel de « bijou » ?', choices: ['Des bijous', 'Des bijoux', 'Des bijoues', 'Des bijou'], answer: 1, explanation: 'Bijou, caillou, chou, genou, hibou, joujou, pou prennent un x.' },
  { category: 'piege', question: 'Complète : « Il faut que tu … à l’heure. »', choices: ['viens', 'viennes', 'viendras', 'venais'], answer: 1, explanation: '« Il faut que » est suivi du subjonctif.' },
  { category: 'piege', question: 'Combien font 15 % de 200 ?', choices: ['15', '20', '30', '35'], answer: 2 },
  { category: 'piege', question: 'Combien vaut 2 puissance 10 ?', choices: ['512', '1 000', '1 024', '2 048'], answer: 2 },
  { category: 'piege', question: 'Combien d’arêtes possède un cube ?', choices: ['8', '10', '12', '16'], answer: 2 },
  { category: 'piege', question: 'Combien y a-t-il de secondes dans une journée ?', choices: ['36 000', '86 400', '864 000', '3 600'], answer: 1, explanation: '24 × 60 × 60 = 86 400.' },
  { category: 'piege', question: 'Lequel de ces animaux n’est PAS un mammifère ?', choices: ['Le dauphin', 'La chauve-souris', 'Le manchot', 'La baleine'], answer: 2, explanation: 'Le manchot est un oiseau.' },
  { category: 'piege', question: 'D’un point de vue botanique, la tomate est…', choices: ['Un légume', 'Un fruit', 'Une céréale', 'Une racine'], answer: 1 },
  { category: 'piege', question: 'Quelle est la capitale fédérale de la Suisse ?', choices: ['Genève', 'Zurich', 'Berne', 'Lausanne'], answer: 2 },
  { category: 'piege', question: 'Quelle est la capitale de la Nouvelle-Zélande ?', choices: ['Auckland', 'Wellington', 'Christchurch', 'Queenstown'], answer: 1 },
  { category: 'piege', question: 'Quelle est la capitale de la Turquie ?', choices: ['Istanbul', 'Ankara', 'Izmir', 'Antalya'], answer: 1 },
  { category: 'piege', question: 'Combien de zéros compte un milliard ?', choices: ['6', '8', '9', '12'], answer: 2 },
  { category: 'piege', question: 'Combien de jours compte une année bissextile ?', choices: ['364', '365', '366', '367'], answer: 2 },
  { category: 'piege', question: 'À quelle température l’eau bout-elle au niveau de la mer ?', choices: ['90 °C', '100 °C', '110 °C', '120 °C'], answer: 1 },
  { category: 'piege', question: 'Quel astre est le plus proche de la Terre ?', choices: ['Le Soleil', 'Mars', 'La Lune', 'Vénus'], answer: 2 },
  { category: 'piege', question: 'Quelle est la valeur de π arrondie au centième ?', choices: ['3,12', '3,14', '3,16', '3,41'], answer: 1 },
  { category: 'piege', question: 'Si tu doubles le 2ᵉ d’une course, à quelle place es-tu ?', choices: ['1ʳᵉ', '2ᵉ', '3ᵉ', 'Dernière'], answer: 1, explanation: 'Tu prends sa place : tu es 2ᵉ, pas 1ᵉʳ !' },
];
