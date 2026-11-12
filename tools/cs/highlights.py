#!/usr/bin/env python3
"""
Analyse une démo CS2 (.dem) et prépare les clips d'un joueur pour « Devine le rang » :
  - ses meilleurs rounds (multi-kills) et les rounds pistolet ;
  - son vrai rang Premier (lu dans la démo) = la bonne réponse du jeu ;
  - pour chaque clip, les commandes console CS2 à coller pour le filmer
    SANS interface ni pseudos (cl_drawhud 0, pas de noms au-dessus des têtes).

    pip install demoparser2
    python tools/cs/highlights.py match.dem --player esteyeah8
"""
import argparse
import json
import sys

from demoparser2 import DemoParser

TICKRATE = 64
PREMIER_TIERS = [
    (5000, '< 5 000 (gris)'),
    (10000, '5 000 – 9 999 (bleu clair)'),
    (15000, '10 000 – 14 999 (bleu)'),
    (20000, '15 000 – 19 999 (violet)'),
    (25000, '20 000 – 24 999 (rose)'),
    (30000, '25 000 – 29 999 (rouge)'),
    (10**9, '30 000+ (or)'),
]


def premier_tier(rating):
    return next(label for limit, label in PREMIER_TIERS if rating < limit)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('demo')
    ap.add_argument('--player', required=True, help='pseudo (ou morceau de pseudo) du joueur à filmer')
    ap.add_argument('--max', type=int, default=8, help='nombre de clips (rounds pistolet inclus)')
    ap.add_argument('--json', help='fichier JSON de sortie (facultatif)')
    a = ap.parse_args()

    p = DemoParser(a.demo)
    header = p.parse_header()
    deaths = p.parse_event('player_death', other=['total_rounds_played'])
    round_ends = p.parse_event('round_end')
    freeze_ends = p.parse_event('round_freeze_end')
    last_tick = int(deaths['tick'].max())

    players = p.parse_ticks(['name', 'rank', 'comp_rank_type', 'team_num'], ticks=[last_tick])
    match = players[players['name'].str.lower().str.contains(a.player.lower(), regex=False)]
    if match.empty:
        sys.exit(f"Joueur « {a.player} » introuvable. Joueurs : {', '.join(players['name'])}")
    me = match.iloc[0]
    steamid = str(me['steamid'])
    rating = int(me['rank'] or 0)
    rank_type = int(me['comp_rank_type'] or 0)

    # Début de chaque round = fin du freeze time
    starts = sorted(int(t) for t in freeze_ends['tick'])
    ends = sorted(int(t) for t in round_ends['tick'])

    def round_of(tick):
        n = 0
        for i, s in enumerate(starts):
            if tick >= s:
                n = i
        return n

    # Équipe du joueur à chaque round → détection de la mi-temps (= round pistolet)
    team_by_round = {}
    for i, s in enumerate(starts):
        t = p.parse_ticks(['team_num'], ticks=[s + 1])
        row = t[t['steamid'].astype(str) == steamid]
        if not row.empty:
            team_by_round[i] = int(row.iloc[0]['team_num'])
    pistol = {0} | {i for i in range(1, len(starts)) if team_by_round.get(i) and team_by_round.get(i - 1) and team_by_round[i] != team_by_round[i - 1]}

    kills = deaths[(deaths['attacker_steamid'].astype(str) == steamid) & (deaths['user_steamid'].astype(str) != steamid)]
    by_round = {}
    for _, k in kills.iterrows():
        r = round_of(int(k['tick']))
        by_round.setdefault(r, []).append(k)

    clips = []
    for r, ks in by_round.items():
        first, last = int(ks[0]['tick']), int(ks[-1]['tick'])
        clips.append({
            'round': r + 1,
            'pistol': r in pistol,
            'kills': len(ks),
            'headshots': int(sum(bool(k['headshot']) for k in ks)),
            'weapons': sorted({str(k['weapon']) for k in ks}),
            'start_tick': max(starts[r] if r < len(starts) else first, first - 8 * TICKRATE),
            'end_tick': last + 3 * TICKRATE,
        })
    for r in pistol:
        if r < len(starts) and not any(c['round'] == r + 1 for c in clips):
            end = ends[r] if r < len(ends) else starts[r] + 60 * TICKRATE
            clips.append({'round': r + 1, 'pistol': True, 'kills': 0, 'headshots': 0, 'weapons': [], 'start_tick': starts[r], 'end_tick': min(end, starts[r] + 45 * TICKRATE)})

    pistols = [c for c in clips if c['pistol']]
    best = sorted((c for c in clips if not c['pistol']), key=lambda c: (c['kills'], c['headshots']), reverse=True)
    chosen = sorted(pistols + best[: max(0, a.max - len(pistols))], key=lambda c: c['round'])

    tier = premier_tier(rating) if rank_type == 11 and rating else None
    print(f"Carte : {header.get('map_name')} · joueur : {me['name']} · rounds : {len(starts)}")
    print(f"Rang : {'Premier ' + str(rating) + ' → ' + tier if tier else f'type {rank_type}, valeur {rating}'}")
    print('\nDans CS2 : console → `playdemo <nom_de_la_démo>`, puis pour chaque clip colle la ligne et lance l’enregistrement (Win + Alt + R) :\n')
    for i, c in enumerate(chosen, 1):
        secs = (c['end_tick'] - c['start_tick']) / TICKRATE
        tag = '🔫 PISTOLET' if c['pistol'] else f"{c['kills']} kills"
        cmd = (f'cl_drawhud 0; cl_teamid_overhead_mode 0; demo_gototick {c["start_tick"]}; '
               f'spec_player "{me["name"]}"; spec_mode 4; demo_resume')
        c['seconds'] = round(secs)
        c['command'] = cmd
        print(f"Clip {i} — round {c['round']} · {tag} · ~{round(secs)} s")
        print(f'   {cmd}')
    if a.json:
        json.dump({'map': header.get('map_name'), 'player_rank': rating, 'premier_tier': tier, 'clips': chosen}, open(a.json, 'w'), indent=2, default=str)


if __name__ == '__main__':
    main()
