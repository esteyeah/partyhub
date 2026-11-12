#!/usr/bin/env python3
"""
Transforme l'analyse d'une démo (highlights.py --json) + UN enregistrement vidéo du match
en clips « Devine le rang » prêts à jouer.

L'enregistrement commence au round 1 et suit la démo en temps réel : il suffit d'indiquer
`--t0`, le temps (en secondes) dans la vidéo où le round 1 démarre. Chaque clip est alors
calculé à partir des ticks de la démo (64 ticks = 1 seconde).

    python tools/cs/make_entries.py highlights.json --youtube "https://youtu.be/XXXX" --t0 7 --out public/rank-clips.json
"""
import argparse
import json
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
TICKRATE = 64
LADDER = ['< 5 000', '5 000 – 9 999', '10 000 – 14 999', '15 000 – 19 999', '20 000 – 24 999', '25 000 – 29 999', '30 000+']
LIMITS = [5000, 10000, 15000, 20000, 25000, 30000, 10**9]


def youtube_id(url):
    import re
    m = re.search(r'(?:v=|youtu\.be/|shorts/|embed/)([\w-]{11})', url)
    if m:
        return m.group(1)
    if re.fullmatch(r'[\w-]{11}', url):
        return url
    sys.exit('Lien YouTube invalide')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('highlights')
    ap.add_argument('--youtube', required=True)
    ap.add_argument('--t0', type=float, required=True, help='seconde de la vidéo où commence le round 1')
    ap.add_argument('--out', default='public/rank-clips.json')
    ap.add_argument('--label', default='Match Premier · Nuke')
    ap.add_argument('--mask-bottom', type=float, default=14, help='cache noir en bas de l’image (%%) pour masquer la barre du pseudo')
    a = ap.parse_args()

    h = json.load(open(a.highlights))
    rating = int(h['player_rank'])
    rank = LADDER[next(i for i, lim in enumerate(LIMITS) if rating < lim)]
    vid = youtube_id(a.youtube)
    clips = h['clips']
    origin = min(c['start_tick'] for c in clips if c['round'] == 1) if any(c['round'] == 1 for c in clips) else clips[0]['start_tick']

    out = Path(a.out)
    existing = json.loads(out.read_text()) if out.exists() else []
    added = 0
    for c in clips:
        start = a.t0 + (c['start_tick'] - origin) / TICKRATE
        end = a.t0 + (c['end_tick'] - origin) / TICKRATE
        what = 'round pistolet' if c['pistol'] else f"{c['kills']} kills"
        existing.append({
            'game': 'premier',
            'rank': rank,
            **({'pistol': True} if c['pistol'] else {}),
            'clip': {'type': 'youtube', 'id': vid, 'start': round(start), 'end': round(end), **({'maskBottom': a.mask_bottom} if a.mask_bottom else {})},
            'context': f"{a.label} · {what}",
            'id': f"{vid}-{c['round']}-{random.randint(0, 10**6)}",
            'createdAt': int(time.time() * 1000),
        })
        added += 1
    out.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + '\n')
    print(f'{added} clips ajoutés à {out} (rang : {rank}, Premier {rating})')


if __name__ == '__main__':
    main()
