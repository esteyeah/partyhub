# 🎮 PartyHub — mini-jeux multijoueurs entre amis

Crée un salon privé, partage le code (ou le lien), et enchaînez des mini-jeux en temps réel :

| Jeu | Statut | Contenu fourni |
| --- | --- | --- |
| 🧠 **Quiz Culture G & Énigmes** | ✅ jouable | 100 questions (culture, énigmes, pièges) + ajout depuis le site via `/admin` |
| 🎵 **Blind Test** (QCM ou réponse libre tolérante aux fautes) | ✅ jouable | 35 titres, extraits récupérés via l’API iTunes |
| ⚽ **Compose ton 11** (budget, nationalité, club, bonus) | ✅ jouable | 87 joueurs, 4 défis, 3 formations |
| 🏆 **Devine le Rang** (100 / 50 / 0 pts) | ✅ moteur prêt | à compléter avec tes clips |
| 🎬 **Devine la suite** (vidéo coupée + QCM + reveal) | ✅ moteur prêt | à compléter avec tes clips |

**Stack :** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Socket.io 4 · Framer Motion · TypeScript.
Un seul serveur Node sert les pages **et** les WebSockets sur le même port.

---

## 🚀 Installation

Prérequis : **Node.js ≥ 20**.

```bash
npm install
```

```bash
npm run dev
```

Ouvre http://localhost:3000, crée un salon, puis ouvre un **2ᵉ onglet** (ou ton téléphone sur le même Wi-Fi : `http://IP-DE-TON-PC:3000`) pour rejoindre avec le code.

Production :

```bash
npm run build
```

```bash
npm start
```

Variables d’environnement (facultatives, voir `.env.example`) : `PORT`, `HOST`, `ITUNES_COUNTRY`, `ADMIN_NAME`, `ADMIN_PASSWORD`, `QUESTIONS_FILE`.

> 💡 Le Blind Test a besoin d’Internet (API publique `itunes.apple.com`) pour récupérer les extraits de 30 s. Sans accès réseau, le jeu est automatiquement passé ; tu peux aussi fournir tes propres MP3 (voir plus bas).

---

## 🗂️ Architecture

```
partyhub/
├── server/                      # Backend temps réel (Node + Socket.io)
│   ├── index.ts                 # Serveur HTTP unique : Next.js + Socket.io
│   ├── socket.ts                # Événements Socket.io (créer/rejoindre/reprendre, actions…)
│   ├── admin/                   # API /api/admin : auth (nom + mot de passe), stockage des questions
│   ├── rooms/
│   │   ├── Room.ts              # Salon : joueurs, hôte, programme, scores, sync par joueur
│   │   └── RoomManager.ts       # Création des codes, nettoyage des salons inactifs
│   ├── games/
│   │   ├── GameModule.ts        # Classe de base d’un mini-jeu (timers, vue, actions)
│   │   ├── RoundGame.ts         # Moteur générique « à manches » (QCM / réponse libre)
│   │   ├── registry.ts          # gameId → module serveur (+ disponibilité)
│   │   ├── quiz/QuizGame.ts
│   │   ├── blindtest/           # BlindTestGame.ts + itunes.ts (résolution des extraits)
│   │   ├── video/VideoGame.ts
│   │   ├── rank/RankGame.ts
│   │   └── eleven/ElevenGame.ts
│   └── utils/                   # fuzzy.ts (Levenshtein), random.ts
├── shared/                      # Code partagé client ⇄ serveur
│   ├── types.ts                 # Snapshots, vues de jeux, actions
│   ├── events.ts                # Contrat Socket.io typé
│   └── catalog.ts               # Métadonnées + réglages de chaque jeu (formulaires auto)
├── content/                     # 📝 Contenus éditables (questions, playlist, clips, joueurs)
├── src/                         # Frontend Next.js
│   ├── app/                     # page d’accueil, /room/[code], /admin
│   ├── components/
│   │   ├── room/                # RoomScreen, Lobby, GameStage, Scoreboard, EndScreen…
│   │   ├── media/               # ClipPlayer (YouTube/MP4 anti-spoiler), AudioPlayer
│   │   └── ui/                  # Button, Avatar, Timer
│   ├── games/                   # Vues client de chaque jeu + registry.tsx
│   │   └── round/RoundStage.tsx # UI générique des jeux à manches
│   └── lib/                     # socket.ts, store.ts, session.ts, hooks.ts
└── public/{audio,clips}/        # Tes fichiers médias locaux
```

### Principes

- **Serveur autoritaire** : toute la logique (chrono, points, bonnes réponses) vit côté serveur. Les réponses ne sont envoyées aux clients qu’au moment du *reveal* → impossible de tricher via les DevTools.
- **Vue par joueur** : à chaque changement, le salon envoie à chaque socket `room:sync` = `{ room, game: game.view(playerId), serverNow }`. Les envois sont regroupés (un seul par tick).
- **Chronos synchronisés** : le serveur envoie `endsAt` (heure serveur) ; le client corrige le décalage d’horloge avec `serverNow`.
- **Reconnexion** : la session (`code + playerId + token`) est gardée par onglet. Un rafraîchissement ou une coupure réseau reconnecte au même joueur (60 s de grâce). Si l’hôte part, l’hôte est transféré.
- **Hôte** : compose le programme, règle chaque jeu, peut exclure un joueur et « ⏭ Passer » une étape.

### Déroulé d’une partie

`lobby` → `playing` (mini-jeu 1) → `scoreboard` (classement animé, auto 15 s) → `playing` (mini-jeu 2) → … → `ended` (podium + récap par jeu) → « Rejouer » ramène au lobby.

---

## ➕ Ajouter un nouveau mini-jeu

1. **Catalogue** — `shared/catalog.ts` : ajoute l’id dans `GameId` (`shared/types.ts`) et une entrée `GAME_CATALOG` (nom, emoji, réglages). Le lobby génère le formulaire automatiquement.
2. **Serveur** — crée `server/games/mon-jeu/MonJeu.ts` :
   - jeu à manches (QCM ou texte) → étends `RoundGame` et implémente `prepare()` + `buildRound()` (≈ 30 lignes, voir `QuizGame.ts`) ;
   - jeu libre → étends `GameModule` et implémente `start()`, `onAction()`, `view()` (voir `ElevenGame.ts`).
   Puis enregistre-le dans `server/games/registry.ts`.
3. **Client** — crée `src/games/mon-jeu/MonJeuView.tsx` (pour un jeu à manches, il suffit d’un `<RoundStage renderPrompt={…} />`) et ajoute-le dans `src/games/registry.tsx`.

Pour un barème différent, surcharge `scoreChoice()` (comme `RankGame`) ou `textPoints()`.

---

## 📝 Ajouter du contenu

| Fichier | Quoi |
| --- | --- |
| `content/quiz.ts` | Questions : `{ category, question, choices[4], answer, explanation? }` (choix mélangés à chaque partie) |
| `content/blindtest.ts` | Titres : `{ title, artist, tags, artistAliases?, titleAliases?, previewUrl? }` — mets un MP3 dans `public/audio/` et `previewUrl: '/audio/x.mp3'` pour te passer d’iTunes |
| `content/rank.ts` | Clips : `{ game: 'valorant' \| 'lol' \| 'rocket' \| 'cs2', clip, rank, context? }` + échelles de rangs |
| `content/video.ts` | Extraits : `{ clip, revealClip?, question, choices, answer }` |
| `content/footballers.ts` | Joueurs (notes/prix fictifs) + défis (`pool`, `budget`, `bonuses`) |

Format d’un clip vidéo :

```ts
{ type: 'youtube', id: 'ID_YOUTUBE', start: 42, end: 55 }        // secondes
{ type: 'file', src: '/clips/mon-clip.mp4', start: 0, end: 12 }   // fichier dans public/clips
```

Le lecteur coupe l’extrait à `end` et le masque (pas de miniatures/suggestions YouTube). Pour « Devine la suite », `revealClip` est joué pendant le reveal.

Tant que `content/rank.ts` ou `content/video.ts` est vide, le jeu correspondant est grisé dans le lobby.

---

## 🔐 Espace admin : ajouter des questions depuis le site

1. Crée un fichier `.env.local` à la racine (il n’est jamais commité) :

   ```
   ADMIN_NAME=TonPseudo
   ADMIN_PASSWORD=unMotDePasseSolide
   ```

2. Redémarre le serveur, va sur **http://localhost:3000/admin** (lien « ⚙️ Admin » sur l’accueil) et connecte-toi avec ce nom et ce mot de passe.
3. Ajoute, modifie ou supprime tes questions (catégorie, 4 réponses, bonne réponse, explication). Elles sont utilisées dès la prochaine partie de Quiz, mélangées aux questions intégrées.

Détails :
- Les questions sont enregistrées dans `data/custom-questions.json` (modifiable via `QUESTIONS_FILE`). Ce dossier est ignoré par git. Sur un hébergeur, place-le sur un **disque persistant** (volume Railway/Render/Fly), sinon il est vidé à chaque redéploiement.
- Le mot de passe est obligatoire : un simple pseudo pourrait être tapé par n’importe qui. La session admin dure 7 jours, et changer le mot de passe déconnecte toutes les sessions. Après 10 échecs, une IP est bloquée 15 minutes.
- API utilisée par la page : `POST /api/admin/login`, `GET|POST /api/admin/questions`, `PUT|DELETE /api/admin/questions/:id` (jeton `Authorization: Bearer`).

---

## 🧮 Barèmes

- **Quiz / Devine la suite / Blind Test QCM** : 1000 pts si réponse instantanée → 500 pts à la dernière seconde, 0 si faux.
- **Blind Test réponse libre** : artiste et titre valent chacun 500 → 250 pts selon la rapidité, +150 / +75 / +25 pour les 1er/2e/3e à trouver. Tolérance : 1 faute (≤ 6 lettres), 2 (≤ 12), 3 au-delà ; accents, ponctuation, « the/le/la » et « (feat. …) » ignorés ; « Presque ! » si c’est proche.
- **Devine le Rang** : 100 pts rang exact, 50 pts à un rang près, 0 sinon.
- **Compose ton 11** : note = moyenne des 11 notes (poste vide = 0) + bonus du défi ; points = note × 10, +200 pour le meilleur 11.

---

## 🌐 Déploiement

Il faut un hébergeur qui garde un **process Node long** avec WebSockets (Railway, Render, Fly.io, un VPS…). Vercel/Netlify en mode serverless ne conviennent pas pour Socket.io.

```bash
npm ci && npm run build && npm start
```

Les salons sont en mémoire : une seule instance suffit pour jouer entre amis. Pour monter en charge sur plusieurs instances, ajoute l’adaptateur Redis de Socket.io et stocke les salons dans Redis.
