/**
 * « Qui suis-je ? » : des indices dévoilés un par un, du plus vague au plus évident.
 * Personnalités réelles, personnages de fiction et œuvres (films, jeux, chansons, tableaux…).
 */
export type WhoCategory = 'perso' | 'fiction' | 'oeuvre';

export interface WhoItem {
  name: string;
  cat: WhoCategory;
  /** Autres réponses acceptées */
  aliases?: string[];
  /** Du moins utile au plus révélateur */
  clues: string[];
}

const p = (name: string, aliases: string[], clues: string[]): WhoItem => ({ name, cat: 'perso', aliases, clues });
const f = (name: string, aliases: string[], clues: string[]): WhoItem => ({ name, cat: 'fiction', aliases, clues });
const o = (name: string, aliases: string[], clues: string[]): WhoItem => ({ name, cat: 'oeuvre', aliases, clues });

export const WHO_ITEMS: WhoItem[] = [
  // — Personnalités —
  p('Dimitri Payet', ['Payet'], [
    'Je suis né le 29 mars 1987.',
    'Je viens de l’île de La Réunion.',
    'J’ai joué à Nantes, Saint-Étienne et Lille.',
    'J’ai aussi porté le maillot de West Ham en Angleterre.',
    'J’ai marqué un but magnifique lors du match d’ouverture de l’Euro 2016 contre la Roumanie.',
    'J’ai été le numéro 10 et l’idole du Vélodrome à l’OM.',
  ]),
  p('Ninho', [], [
    'Je suis né en 1996 en Île-de-France.',
    'J’ai des origines congolaises.',
    'Mon vrai nom est William Nzobazola.',
    'Je suis l’un des artistes les plus certifiés de l’histoire en France.',
    'Mes albums s’appellent « Destin » et « Jefe ».',
    'Je suis rappeur et j’ai chanté « Lettre à une femme ».',
  ]),
  p('Franck Dubosc', ['Dubosc'], [
    'Je suis né en 1963 en Normandie.',
    'J’ai joué des spectacles comme « Pour toi public » et « Romantique ».',
    'Je suis humoriste et acteur.',
    'J’ai réalisé le film « Tout le monde debout » en 2018.',
    'Mon personnage le plus célèbre porte un slip de bain moulant.',
    'Je suis Patrick Chirac dans « Camping ».',
  ]),
  p('LeBron James', ['LeBron', 'King James'], [
    'Je suis né le 30 décembre 1984 à Akron, dans l’Ohio.',
    'J’ai été choisi en 1re position de la draft en 2003.',
    'J’ai été champion avec Miami, Cleveland et Los Angeles.',
    'Je suis le meilleur marqueur de l’histoire de la NBA.',
    'On me surnomme « King James ».',
  ]),
  p('Randy Orton', ['Orton'], [
    'Je suis né le 1er avril 1980 dans le Tennessee.',
    'Mon père, « Cowboy » Bob Orton, faisait le même métier que moi.',
    'J’ai fait partie du clan Evolution avec Triple H et Ric Flair.',
    'On me surnomme « The Viper ».',
    'Je suis catcheur à la WWE et ma prise finale est le RKO.',
  ]),
  p('ZywOo', ['Zywoo', 'Mathieu Herbaut'], [
    'Je suis né le 9 novembre 2000.',
    'Je suis français et mon vrai nom est Mathieu Herbaut.',
    'Je suis joueur professionnel d’e-sport.',
    'J’ai été élu meilleur joueur du monde par HLTV.',
    'Je joue chez Team Vitality et j’ai gagné le Major de Paris en 2023.',
    'Je suis une star de Counter-Strike.',
  ]),
  p('Domingo', [], [
    'Je suis un créateur de contenu français.',
    'Mon vrai nom est Pierre-Alexis Bizot.',
    'Je suis streamer sur Twitch.',
    'J’anime l’émission « Popcorn ».',
  ]),
  p('Denis Brogniart', ['Brogniart'], [
    'Je suis journaliste sportif.',
    'Je travaille sur TF1.',
    'J’ai aussi présenté « Ninja Warrior ».',
    'Mon « Ah ! » est devenu célèbre.',
    'Je présente Koh-Lanta depuis 2001.',
  ]),
  p('Bruce Grannec', ['Grannec'], [
    'Je suis français.',
    'Je suis joueur professionnel d’e-sport.',
    'J’ai été sacré champion du monde en 2009 et en 2013.',
    'Mon jeu est une simulation de football d’EA Sports.',
    'Je suis l’un des plus grands joueurs de l’histoire de FIFA.',
  ]),
  p('Magnus Carlsen', ['Carlsen'], [
    'Je suis né le 30 novembre 1990.',
    'Je viens de Norvège.',
    'Je suis devenu grand maître à 13 ans.',
    'J’ai été champion du monde de 2013 à 2023.',
    'Je détiens le record du classement Elo aux échecs.',
  ]),
  p('Zinédine Zidane', ['Zidane', 'Zizou'], [
    'Je suis né le 23 juin 1972.',
    'Je suis né à Marseille, dans le quartier de la Castellane.',
    'J’ai joué à Cannes, Bordeaux, la Juventus et le Real Madrid.',
    'J’ai gagné le Ballon d’Or en 1998.',
    'J’ai donné un coup de tête à Materazzi en finale de la Coupe du monde 2006.',
    'J’ai marqué deux buts de la tête en finale de la Coupe du monde 1998.',
  ]),
  p('Kylian Mbappé', ['Mbappé', 'Mbappe'], [
    'Je suis né le 20 décembre 1998.',
    'J’ai grandi à Bondy.',
    'J’ai été formé à Monaco.',
    'J’ai été champion du monde en 2018.',
    'J’ai marqué un triplé en finale de la Coupe du monde 2022.',
    'J’ai quitté le PSG pour le Real Madrid en 2024.',
  ]),
  p('Teddy Riner', ['Riner'], [
    'Je suis né le 7 avril 1989.',
    'Je viens de Guadeloupe.',
    'Je mesure plus de 2 mètres.',
    'J’ai remporté 11 titres de champion du monde.',
    'J’ai été champion olympique en 2012, 2016 et 2024.',
    'Je suis judoka.',
  ]),
  p('Céline Dion', ['Celine Dion'], [
    'Je suis née le 30 mars 1968.',
    'Je viens du Québec.',
    'J’ai gagné l’Eurovision en 1988 en représentant la Suisse.',
    'J’ai chanté sur la tour Eiffel à la cérémonie d’ouverture des JO de Paris 2024.',
    'Ma chanson « My Heart Will Go On » est la musique du film Titanic.',
  ]),
  p('Napoléon Bonaparte', ['Napoléon', 'Napoleon', 'Bonaparte'], [
    'Je suis né en 1769.',
    'Je suis né à Ajaccio.',
    'J’ai gagné la bataille d’Austerlitz.',
    'Je me suis sacré empereur des Français en 1804.',
    'J’ai été battu à Waterloo et je suis mort en exil à Sainte-Hélène.',
  ]),
  p('Albert Einstein', ['Einstein'], [
    'Je suis né en 1879 à Ulm, en Allemagne.',
    'J’ai reçu le prix Nobel de physique en 1921.',
    'J’ai fui l’Allemagne nazie pour les États-Unis.',
    'On me représente souvent tirant la langue.',
    'Je suis l’auteur de la théorie de la relativité et de E = mc².',
  ]),
  p('Jul', [], [
    'Je suis né en 1990.',
    'Je suis l’un des artistes qui vendent le plus de disques en France.',
    'Mon label s’appelle « D’or et de platine ».',
    'J’ai lancé le projet collectif « 13’Organisé ».',
    'Je suis un rappeur de Marseille.',
  ]),
  p('Squeezie', ['Lucas Hauchard'], [
    'Je suis né le 27 janvier 1996.',
    'Mon vrai nom est Lucas Hauchard.',
    'J’ai commencé par des vidéos de jeux vidéo.',
    'J’organise le GP Explorer, une course automobile entre vidéastes.',
    'Je suis le youtubeur le plus suivi de France.',
  ]),
  p('Thomas Pesquet', ['Pesquet'], [
    'Je suis né en 1978 à Rouen.',
    'J’ai été pilote de ligne chez Air France.',
    'Je travaille pour l’Agence spatiale européenne.',
    'Mes missions s’appelaient « Proxima » et « Alpha ».',
    'Je suis astronaute et j’ai vécu à bord de la Station spatiale internationale.',
  ]),
  p('Michael Jordan', ['Jordan', 'MJ'], [
    'Je suis né en 1963 à Brooklyn.',
    'J’ai joué au baseball pendant une saison.',
    'J’ai joué avec des personnages des Looney Tunes dans un film.',
    'J’ai gagné 6 titres NBA avec les Chicago Bulls.',
    'Mes baskets Nike portent mon nom : les « Air Jordan ».',
  ]),
  p('Usain Bolt', ['Bolt'], [
    'Je suis né en 1986.',
    'Je viens de Jamaïque.',
    'J’ai remporté 8 médailles d’or olympiques.',
    'Ma pose de célébration imite un éclair.',
    'Je détiens le record du monde du 100 m en 9 s 58.',
  ]),

  // — Personnages de fiction —
  f('Barney Stinson', ['Barney'], [
    'Je suis un personnage d’une série américaine diffusée de 2005 à 2014.',
    'Je travaille chez GNB, mais personne ne sait vraiment ce que je fais.',
    'J’ai écrit un « Playbook » plein de techniques de drague.',
    'Mon expression favorite est « Suit up ! ».',
    'Je suis joué par Neil Patrick Harris dans How I Met Your Mother.',
  ]),
  f('Walter White', ['Heisenberg', 'Walt'], [
    'J’habite à Albuquerque, au Nouveau-Mexique.',
    'J’étais professeur de chimie au lycée.',
    'J’apprends que j’ai un cancer du poumon.',
    'Je me fais appeler Heisenberg.',
    'Je suis joué par Bryan Cranston dans Breaking Bad.',
  ]),
  f('Bree Van de Kamp', ['Bree'], [
    'Je suis un personnage de série télévisée.',
    'J’ai les cheveux roux et j’aime que tout soit parfait.',
    'Je cuisine à merveille et ma maison est impeccable.',
    'Mon fils s’appelle Andrew.',
    'J’habite Wisteria Lane dans Desperate Housewives.',
  ]),
  f('Scooby-Doo', ['Scooby', 'Scooby Doo'], [
    'Je suis né en 1969 dans un dessin animé.',
    'Je suis un dogue allemand.',
    'Je voyage dans une camionnette appelée la Mystery Machine.',
    'Mon meilleur ami s’appelle Sammy.',
    'J’adore les Scooby Snacks.',
  ]),
  f('Iron Man', ['Tony Stark', 'Ironman'], [
    'Je suis apparu dans un comic en 1963.',
    'Je suis un génie, milliardaire et playboy.',
    'J’ai une source d’énergie dans la poitrine.',
    'Robert Downey Jr. m’a joué au cinéma.',
    'Je m’appelle Tony Stark.',
  ]),
  f('Spider-Man', ['Spiderman', 'Peter Parker'], [
    'J’habite dans le Queens, à New York.',
    'Mon oncle Ben m’a appris qu’un grand pouvoir implique de grandes responsabilités.',
    'Tobey Maguire, Andrew Garfield et Tom Holland m’ont joué au cinéma.',
    'J’ai été mordu par une araignée.',
    'Je m’appelle Peter Parker.',
  ]),
  f('Jack Sparrow', ['Jack', 'Capitaine Jack Sparrow'], [
    'Je suis apparu au cinéma en 2003.',
    'J’adore le rhum.',
    'Mon navire s’appelle le Black Pearl.',
    'Je suis joué par Johnny Depp.',
    'Je suis le capitaine de Pirates des Caraïbes.',
  ]),
  f('Ulysse', ['Odysseus', 'Ulysses'], [
    'Je suis un héros de la mythologie grecque.',
    'Je suis roi d’Ithaque.',
    'Ma femme Pénélope m’attend pendant 20 ans.',
    'J’ai aveuglé le cyclope Polyphème.',
    'J’ai eu l’idée du cheval de Troie et Homère a raconté mon retour dans l’Odyssée.',
  ]),
  f('Woody', ['Woody Toy Story', 'Shérif Woody'], [
    'Je suis apparu au cinéma en 1995.',
    'Je suis un cow-boy.',
    'J’appartiens à un garçon nommé Andy.',
    'Mon meilleur ami est un ranger de l’espace.',
    'Je suis le shérif de Toy Story.',
  ]),
  f('Homer Simpson', ['Homer'], [
    'J’habite à Springfield.',
    'Je travaille à la centrale nucléaire.',
    'J’adore la bière Duff et les donuts.',
    'Ma femme a des cheveux bleus très hauts.',
    'Je dis souvent « D’oh ! ».',
  ]),
  f('Harry Potter', ['Harry'], [
    'Je suis né un 31 juillet.',
    'J’ai grandi dans un placard sous l’escalier.',
    'J’ai une cicatrice en forme d’éclair sur le front.',
    'Je suis élève à Poudlard.',
    'Je suis « le garçon qui a survécu ».',
  ]),
  f('Sherlock Holmes', ['Sherlock', 'Holmes'], [
    'Je suis né sous la plume d’un écrivain écossais.',
    'Je joue du violon.',
    'J’habite au 221B Baker Street, à Londres.',
    'Mon fidèle ami s’appelle le docteur Watson.',
    'Je suis le plus célèbre des détectives.',
  ]),
  f('Mario', ['Super Mario'], [
    'Je suis apparu en 1981 dans un jeu d’arcade.',
    'Je suis plombier.',
    'J’ai une casquette rouge et une moustache.',
    'Mon frère s’appelle Luigi.',
    'Je sauve la princesse Peach dans les jeux Nintendo.',
  ]),
  f('Dark Vador', ['Darth Vader', 'Vador', 'Anakin Skywalker'], [
    'Je suis apparu au cinéma en 1977.',
    'Je respire bruyamment.',
    'Je porte un casque et une armure noirs.',
    'Je m’appelais Anakin Skywalker.',
    'J’ai dit : « Je suis ton père. »',
  ]),
  f('Astérix', ['Asterix'], [
    'Je suis né en 1959 dans un journal.',
    'Je vis en 50 avant Jésus-Christ.',
    'Je suis petit, mais très malin.',
    'Mon meilleur ami livre des menhirs.',
    'Je suis un Gaulois qui boit de la potion magique.',
  ]),
  f('James Bond', ['Bond', '007'], [
    'Je suis né sous la plume de Ian Fleming.',
    'Je travaille pour le MI6.',
    'J’aime mon martini « au shaker, pas à la cuillère ».',
    'Sean Connery, Pierce Brosnan et Daniel Craig m’ont joué.',
    'Mon matricule est 007.',
  ]),
  f('Bob l’éponge', ['Bob leponge', 'SpongeBob', 'Bob'], [
    'Je suis apparu à la télévision en 1999.',
    'Je travaille au Crabe Croustillant.',
    'J’habite dans un ananas sous la mer.',
    'Mon meilleur ami Patrick est une étoile de mer.',
    'Je suis une éponge jaune et carrée.',
  ]),
  f('Lara Croft', ['Lara'], [
    'Je suis apparue en 1996.',
    'Je suis une aristocrate britannique.',
    'Je suis archéologue et aventurière.',
    'Angelina Jolie m’a jouée au cinéma.',
    'Je suis l’héroïne de Tomb Raider.',
  ]),

  // — Œuvres —
  o('La Joconde', ['Mona Lisa', 'Joconde'], [
    'Je suis une œuvre du début du XVIe siècle.',
    'J’ai été volée en 1911, puis retrouvée deux ans plus tard.',
    'Je suis exposée au musée du Louvre.',
    'Je suis un portrait de femme au sourire mystérieux.',
    'J’ai été peinte par Léonard de Vinci.',
  ]),
  o('Minecraft', [], [
    'Je suis un jeu vidéo sorti au début des années 2010.',
    'J’ai été créé par un Suédois surnommé « Notch ».',
    'Microsoft m’a racheté en 2014.',
    'Je suis le jeu vidéo le plus vendu de l’histoire.',
    'Mon monde est fait de cubes et les Creepers y explosent.',
  ]),
  o('Titanic', [], [
    'Je suis un film sorti en 1997.',
    'J’ai remporté 11 Oscars.',
    'J’ai été réalisé par James Cameron.',
    'Leonardo DiCaprio et Kate Winslet sont mes héros.',
    'Je raconte le naufrage d’un paquebot en 1912.',
  ]),
  o('Bohemian Rhapsody', [], [
    'Je suis une chanson sortie en 1975.',
    'Je dure environ 6 minutes et n’ai pas de refrain.',
    'Je mélange ballade, opéra et hard rock.',
    'On entend « Galileo » et « Scaramouche » dans mes paroles.',
    'Je suis une chanson de Queen, chantée par Freddie Mercury.',
  ]),
  o('Friends', [], [
    'Je suis une série diffusée de 1994 à 2004.',
    'J’ai 10 saisons.',
    'Mes héros vivent à New York.',
    'Ils se retrouvent au café Central Perk.',
    'Je raconte l’histoire de Rachel, Ross, Monica, Chandler, Joey et Phoebe.',
  ]),
  o('Les Misérables', ['Miserables'], [
    'Je suis une œuvre publiée en 1862.',
    'Mon auteur était exilé à Guernesey.',
    'On y croise Javert, Gavroche et les Thénardier.',
    'Mon héros, un ancien bagnard, adopte Cosette.',
    'Je suis le grand roman de Victor Hugo sur Jean Valjean.',
  ]),
  o('Tetris', [], [
    'Je suis un jeu vidéo créé en 1984.',
    'J’ai été inventé en Union soviétique par Alexeï Pajitnov.',
    'J’ai été un énorme succès sur la Game Boy.',
    'On doit compléter des lignes pour les faire disparaître.',
    'Mes pièces sont faites de quatre carrés qui tombent.',
  ]),
  o('Le Cri', ['Cri', 'The Scream'], [
    'Je suis une œuvre de 1893.',
    'Mon auteur était un peintre norvégien.',
    'Il existe plusieurs versions de moi.',
    'On voit un ciel rouge orangé au-dessus d’un pont.',
    'On y voit un personnage qui se tient le visage, bouche grande ouverte.',
    'Je suis le tableau le plus célèbre d’Edvard Munch.',
  ]),
  o('Thriller', [], [
    'Je suis un album sorti en 1982.',
    'Je suis l’album le plus vendu de l’histoire.',
    'Mon clip de 14 minutes a révolutionné le genre.',
    'Des zombies dansent dans ce clip.',
    'Je suis l’album culte de Michael Jackson.',
  ]),
];
