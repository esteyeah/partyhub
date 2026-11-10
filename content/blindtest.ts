/**
 * Playlist du Blind Test.
 * Par défaut, l'extrait de 30 s est récupéré automatiquement via l'API publique iTunes Search.
 * Tu peux aussi fournir `previewUrl` (ex : '/audio/mon-extrait.mp3' dans public/audio).
 */
export interface BlindTrack {
  title: string;
  artist: string;
  tags: ('fr' | 'inter' | 'retro')[];
  /** Autres réponses acceptées (feat., surnoms…) */
  titleAliases?: string[];
  artistAliases?: string[];
  previewUrl?: string;
}

export const BLIND_TRACKS: BlindTrack[] = [
  // 🇫🇷
  { title: 'Alors on danse', artist: 'Stromae', tags: ['fr'] },
  { title: 'Papaoutai', artist: 'Stromae', tags: ['fr'] },
  { title: 'Djadja', artist: 'Aya Nakamura', tags: ['fr'] },
  { title: 'Dernière danse', artist: 'Indila', tags: ['fr'] },
  { title: 'Je veux', artist: 'Zaz', tags: ['fr'] },
  { title: 'Bella', artist: 'Maître Gims', artistAliases: ['Gims'], tags: ['fr'] },
  { title: 'Balance ton quoi', artist: 'Angèle', tags: ['fr'] },
  { title: 'Andalouse', artist: 'Kendji Girac', artistAliases: ['Kendji'], tags: ['fr'] },
  { title: 'Tchikita', artist: 'Jul', tags: ['fr'] },
  { title: 'La Bohème', artist: 'Charles Aznavour', artistAliases: ['Aznavour'], tags: ['fr', 'retro'] },
  { title: 'Ne me quitte pas', artist: 'Jacques Brel', artistAliases: ['Brel'], tags: ['fr', 'retro'] },
  { title: 'Désenchantée', artist: 'Mylène Farmer', tags: ['fr', 'retro'] },
  { title: 'L’aventurier', artist: 'Indochine', tags: ['fr', 'retro'] },
  { title: 'Mistral gagnant', artist: 'Renaud', tags: ['fr', 'retro'] },
  { title: 'Je te donne', artist: 'Jean-Jacques Goldman', artistAliases: ['Goldman', 'JJ Goldman'], tags: ['fr', 'retro'] },

  // 🌎
  { title: 'Blinding Lights', artist: 'The Weeknd', artistAliases: ['Weeknd'], tags: ['inter'] },
  { title: 'Shape of You', artist: 'Ed Sheeran', tags: ['inter'] },
  { title: 'Rolling in the Deep', artist: 'Adele', tags: ['inter'] },
  { title: 'Uptown Funk', artist: 'Mark Ronson', artistAliases: ['Bruno Mars'], tags: ['inter'] },
  { title: 'Get Lucky', artist: 'Daft Punk', artistAliases: ['Pharrell Williams', 'Pharrell'], tags: ['inter'] },
  { title: 'Bad Guy', artist: 'Billie Eilish', tags: ['inter'] },
  { title: 'Levitating', artist: 'Dua Lipa', tags: ['inter'] },
  { title: 'Flowers', artist: 'Miley Cyrus', tags: ['inter'] },
  { title: 'Wake Me Up', artist: 'Avicii', tags: ['inter'] },
  { title: 'Espresso', artist: 'Sabrina Carpenter', tags: ['inter'] },
  { title: 'Billie Jean', artist: 'Michael Jackson', tags: ['inter', 'retro'] },
  { title: 'Bohemian Rhapsody', artist: 'Queen', tags: ['inter', 'retro'] },
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', tags: ['inter', 'retro'] },
  { title: 'One More Time', artist: 'Daft Punk', tags: ['inter', 'retro'] },
  { title: 'Toxic', artist: 'Britney Spears', tags: ['inter', 'retro'] },
  { title: 'Crazy in Love', artist: 'Beyoncé', tags: ['inter', 'retro'] },
  { title: 'Seven Nation Army', artist: 'The White Stripes', artistAliases: ['White Stripes'], tags: ['inter', 'retro'] },
  { title: 'Hey Ya!', artist: 'OutKast', tags: ['inter', 'retro'] },
  { title: 'Take On Me', artist: 'a-ha', tags: ['inter', 'retro'] },
  { title: 'Africa', artist: 'Toto', tags: ['inter', 'retro'] },
];
