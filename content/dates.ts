/**
 * « Devine la date » : un événement historique ou culturel, il faut donner l'année.
 */
export interface DateEvent {
  text: string;
  year: number;
  cat: 'histoire' | 'culture';
}

const h = (text: string, year: number): DateEvent => ({ text, year, cat: 'histoire' });
const c = (text: string, year: number): DateEvent => ({ text, year, cat: 'culture' });

export const DATE_EVENTS: DateEvent[] = [
  // — Histoire —
  h('Couronnement de Charlemagne comme empereur', 800),
  h('Bataille d’Hastings (Guillaume le Conquérant envahit l’Angleterre)', 1066),
  h('Mort de Jeanne d’Arc, brûlée à Rouen', 1431),
  h('Fin de la guerre de Cent Ans', 1453),
  h('Christophe Colomb atteint l’Amérique', 1492),
  h('Bataille de Marignan', 1515),
  h('Édit de Nantes signé par Henri IV', 1598),
  h('Mort de Louis XIV', 1715),
  h('Déclaration d’indépendance des États-Unis', 1776),
  h('Prise de la Bastille', 1789),
  h('Exécution de Louis XVI', 1793),
  h('Sacre de Napoléon Ier', 1804),
  h('Bataille de Waterloo', 1815),
  h('Abolition définitive de l’esclavage en France', 1848),
  h('Loi de séparation des Églises et de l’État en France', 1905),
  h('Naufrage du Titanic', 1912),
  h('Début de la Première Guerre mondiale', 1914),
  h('Révolution russe (prise du pouvoir par les bolcheviks)', 1917),
  h('Armistice de la Première Guerre mondiale', 1918),
  h('Krach de Wall Street', 1929),
  h('Les femmes obtiennent le droit de vote en France', 1944),
  h('Débarquement allié en Normandie', 1944),
  h('Bombardement atomique d’Hiroshima', 1945),
  h('Signature du traité de Rome (naissance de la CEE)', 1957),
  h('Début de la Ve République', 1958),
  h('Fin de la guerre d’Algérie (accords d’Évian)', 1962),
  h('Assassinat de John F. Kennedy', 1963),
  h('Mai 68', 1968),
  h('Premier homme sur la Lune', 1969),
  h('Abolition de la peine de mort en France', 1981),
  h('Catastrophe de Tchernobyl', 1986),
  h('Chute du mur de Berlin', 1989),
  h('Nelson Mandela devient président de l’Afrique du Sud', 1994),
  h('Attentats du 11 septembre aux États-Unis', 2001),
  h('Mise en circulation des pièces et billets en euros', 2002),
  h('Référendum du Brexit au Royaume-Uni', 2016),
  h('Premier confinement en France (Covid-19)', 2020),

  // — Culture —
  c('Brevet du téléphone déposé par Graham Bell', 1876),
  c('Mort de Victor Hugo', 1885),
  c('Inauguration de la tour Eiffel', 1889),
  c('Première projection publique du cinématographe des frères Lumière', 1895),
  c('Premiers Jeux olympiques modernes, à Athènes', 1896),
  c('Premier Tour de France cycliste', 1903),
  c('Premier vol motorisé des frères Wright', 1903),
  c('Vol de la Joconde au Louvre', 1911),
  c('Première apparition de Tintin', 1929),
  c('Première Coupe du monde de football, en Uruguay', 1930),
  c('Première apparition d’Astérix', 1959),
  c('Festival de Woodstock', 1969),
  c('Sortie du premier film Star Wars', 1977),
  c('Mort d’Elvis Presley', 1977),
  c('Sortie de Super Mario Bros. sur NES', 1985),
  c('Sortie de la Game Boy', 1989),
  c('Premier épisode des Simpson en série', 1989),
  c('Mort de Freddie Mercury', 1991),
  c('Envoi du premier SMS', 1992),
  c('Sortie de la PlayStation au Japon', 1994),
  c('Sortie des premiers jeux Pokémon au Japon', 1996),
  c('Publication du premier livre Harry Potter', 1997),
  c('Mort de la princesse Diana', 1997),
  c('Création de Google', 1998),
  c('La France devient championne du monde de football pour la première fois', 1998),
  c('Lancement de Wikipédia', 2001),
  c('Création de Facebook', 2004),
  c('Mise en ligne de YouTube', 2005),
  c('Présentation du premier iPhone', 2007),
  c('Mort de Michael Jackson', 2009),
  c('Mort de Steve Jobs', 2011),
  c('Mort de Johnny Hallyday', 2017),
  c('Incendie de Notre-Dame de Paris', 2019),
  c('Mort de Kobe Bryant', 2020),
  c('Inauguration du circuit Paul-Ricard au Castellet', 1970),
];
