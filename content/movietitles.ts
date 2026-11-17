/**
 * « Devine le film » : un titre de film tel qu'il est sorti ailleurs (Québec, Espagne, pays anglophones),
 * différent du titre français. Il faut retrouver le titre français (ou original) du film.
 */
export type TitleLang = 'qc' | 'es' | 'en';

export interface MovieTitle {
  /** Titre étranger affiché */
  foreign: string;
  lang: TitleLang;
  /** Titre en France (la réponse) */
  answer: string;
  /** Autres réponses acceptées (titre original…) */
  aliases?: string[];
  year: number;
}

const qc = (foreign: string, answer: string, year: number, aliases: string[] = []): MovieTitle => ({ foreign, lang: 'qc', answer, year, aliases });
const es = (foreign: string, answer: string, year: number, aliases: string[] = []): MovieTitle => ({ foreign, lang: 'es', answer, year, aliases });
const en = (foreign: string, answer: string, year: number, aliases: string[] = []): MovieTitle => ({ foreign, lang: 'en', answer, year, aliases });

export const MOVIE_TITLES: MovieTitle[] = [
  // — 🇨🇦 Titres québécois —
  qc('Fiction pulpeuse', 'Pulp Fiction', 1994),
  qc('Lendemain de veille', 'Very Bad Trip', 2009, ['The Hangover']),
  qc('Pris au piège', 'Piège de cristal', 1988, ['Die Hard']),
  qc('Folies de graduation', 'American Pie', 1999),
  qc('Film de peur', 'Scary Movie', 2000),
  qc('Serpents à bord', 'Des serpents dans l’avion', 2006, ['Snakes on a Plane']),
  qc('Rapides et dangereux', 'Fast and Furious', 2001, ['Fast & Furious', 'The Fast and the Furious']),
  qc('Histoire de jouets', 'Toy Story', 1995),
  qc('Trouver Nemo', 'Le Monde de Nemo', 2003, ['Finding Nemo']),
  qc('Trouver Doris', 'Le Monde de Dory', 2016, ['Finding Dory']),
  qc('Les Incroyables', 'Les Indestructibles', 2004, ['The Incredibles']),
  qc('Les Bagnoles', 'Cars', 2006),
  qc('Détestable moi', 'Moi, moche et méchant', 2010, ['Despicable Me']),
  qc('Sens dessus dessous', 'Vice-versa', 2015, ['Inside Out']),
  qc('Ralph la casse', 'Les Mondes de Ralph', 2012, ['Wreck-It Ralph']),
  qc('La Cloche et l’Idiot', 'Dumb & Dumber', 1994, ['Dumb and Dumber']),
  qc('Méchantes ados', 'Lolita malgré moi', 2004, ['Mean Girls']),
  qc('Blonde et légale', 'La Revanche d’une blonde', 2001, ['Legally Blonde']),
  qc('Désemparées', 'Clueless', 1995),
  qc('La Matrice', 'Matrix', 1999, ['The Matrix']),
  qc('Seul à la maison', 'Maman, j’ai raté l’avion', 1990, ['Home Alone']),
  qc('Rencontre avec les parents', 'Mon beau-père et moi', 2000, ['Meet the Parents']),
  qc('Puceau à 40 ans', '40 ans, toujours puceau', 2005, ['The 40-Year-Old Virgin']),
  qc('Grossesse surprise', 'En cloque, mode d’emploi', 2007, ['Knocked Up']),
  qc('Demoiselles d’honneur', 'Mes meilleures amies', 2011, ['Bridesmaids']),
  qc('Demi-frères', 'Frangins malgré eux', 2008, ['Step Brothers']),
  qc('Ananas Express', 'Délire Express', 2008, ['Pineapple Express']),
  qc('L’Agent fait la farce', 'Y a-t-il un flic pour sauver la reine ?', 1988, ['The Naked Gun', 'Y a-t-il un flic']),
  qc('Le Réseau social', 'The Social Network', 2010),
  qc('Origine', 'Inception', 2010),
  qc('Le Chevalier noir', 'The Dark Knight', 2008),
  qc('Au seuil de demain', 'Edge of Tomorrow', 2014),
  qc('Le Parc jurassique', 'Jurassic Park', 1993),
  qc('L’Ère de glace', 'L’Âge de glace', 2002, ['Ice Age']),
  qc('Poulets en fuite', 'Chicken Run', 2000),
  qc('Il pleut des hamburgers', 'Tempête de boulettes géantes', 2009, ['Cloudy with a Chance of Meatballs']),
  qc('Âme', 'Soul', 2020),
  qc('Le Jour de la marmotte', 'Un jour sans fin', 1993, ['Groundhog Day']),
  qc('Mon ami Willy', 'Sauvez Willy', 1993, ['Free Willy']),
  qc('Chérie, j’ai réduit les enfants', 'Chérie, j’ai rétréci les gosses', 1989, ['Honey, I Shrunk the Kids']),
  qc('Du soleil plein la tête', 'Eternal Sunshine of the Spotless Mind', 2004, ['Eternal Sunshine']),
  qc('Traduction infidèle', 'Lost in Translation', 2003),
  qc('Non, ce pays n’est pas pour le vieil homme', 'No Country for Old Men', 2007),
  qc('Il y aura du sang', 'There Will Be Blood', 2007),
  qc('Mad Max : La route du chaos', 'Mad Max: Fury Road', 2015, ['Fury Road']),
  qc('Le Revenant', 'The Revenant', 2015),
  qc('Sexe à New York', 'Sex and the City', 2008),

  // — 🇪🇸 Titres espagnols —
  es('La jungla de cristal', 'Piège de cristal', 1988, ['Die Hard']),
  es('Tiburón', 'Les Dents de la mer', 1975, ['Jaws']),
  es('Resacón en Las Vegas', 'Very Bad Trip', 2009, ['The Hangover']),
  es('Solo en casa', 'Maman, j’ai raté l’avion', 1990, ['Home Alone']),
  es('Atrapado en el tiempo', 'Un jour sans fin', 1993, ['Groundhog Day']),
  es('Aterriza como puedas', 'Y a-t-il un pilote dans l’avion ?', 1980, ['Airplane', 'Y a-t-il un pilote']),
  es('Los cazafantasmas', 'SOS Fantômes', 1984, ['Ghostbusters']),
  es('Sonrisas y lágrimas', 'La Mélodie du bonheur', 1965, ['The Sound of Music']),
  es('Con faldas y a lo loco', 'Certains l’aiment chaud', 1959, ['Some Like It Hot']),
  es('Dos tontos muy tontos', 'Dumb & Dumber', 1994, ['Dumb and Dumber']),
  es('Cadena perpetua', 'Les Évadés', 1994, ['The Shawshank Redemption']),
  es('Olvídate de mí', 'Eternal Sunshine of the Spotless Mind', 2004, ['Eternal Sunshine']),

  // — 🇬🇧 Titres anglais de films français —
  en('Welcome to the Sticks', 'Bienvenue chez les Ch’tis', 2008, ['Les Chtis', 'Bienvenue chez les Chtis']),
  en('The Dinner Game', 'Le Dîner de cons', 1998),
  en('The Closet', 'Le Placard', 2001),
  en('Serial (Bad) Weddings', 'Qu’est-ce qu’on a fait au Bon Dieu ?', 2014, ['Qu’est-ce qu’on a fait au Bon Dieu']),
  en('Don’t Look Now… We’re Being Shot At!', 'La Grande Vadrouille', 1966),
  en('French Fried Vacation', 'Les Bronzés', 1978),
  en('French Fried Vacation 2', 'Les Bronzés font du ski', 1979),
  en('Fear City: A Family-Style Comedy', 'La Cité de la peur', 1994),
  en('Santa Claus Is a Stinker', 'Le père Noël est une ordure', 1982),
  en('The Sucker', 'Le Corniaud', 1965),
  en('Hate', 'La Haine', 1995),
  en('The Chorus', 'Les Choristes', 2004),
];
