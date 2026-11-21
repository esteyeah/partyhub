/**
 * « Au plus proche » : une question chiffrée, le plus proche de la bonne réponse marque le plus.
 * `years` : réponse en année (barème en écart absolu) ; sinon barème en écart relatif (%).
 */
export interface ClosestQuestion {
  q: string;
  answer: number;
  unit?: string;
  /** Réponse avec décimales autorisée */
  decimals?: boolean;
  years?: boolean;
}

const y = (q: string, answer: number): ClosestQuestion => ({ q, answer, years: true });
const n = (q: string, answer: number, unit?: string, decimals = false): ClosestQuestion => ({ q, answer, unit, decimals });

export const CLOSEST_QUESTIONS: ClosestQuestion[] = [
  // — Années de naissance —
  y('En quelle année est né Nekfeu ?', 1990),
  y('En quelle année est né Zinédine Zidane ?', 1972),
  y('En quelle année est né Kylian Mbappé ?', 1998),
  y('En quelle année est né Johnny Hallyday ?', 1943),
  y('En quelle année est né Squeezie ?', 1996),
  y('En quelle année est né Jul ?', 1990),
  y('En quelle année est sorti le premier iPhone ?', 2007),
  // — Sport —
  n('Quel est le record du monde du triple saut masculin ?', 18.29, 'm', true),
  n('Quel est le record du monde du 100 m (Usain Bolt) ?', 9.58, 's', true),
  n('Quel est le record du monde du saut en hauteur masculin ?', 2.45, 'm', true),
  n('Combien de kilomètres mesure un marathon ?', 42.195, 'km', true),
  n('Combien de Coupes du monde de football masculines ont été disputées (jusqu’en 2026 inclus) ?', 23),
  n('Combien de Ballons d’Or Lionel Messi a-t-il remportés ?', 8),
  n('Combien de titres du Grand Chelem Rafael Nadal a-t-il remportés ?', 22),
  n('Combien de Tours de France Bernard Hinault a-t-il gagnés ?', 5),
  n('Combien de buts Just Fontaine a-t-il marqués lors de la Coupe du monde 1958 ?', 13),
  n('Combien de places compte le stade Vélodrome de Marseille (environ) ?', 67000, 'places'),
  n('Combien de places compte le Stade de France (environ) ?', 80000, 'places'),
  n('Combien de minutes dure un match de NBA (temps réglementaire) ?', 48, 'min'),
  n('Combien de matchs Dimitri Payet a-t-il disputés avec l’OM ?', 326, 'matchs'),
  // — Séries, jeux, culture —
  n('Combien d’épisodes compte la série Friends ?', 236, 'épisodes'),
  n('Combien d’épisodes compte How I Met Your Mother ?', 208, 'épisodes'),
  n('Combien de saisons compte Game of Thrones ?', 8, 'saisons'),
  n('Combien de Pokémon compte la première génération ?', 151),
  n('Combien de cases compte un plateau de Monopoly ?', 40, 'cases'),
  n('Combien de touches compte un piano standard ?', 88, 'touches'),
  n('Combien d’étoiles y a-t-il sur le drapeau européen ?', 12, 'étoiles'),
  n('Combien d’années a duré le règne de Louis XIV ?', 72, 'ans'),
  // — Géographie & population —
  n('Combien d’habitants compte le Panama (environ) ?', 4400000, 'habitants'),
  n('Combien d’habitants compte la France (environ) ?', 68500000, 'habitants'),
  n('Combien d’habitants compte la ville de Paris (environ) ?', 2100000, 'habitants'),
  n('Combien de pays sont membres de l’ONU ?', 193, 'pays'),
  n('Combien de pays compte l’Afrique ?', 54, 'pays'),
  n('Combien de départements compte la France ?', 101, 'départements'),
  n('Combien de régions compte la France ?', 18, 'régions'),
  n('Quelle est la superficie de la France métropolitaine (environ) ?', 552000, 'km²'),
  n('Combien de kilomètres mesure la Seine ?', 777, 'km'),
  n('Combien de kilomètres mesure le Nil (environ) ?', 6650, 'km'),
  n('Quelle est la hauteur de la tour Eiffel ?', 330, 'm'),
  n('Quelle est la hauteur de l’Everest ?', 8849, 'm'),
  n('Quelle est la hauteur du mont Blanc ?', 4805, 'm'),
  n('Quelle est la hauteur de la Burj Khalifa ?', 828, 'm'),
  n('Quelle est la profondeur de la fosse des Mariannes (environ) ?', 11000, 'm'),
  // — Sciences —
  n('Combien d’os compte le squelette d’un adulte ?', 206, 'os'),
  n('Combien de dents compte un adulte (dents de sagesse comprises) ?', 32, 'dents'),
  n('Quelle est la distance moyenne entre la Terre et la Lune ?', 384400, 'km'),
  n('Quelle est la température à la surface du Soleil (environ) ?', 5500, '°C'),
  // — Durées de morceaux (en secondes) —
  n('Combien de secondes dure « Bohemian Rhapsody » de Queen ?', 355, 's'),
  n('Combien de secondes dure « Stairway to Heaven » de Led Zeppelin ?', 482, 's'),
  n('Combien de secondes dure « Hey Jude » des Beatles ?', 431, 's'),
  n('Combien de secondes dure « Imagine » de John Lennon ?', 183, 's'),
  n('Combien de secondes dure « Smells Like Teen Spirit » de Nirvana ?', 301, 's'),
  n('Combien de secondes dure « Billie Jean » de Michael Jackson ?', 294, 's'),
  n('Combien de secondes dure « Like a Rolling Stone » de Bob Dylan ?', 373, 's'),
  n('Combien de secondes dure le clip de « Gangnam Style » ?', 252, 's'),
  n('Combien de secondes dure le clip de « Formidable » de Stromae ?', 294, 's'),
  n('Combien de secondes met la lumière du Soleil pour atteindre la Terre (environ) ?', 500, 's'),
  // — Culture générale —
  n('Combien de pattes a une araignée ?', 8, 'pattes'),
  n('Combien de planètes compte le système solaire ?', 8, 'planètes'),
  n('Combien de minutes y a-t-il dans une journée ?', 1440, 'min'),
  n('Combien de chromosomes possède un être humain ?', 46, 'chromosomes'),
  n('Combien de lettres compte l’alphabet français ?', 26, 'lettres'),
  n('Combien d’États composent les États-Unis ?', 50, 'États'),
  n('Combien de joueurs compose une équipe de handball sur le terrain ?', 7, 'joueurs'),
  n('Combien de minutes dure un match de rugby (temps réglementaire) ?', 80, 'min'),
  n('Combien de cordes a un violon ?', 4, 'cordes'),
  n('Combien de cases compte un échiquier ?', 64, 'cases'),
  n('Combien de livres compte la saga Harry Potter (romans principaux) ?', 7, 'livres'),
  n('Combien d’Oscars le film Titanic a-t-il remportés ?', 11, 'Oscars'),
  n('Combien de marches faut-il gravir pour atteindre le sommet de la tour Eiffel ?', 1665, 'marches'),
  n('Quelle est la hauteur de la statue de la Liberté, socle compris (environ) ?', 93, 'm'),
  n('Quelle est la vitesse du son dans l’air (environ) ?', 343, 'm/s'),
  n('Combien de jours dure une année sur Mars (environ) ?', 687, 'jours'),
  n('Combien de mois dure la gestation d’une éléphante (environ) ?', 22, 'mois'),
  n('Quel est l’âge de l’Univers (environ, en milliards d’années) ?', 13.8, 'milliards d’années', true),
  n('Combien d’humains vivent sur Terre (environ, en milliards) ?', 8.2, 'milliards', true),
  n('Quelle est la superficie de la Russie (environ, en millions de km²) ?', 17.1, 'millions de km²', true),
];
