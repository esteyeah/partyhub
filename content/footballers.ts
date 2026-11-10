import type { FootPos, Footballer } from '../shared/types';

/**
 * Base de joueurs pour "Compose ton 11".
 * ⚠️ Notes et prix FICTIFS (inspirés des jeux de foot), clubs indicatifs saison 2025-26 :
 * mets-les à jour librement. `clubs` = clubs actuels ET passés (utilisé par les défis).
 */
type Row = [id: string, name: string, pos: FootPos, nat: string, club: string, league: string, rating: number, price: number, clubs: string[]];

const FLAGS: Record<string, string> = {
  FRA: '🇫🇷', ESP: '🇪🇸', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', BRA: '🇧🇷', ARG: '🇦🇷', POR: '🇵🇹', GER: '🇩🇪', ITA: '🇮🇹', BEL: '🇧🇪', NED: '🇳🇱',
  MAR: '🇲🇦', CRO: '🇭🇷', NOR: '🇳🇴', URU: '🇺🇾', EGY: '🇪🇬', POL: '🇵🇱', SWE: '🇸🇪', GEO: '🇬🇪', NGA: '🇳🇬', SVN: '🇸🇮',
  UKR: '🇺🇦', SUI: '🇨🇭', CAN: '🇨🇦', TUR: '🇹🇷',
};

const ROWS: Row[] = [
  // Gardiens
  ['courtois', 'Thibaut Courtois', 'GK', 'BEL', 'Real Madrid', 'Liga', 89, 35, ['Real Madrid', 'Chelsea', 'Atlético Madrid']],
  ['alisson', 'Alisson Becker', 'GK', 'BRA', 'Liverpool', 'Premier League', 89, 35, ['Liverpool', 'AS Roma']],
  ['donnarumma', 'Gianluigi Donnarumma', 'GK', 'ITA', 'Manchester City', 'Premier League', 88, 40, ['Manchester City', 'PSG', 'AC Milan']],
  ['maignan', 'Mike Maignan', 'GK', 'FRA', 'AC Milan', 'Serie A', 87, 40, ['AC Milan', 'Lille']],
  ['oblak', 'Jan Oblak', 'GK', 'SVN', 'Atlético Madrid', 'Liga', 87, 30, ['Atlético Madrid', 'Benfica']],
  ['emartinez', 'Emiliano Martínez', 'GK', 'ARG', 'Aston Villa', 'Premier League', 86, 25, ['Aston Villa', 'Arsenal']],
  ['kobel', 'Gregor Kobel', 'GK', 'SUI', 'Dortmund', 'Bundesliga', 86, 30, ['Dortmund', 'Stuttgart']],
  ['terstegen', 'Marc-André ter Stegen', 'GK', 'GER', 'FC Barcelone', 'Liga', 85, 20, ['FC Barcelone', 'Mönchengladbach']],
  ['chevalier', 'Lucas Chevalier', 'GK', 'FRA', 'PSG', 'Ligue 1', 82, 30, ['PSG', 'Lille']],
  ['samba', 'Brice Samba', 'GK', 'FRA', 'Rennes', 'Ligue 1', 81, 12, ['Rennes', 'Lens', 'Nottingham Forest']],
  ['lunin', 'Andriy Lunin', 'GK', 'UKR', 'Real Madrid', 'Liga', 80, 10, ['Real Madrid']],

  // Défenseurs
  ['vandijk', 'Virgil van Dijk', 'DEF', 'NED', 'Liverpool', 'Premier League', 89, 40, ['Liverpool', 'Southampton', 'Celtic']],
  ['hakimi', 'Achraf Hakimi', 'DEF', 'MAR', 'PSG', 'Ligue 1', 89, 80, ['PSG', 'Inter', 'Real Madrid', 'Dortmund']],
  ['saliba', 'William Saliba', 'DEF', 'FRA', 'Arsenal', 'Premier League', 88, 80, ['Arsenal', 'Marseille', 'Saint-Étienne']],
  ['dias', 'Rúben Dias', 'DEF', 'POR', 'Manchester City', 'Premier League', 88, 65, ['Manchester City', 'Benfica']],
  ['nmendes', 'Nuno Mendes', 'DEF', 'POR', 'PSG', 'Ligue 1', 87, 70, ['PSG', 'Sporting']],
  ['bastoni', 'Alessandro Bastoni', 'DEF', 'ITA', 'Inter', 'Serie A', 87, 65, ['Inter', 'Atalanta']],
  ['rudiger', 'Antonio Rüdiger', 'DEF', 'GER', 'Real Madrid', 'Liga', 86, 25, ['Real Madrid', 'Chelsea', 'AS Roma']],
  ['taa', 'Trent Alexander-Arnold', 'DEF', 'ENG', 'Real Madrid', 'Liga', 86, 60, ['Real Madrid', 'Liverpool']],
  ['kounde', 'Jules Koundé', 'DEF', 'FRA', 'FC Barcelone', 'Liga', 86, 55, ['FC Barcelone', 'Séville', 'Bordeaux']],
  ['gvardiol', 'Joško Gvardiol', 'DEF', 'CRO', 'Manchester City', 'Premier League', 86, 70, ['Manchester City', 'RB Leipzig']],
  ['marquinhos', 'Marquinhos', 'DEF', 'BRA', 'PSG', 'Ligue 1', 86, 25, ['PSG', 'AS Roma']],
  ['grimaldo', 'Alejandro Grimaldo', 'DEF', 'ESP', 'Leverkusen', 'Bundesliga', 85, 35, ['Leverkusen', 'Benfica', 'FC Barcelone']],
  ['theo', 'Theo Hernández', 'DEF', 'FRA', 'Al-Hilal', 'Saudi Pro League', 85, 35, ['Al-Hilal', 'AC Milan', 'Real Madrid', 'Atlético Madrid']],
  ['konate', 'Ibrahima Konaté', 'DEF', 'FRA', 'Liverpool', 'Premier League', 85, 50, ['Liverpool', 'RB Leipzig', 'Sochaux']],
  ['militao', 'Éder Militão', 'DEF', 'BRA', 'Real Madrid', 'Liga', 85, 40, ['Real Madrid', 'Porto']],
  ['carvajal', 'Dani Carvajal', 'DEF', 'ESP', 'Real Madrid', 'Liga', 84, 12, ['Real Madrid', 'Leverkusen']],
  ['upamecano', 'Dayot Upamecano', 'DEF', 'FRA', 'Bayern Munich', 'Bundesliga', 84, 45, ['Bayern Munich', 'RB Leipzig']],
  ['cubarsi', 'Pau Cubarsí', 'DEF', 'ESP', 'FC Barcelone', 'Liga', 84, 70, ['FC Barcelone']],
  ['davies', 'Alphonso Davies', 'DEF', 'CAN', 'Bayern Munich', 'Bundesliga', 84, 45, ['Bayern Munich']],
  ['lhernandez', 'Lucas Hernandez', 'DEF', 'FRA', 'PSG', 'Ligue 1', 82, 25, ['PSG', 'Bayern Munich', 'Atlético Madrid']],
  ['fmendy', 'Ferland Mendy', 'DEF', 'FRA', 'Real Madrid', 'Liga', 82, 20, ['Real Madrid', 'Lyon', 'Le Havre']],
  ['ramos', 'Sergio Ramos', 'DEF', 'ESP', 'Monterrey', 'Liga MX', 81, 4, ['Monterrey', 'Séville', 'PSG', 'Real Madrid']],
  ['gusto', 'Malo Gusto', 'DEF', 'FRA', 'Chelsea', 'Premier League', 81, 35, ['Chelsea', 'Lyon']],

  // Milieux
  ['rodri', 'Rodri', 'MID', 'ESP', 'Manchester City', 'Premier League', 90, 80, ['Manchester City', 'Atlético Madrid', 'Villarreal']],
  ['bellingham', 'Jude Bellingham', 'MID', 'ENG', 'Real Madrid', 'Liga', 89, 150, ['Real Madrid', 'Dortmund', 'Birmingham']],
  ['pedri', 'Pedri', 'MID', 'ESP', 'FC Barcelone', 'Liga', 89, 110, ['FC Barcelone', 'Las Palmas']],
  ['vitinha', 'Vitinha', 'MID', 'POR', 'PSG', 'Ligue 1', 89, 100, ['PSG', 'Porto', 'Wolverhampton']],
  ['valverde', 'Federico Valverde', 'MID', 'URU', 'Real Madrid', 'Liga', 88, 100, ['Real Madrid']],
  ['rice', 'Declan Rice', 'MID', 'ENG', 'Arsenal', 'Premier League', 88, 100, ['Arsenal', 'West Ham']],
  ['wirtz', 'Florian Wirtz', 'MID', 'GER', 'Liverpool', 'Premier League', 88, 130, ['Liverpool', 'Leverkusen']],
  ['musiala', 'Jamal Musiala', 'MID', 'GER', 'Bayern Munich', 'Bundesliga', 88, 130, ['Bayern Munich']],
  ['jneves', 'João Neves', 'MID', 'POR', 'PSG', 'Ligue 1', 87, 100, ['PSG', 'Benfica']],
  ['odegaard', 'Martin Ødegaard', 'MID', 'NOR', 'Arsenal', 'Premier League', 87, 85, ['Arsenal', 'Real Madrid', 'Real Sociedad']],
  ['kdb', 'Kevin De Bruyne', 'MID', 'BEL', 'Naples', 'Serie A', 87, 25, ['Naples', 'Manchester City', 'Wolfsburg', 'Chelsea']],
  ['barella', 'Nicolò Barella', 'MID', 'ITA', 'Inter', 'Serie A', 87, 70, ['Inter', 'Cagliari']],
  ['palmer', 'Cole Palmer', 'MID', 'ENG', 'Chelsea', 'Premier League', 87, 120, ['Chelsea', 'Manchester City']],
  ['bruno', 'Bruno Fernandes', 'MID', 'POR', 'Manchester United', 'Premier League', 86, 50, ['Manchester United', 'Sporting', 'Sampdoria']],
  ['dejong', 'Frenkie de Jong', 'MID', 'NED', 'FC Barcelone', 'Liga', 86, 50, ['FC Barcelone', 'Ajax']],
  ['tchouameni', 'Aurélien Tchouaméni', 'MID', 'FRA', 'Real Madrid', 'Liga', 85, 70, ['Real Madrid', 'Monaco', 'Bordeaux']],
  ['camavinga', 'Eduardo Camavinga', 'MID', 'FRA', 'Real Madrid', 'Liga', 84, 70, ['Real Madrid', 'Rennes']],
  ['modric', 'Luka Modrić', 'MID', 'CRO', 'AC Milan', 'Serie A', 84, 5, ['AC Milan', 'Real Madrid', 'Tottenham']],
  ['rabiot', 'Adrien Rabiot', 'MID', 'FRA', 'AC Milan', 'Serie A', 84, 20, ['AC Milan', 'Marseille', 'Juventus', 'PSG']],
  ['guler', 'Arda Güler', 'MID', 'TUR', 'Real Madrid', 'Liga', 83, 60, ['Real Madrid', 'Fenerbahçe']],
  ['kante', 'N’Golo Kanté', 'MID', 'FRA', 'Al-Ittihad', 'Saudi Pro League', 82, 8, ['Al-Ittihad', 'Chelsea', 'Leicester', 'Caen']],
  ['kone', 'Manu Koné', 'MID', 'FRA', 'AS Roma', 'Serie A', 82, 40, ['AS Roma', 'Mönchengladbach', 'Toulouse']],
  ['zaireemery', 'Warren Zaïre-Emery', 'MID', 'FRA', 'PSG', 'Ligue 1', 81, 50, ['PSG']],
  ['casemiro', 'Casemiro', 'MID', 'BRA', 'Manchester United', 'Premier League', 80, 8, ['Manchester United', 'Real Madrid', 'Porto']],

  // Attaquants
  ['mbappe', 'Kylian Mbappé', 'ATT', 'FRA', 'Real Madrid', 'Liga', 91, 180, ['Real Madrid', 'PSG', 'Monaco']],
  ['haaland', 'Erling Haaland', 'ATT', 'NOR', 'Manchester City', 'Premier League', 91, 180, ['Manchester City', 'Dortmund', 'Salzbourg']],
  ['dembele', 'Ousmane Dembélé', 'ATT', 'FRA', 'PSG', 'Ligue 1', 90, 100, ['PSG', 'FC Barcelone', 'Dortmund', 'Rennes']],
  ['yamal', 'Lamine Yamal', 'ATT', 'ESP', 'FC Barcelone', 'Liga', 90, 200, ['FC Barcelone']],
  ['vinicius', 'Vinícius Júnior', 'ATT', 'BRA', 'Real Madrid', 'Liga', 90, 160, ['Real Madrid', 'Flamengo']],
  ['kane', 'Harry Kane', 'ATT', 'ENG', 'Bayern Munich', 'Bundesliga', 90, 70, ['Bayern Munich', 'Tottenham']],
  ['salah', 'Mohamed Salah', 'ATT', 'EGY', 'Liverpool', 'Premier League', 89, 50, ['Liverpool', 'AS Roma', 'Chelsea', 'Fiorentina']],
  ['raphinha', 'Raphinha', 'ATT', 'BRA', 'FC Barcelone', 'Liga', 89, 90, ['FC Barcelone', 'Leeds', 'Rennes']],
  ['lautaro', 'Lautaro Martínez', 'ATT', 'ARG', 'Inter', 'Serie A', 88, 90, ['Inter', 'Racing Club']],
  ['kvara', 'Khvicha Kvaratskhelia', 'ATT', 'GEO', 'PSG', 'Ligue 1', 88, 100, ['PSG', 'Naples']],
  ['saka', 'Bukayo Saka', 'ATT', 'ENG', 'Arsenal', 'Premier League', 88, 130, ['Arsenal']],
  ['olise', 'Michael Olise', 'ATT', 'FRA', 'Bayern Munich', 'Bundesliga', 87, 100, ['Bayern Munich', 'Crystal Palace']],
  ['isak', 'Alexander Isak', 'ATT', 'SWE', 'Liverpool', 'Premier League', 87, 130, ['Liverpool', 'Newcastle', 'Real Sociedad']],
  ['messi', 'Lionel Messi', 'ATT', 'ARG', 'Inter Miami', 'MLS', 86, 15, ['Inter Miami', 'PSG', 'FC Barcelone']],
  ['thuram', 'Marcus Thuram', 'ATT', 'FRA', 'Inter', 'Serie A', 86, 70, ['Inter', 'Mönchengladbach', 'Guingamp']],
  ['lewandowski', 'Robert Lewandowski', 'ATT', 'POL', 'FC Barcelone', 'Liga', 86, 15, ['FC Barcelone', 'Bayern Munich', 'Dortmund']],
  ['gyokeres', 'Viktor Gyökeres', 'ATT', 'SWE', 'Arsenal', 'Premier League', 86, 70, ['Arsenal', 'Sporting', 'Coventry']],
  ['rodrygo', 'Rodrygo', 'ATT', 'BRA', 'Real Madrid', 'Liga', 85, 80, ['Real Madrid', 'Santos']],
  ['griezmann', 'Antoine Griezmann', 'ATT', 'FRA', 'Atlético Madrid', 'Liga', 85, 15, ['Atlético Madrid', 'FC Barcelone', 'Real Sociedad']],
  ['doue', 'Désiré Doué', 'ATT', 'FRA', 'PSG', 'Ligue 1', 85, 90, ['PSG', 'Rennes']],
  ['leao', 'Rafael Leão', 'ATT', 'POR', 'AC Milan', 'Serie A', 85, 70, ['AC Milan', 'Lille', 'Sporting']],
  ['osimhen', 'Victor Osimhen', 'ATT', 'NGA', 'Galatasaray', 'Süper Lig', 85, 70, ['Galatasaray', 'Naples', 'Lille']],
  ['barcola', 'Bradley Barcola', 'ATT', 'FRA', 'PSG', 'Ligue 1', 84, 70, ['PSG', 'Lyon']],
  ['ekitike', 'Hugo Ekitiké', 'ATT', 'FRA', 'Liverpool', 'Premier League', 84, 80, ['Liverpool', 'Eintracht Francfort', 'PSG', 'Reims']],
  ['cherki', 'Rayan Cherki', 'ATT', 'FRA', 'Manchester City', 'Premier League', 84, 50, ['Manchester City', 'Lyon']],
  ['benzema', 'Karim Benzema', 'ATT', 'FRA', 'Al-Ittihad', 'Saudi Pro League', 84, 8, ['Al-Ittihad', 'Real Madrid', 'Lyon']],
  ['ronaldo', 'Cristiano Ronaldo', 'ATT', 'POR', 'Al-Nassr', 'Saudi Pro League', 84, 10, ['Al-Nassr', 'Juventus', 'Real Madrid', 'Manchester United', 'Sporting']],
  ['giroud', 'Olivier Giroud', 'ATT', 'FRA', 'Lille', 'Ligue 1', 78, 2, ['Lille', 'LA Galaxy', 'AC Milan', 'Chelsea', 'Arsenal', 'Montpellier']],
];

export interface FootballerFull extends Footballer {
  clubs: string[];
}

export const FOOTBALLERS: FootballerFull[] = ROWS.map(([id, name, pos, nat, club, league, rating, price, clubs]) => ({
  id, name, pos, nat, flag: FLAGS[nat] ?? '🏳️', club, league, rating, price, clubs,
}));

/* ------------------------------------------------------------------ */
/* Joueurs « surprise » (fictifs) donnés au perdant d'un duel           */
/* ------------------------------------------------------------------ */

/**
 * 85 % du temps, le perdant d'un duel hérite d'un de ces joueurs du dimanche (gratuits).
 * Les 15 % restants, il récupère une star (note ≥ 88) qui n'était pas proposée.
 */
const flop = (id: string, name: string, pos: FootPos, rating: number): Footballer => ({
  id: `flop-${id}`, name, pos, nat: 'FRA', flag: '🥴', club: 'AS Dimanche Matin', league: 'District', rating, price: 0,
});

export const FLOPS: Record<FootPos, Footballer[]> = {
  GK: [
    flop('passoire', 'Jean-Claude Passoire', 'GK', 48),
    flop('mainsmoites', 'Gérard Mains-Moites', 'GK', 52),
    flop('lucarne', 'Bernard Lucarne', 'GK', 55),
    flop('poteau', 'Patrice Poteau', 'GK', 58),
  ],
  DEF: [
    flop('tacle', 'Jacky Tacle-Retard', 'DEF', 50),
    flop('csc', 'Rodrigue Contre-son-Camp', 'DEF', 53),
    flop('glissade', 'Régis Glissade', 'DEF', 55),
    flop('plot', 'Didier Plot', 'DEF', 57),
    flop('horsjeu', 'Mickaël Hors-Jeu', 'DEF', 60),
  ],
  MID: [
    flop('passeratee', 'Gégé Passe-Ratée', 'MID', 51),
    flop('essouffle', 'Thierry Essoufflé', 'MID', 54),
    flop('talonnade', 'Dylan Talonnade', 'MID', 57),
    flop('petitpont', 'Steevy Petit-Pont', 'MID', 61),
  ],
  ATT: [
    flop('tribune', 'Momo Tir-Tribune', 'ATT', 50),
    flop('dimanche', 'Ronaldo du Dimanche', 'ATT', 53),
    flop('transversale', 'Christophe Barre-Transversale', 'ATT', 56),
    flop('horscadre', 'Franck Hors-Cadre', 'ATT', 59),
  ],
};
