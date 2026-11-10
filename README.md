# 🎮 PartyHub — mini-jeux multijoueurs entre amis

Crée un salon, partage le lien (`https://<pseudo>.github.io/partyhub/?salle=ABCDE`) et enchaînez des mini-jeux en temps réel.
**Aucun serveur à héberger :** le site est 100 % statique (GitHub Pages) et les joueurs se connectent directement entre eux (WebRTC).

| Jeu | Statut | Contenu fourni |
| --- | --- | --- |
| 🧠 **Quiz Culture G & Énigmes** | ✅ jouable | 100 questions + les tiennes via `/admin` |
| 🎵 **Blind Test** (QCM ou réponse libre tolérante aux fautes) | ✅ jouable | 35 titres, extraits récupérés via l’API iTunes |
| ⚽ **Compose ton 11** (budget, nationalité, club, bonus) | ✅ jouable | 87 joueurs, 4 défis, 3 formations |
| 🏆 **Devine le Rang** (100 / 50 / 0 pts) | ✅ moteur prêt | à compléter avec tes clips |
| 🎬 **Devine la suite** (vidéo coupée + QCM + reveal) | ✅ moteur prêt | à compléter avec tes clips |

**Stack :** Next.js 16 (export statique) · React 19 · Tailwind CSS 4 · PeerJS (WebRTC) · Framer Motion · TypeScript.

---

## 🌍 Mettre le site en ligne sur GitHub Pages

1. Dans le dépôt GitHub : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
2. C’est tout : à chaque push sur `main`, le workflow `.github/workflows/deploy.yml` construit et publie le site (onglet **Actions** pour suivre). L’adresse est `https://<pseudo>.github.io/<nom-du-depot>/`.

Pour inviter des amis : crée un salon, clique sur le code en haut de l’écran (🔗) pour copier le lien `…/?salle=CODE` et envoie-le.

> ⚠️ **L’hôte héberge la partie dans son onglet.** S’il le ferme ou le recharge, la partie s’arrête pour tout le monde (les autres joueurs, eux, peuvent recharger : ils sont reconnectés automatiquement).

---

## 💻 Lancer en local

Prérequis : **Node.js ≥ 20**.

```bash
npm install
```

```bash
npm run dev
```

Ouvre http://localhost:3000, crée un salon, puis ouvre un **2ᵉ onglet** pour rejoindre avec le code. Ton téléphone sur le même Wi-Fi peut aussi rejoindre via `http://IP-DE-TON-PC:3000/?salle=CODE`.

Build statique (dossier `out/`) :

```bash
npm run build
```

---

## 🔐 Espace admin : ajouter des questions depuis le site

Va sur **`/admin`** (lien « ⚙️ Admin » sur l’accueil). Deux modes :

**☁️ Sauvegarde GitHub (recommandé)** — les questions sont enregistrées dans `public/questions.json` de ton dépôt ; le site se met à jour tout seul en 1 à 2 minutes et tout le monde en profite.

1. Crée une clé sur https://github.com/settings/personal-access-tokens/new (« Fine-grained token ») :
   - **Repository access** → *Only select repositories* → ton dépôt `partyhub` ;
   - **Permissions** → **Contents : Read and write** ;
   - une date d’expiration de ton choix.
2. Colle-la dans `/admin` → « Se connecter ». Elle reste uniquement dans ton navigateur et ne donne accès qu’à ce dépôt.

Un site github.io est public : n’importe qui peut lire son code. Un mot de passe placé dans le site serait donc visible ; la clé GitHub est la seule protection fiable.

**💾 Mode local** — sans clé : questions gardées dans ton navigateur et utilisées quand tu héberges depuis cet appareil. Boutons **Exporter / Importer** pour les sauvegarder, et « Les envoyer sur GitHub » si tu passes ensuite au mode GitHub.

---

## 🗂️ Architecture

```
partyhub/
├── .github/workflows/deploy.yml  # Build + publication GitHub Pages à chaque push
├── shared/                       # Types, protocole réseau, catalogue des jeux, validation des questions
├── content/                      # 📝 Contenus éditables (questions, playlist, clips, footballeurs)
├── public/questions.json         # Questions ajoutées via /admin (mode GitHub)
└── src/
    ├── app/                      # page unique (/ et /?salle=CODE) + /admin
    ├── engine/                   # Moteur de jeu (tourne dans le navigateur de l'hôte)
    │   ├── Room.ts               # Salon : joueurs, programme, scores, snapshots par joueur
    │   └── games/                # GameModule, RoundGame + un dossier par mini-jeu, registry.ts
    ├── net/
    │   ├── host.ts               # L'hôte : accepte les connexions WebRTC et pilote le salon
    │   └── peer.ts               # Configuration PeerJS
    ├── lib/net.ts                # Côté joueur : créer / rejoindre / reprendre, actions
    ├── components/               # Accueil, lobby, classement, podium, lecteurs audio/vidéo…
    └── games/                    # Vues de chaque jeu + registry.tsx
```

### Comment ça marche

- **Mise en relation :** l’hôte s’enregistre sur le service public gratuit PeerJS sous l’identifiant `partyhub-v1-<CODE>`. Les joueurs s’y connectent avec le code. Ensuite les données passent **directement entre navigateurs** (WebRTC, avec relais TURN de PeerJS si une connexion directe est impossible).
- **L’hôte fait autorité :** chronos, points et bonnes réponses sont calculés dans son navigateur. Les réponses ne sont envoyées aux autres qu’au moment du *reveal*.
- **Vue par joueur :** à chaque changement, l’hôte envoie à chacun un snapshot `{ room, game, serverNow }` ; les chronos sont calés sur l’horloge de l’hôte.
- **Reconnexion :** la session de chaque onglet est gardée (sessionStorage). Un joueur qui recharge ou perd le réseau est reconnecté automatiquement pendant ~30 s.

---

## ➕ Ajouter un nouveau mini-jeu

1. **Catalogue** — ajoute l’id dans `GameId` (`shared/types.ts`) et une entrée dans `GAME_CATALOG` (`shared/catalog.ts`) : nom, emoji, réglages. Le lobby génère le formulaire tout seul.
2. **Moteur** — crée `src/engine/games/mon-jeu/MonJeu.ts` :
   - jeu à manches (QCM ou texte) → étends `RoundGame` et implémente `prepare()` + `buildRound()` (voir `QuizGame.ts`) ;
   - jeu libre → étends `GameModule` et implémente `start()`, `onAction()`, `view()` (voir `ElevenGame.ts`).
   Enregistre-le dans `src/engine/games/registry.ts`.
3. **Vue** — crée `src/games/mon-jeu/MonJeuView.tsx` (pour un jeu à manches, un `<RoundStage renderPrompt={…} />` suffit) et ajoute-le dans `src/games/registry.tsx`.

---

## 📝 Ajouter du contenu

| Fichier | Quoi |
| --- | --- |
| `content/quiz.ts` | Questions intégrées : `{ category, question, choices[4], answer, explanation? }` |
| `content/blindtest.ts` | Titres : `{ title, artist, tags, artistAliases?, titleAliases?, previewUrl? }` — mets un MP3 dans `public/audio/` et `previewUrl: '/partyhub/audio/x.mp3'` pour te passer d’iTunes |
| `content/rank.ts` | Clips : `{ game: 'valorant' \| 'lol' \| 'rocket' \| 'cs2', clip, rank, context? }` |
| `content/video.ts` | Extraits : `{ clip, revealClip?, question, choices, answer }` |
| `content/footballers.ts` | Joueurs (notes/prix fictifs) + défis |

Format d’un clip vidéo :

```ts
{ type: 'youtube', id: 'ID_YOUTUBE', start: 42, end: 55 }        // secondes
{ type: 'file', src: '/partyhub/clips/mon-clip.mp4', start: 0, end: 12 }
```

Tant que `content/rank.ts` ou `content/video.ts` est vide, le jeu correspondant est grisé dans le lobby.

---

## 🧮 Barèmes

- **Quiz / Devine la suite / Blind Test QCM** : 1000 pts si réponse instantanée → 500 pts à la dernière seconde, 0 si faux.
- **Blind Test réponse libre** : artiste et titre valent chacun 500 → 250 pts selon la rapidité, +150 / +75 / +25 pour les 1er/2e/3e à trouver. Tolérance : 1 faute (≤ 6 lettres), 2 (≤ 12), 3 au-delà ; accents, ponctuation, « the/le/la » et « (feat. …) » ignorés ; « Presque ! » si c’est proche.
- **Devine le Rang** : 100 pts rang exact, 50 pts à un rang près, 0 sinon.
- **Compose ton 11** : note = moyenne des 11 notes (poste vide = 0) + bonus du défi ; points = note × 10, +200 pour le meilleur 11.

---

## ⚙️ Variables facultatives

Voir `.env.example` : pays iTunes, serveur PeerJS personnel (si le service public est saturé ou bloqué), etc.
