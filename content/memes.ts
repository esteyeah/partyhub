/**
 * « Complète la phrase » : répliques cultes et mèmes, utilisés par « Devine la suite ».
 * `text` contient « … » à l'endroit du mot manquant.
 */
export interface MemeQuestion {
  text: string;
  source: string;
  choices: string[];
  answer: number;
}

export const MEMES: MemeQuestion[] = [
  { text: '« Le gras, c’est la … »', source: 'Kaamelott — Karadoc', choices: ['vie', 'santé', 'base', 'joie'], answer: 0 },
  { text: '« C’est pas … »', source: 'Kaamelott — Perceval', choices: ['faux', 'grave', 'possible', 'juste'], answer: 0 },
  { text: '« Faut pas respirer la compote, ça fait … »', source: 'Kaamelott', choices: ['tousser', 'pleurer', 'grossir', 'rire'], answer: 0 },
  { text: '« J’aime me beurrer la … »', source: 'OSS 117 : Le Caire, nid d’espions', choices: ['biscotte', 'tartine', 'brioche', 'baguette'], answer: 0 },
  { text: '« Une dictature, c’est quand les gens sont communistes, déjà. Qu’ils ont froid, avec des chapeaux gris et des chaussures à fermeture … »', source: 'OSS 117 : Rio ne répond plus', choices: ['éclair', 'velcro', 'zip', 'automatique'], answer: 0 },
  { text: '« Moi, j’ai dit bizarre ? Comme c’est … »', source: 'Drôle de drame', choices: ['bizarre', 'étrange', 'curieux', 'drôle'], answer: 0 },
  { text: '« Il s’appelle Juste … »', source: 'Le Dîner de cons', choices: ['Leblanc', 'Lenoir', 'Leroux', 'Lebrun'], answer: 0 },
  { text: '« Que trépasse si je … ! »', source: 'Les Visiteurs — Godefroy de Montmirail', choices: ['faiblis', 'recule', 'tombe', 'mens'], answer: 0 },
  { text: '« Jusqu’ici tout va bien… Mais l’important, c’est pas la chute, c’est … »', source: 'La Haine', choices: ['l’atterrissage', 'le saut', 'la descente', 'l’envol'], answer: 0 },
  { text: '« Vous savez, moi je ne crois pas qu’il y ait de bonne ou de mauvaise … »', source: 'Astérix & Obélix : Mission Cléopâtre — Otis', choices: ['situation', 'réponse', 'idée', 'personne'], answer: 0 },
  { text: '« Non… Je suis ton … »', source: 'Star Wars : L’Empire contre-attaque (VF)', choices: ['père', 'frère', 'maître', 'oncle'], answer: 0 },
  { text: '« Un plus un égale … »', source: 'Jean-Claude Van Damme', choices: ['onze', 'deux', 'zéro', 'trois'], answer: 0 },
  { text: '« Le bon chasseur, il voit un truc qui bouge, il … »', source: 'Les Inconnus — Les Chasseurs', choices: ['tire', 'court', 'crie', 'attend'], answer: 0 },
  { text: '« Le train de tes injures roule sur le rail de mon … »', source: 'La Classe américaine', choices: ['indifférence', 'mépris', 'silence', 'cœur'], answer: 0 },
  { text: '« Non mais allô, quoi ! T’es une fille et t’as pas de … »', source: 'Nabilla', choices: ['shampoing', 'maquillage', 'téléphone', 'brosse'], answer: 0 },
  { text: '« Je t’ai … ! »', source: 'Brice de Nice', choices: ['cassé', 'eu', 'vu', 'battu'], answer: 0 },
  { text: '« On sait jamais, sur un malentendu, ça peut … »', source: 'Les Bronzés font du ski — Jean-Claude Dusse', choices: ['marcher', 'passer', 'casser', 'rater'], answer: 0 },
  { text: '« Mangez des … ! »', source: 'Jacques Chirac (Les Guignols, 1995)', choices: ['pommes', 'légumes', 'frites', 'bananes'], answer: 0 },
  { text: '« C’est l’heure du … ! »', source: 'Yu-Gi-Oh!', choices: ['du-du-du-duel', 'goûter', 'combat', 'match'], answer: 0 },
  { text: '« J’suis pas venu ici pour …, OK ? »', source: 'Mème', choices: ['souffrir', 'rigoler', 'parler', 'dormir'], answer: 0 },
];
