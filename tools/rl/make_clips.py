#!/usr/bin/env python3
"""
Génère des vidéos « Devine la suite » à partir de replays Rocket League (.replay).

Pour chaque tir détecté dans un replay, la vidéo montre l'action vue du dessus,
puis la partie « question » s'arrête juste après la frappe. La suite (but, arrêt
ou tir à côté) est connue grâce aux événements du replay : la bonne réponse
n'est donc jamais devinée à la main.

Usage :
    pip install -r tools/rl/requirements.txt
    python tools/rl/make_clips.py REPLAYS_DIR --out public/clips/rl --manifest content/rl-suite.json --max 24

Le manifeste JSON est lu par content/video.ts.
"""

import argparse
import hashlib
import json
import math
import os
import random
import subprocess
import sys
from pathlib import Path

import subtr_actor
from PIL import Image, ImageDraw, ImageFont

FPS = 30
W, H = 540, 760
SCALE = 0.06  # pixels par unité Unreal (le terrain fait 8192 × 10240 uu)
CX, CY = W / 2, H / 2 + 14

BLUE = (59, 130, 246)
ORANGE = (249, 115, 22)
GRASS_A = (21, 94, 58)
GRASS_B = (18, 84, 52)
LINE = (255, 255, 255, 150)

BEFORE_SHOT = 7.0     # secondes montrées avant la frappe
CUT_AFTER_SHOT = 0.15 # la vidéo se coupe juste après le contact
REVEAL_MAX = 4.0      # durée max de la suite révélée
GOAL_WINDOW = 5.0     # un but dans les 5 s après le tir = « but »
SAVE_WINDOW = 4.0


def to_px(x, y):
    # Équipe bleue (team 0) en bas, orange en haut
    return CX + x * SCALE, CY - y * SCALE


def field_polygon():
    # Terrain octogonal (coins coupés) en unités Unreal
    hx, hy, c = 4096, 5120, 1152
    pts = [(-hx + c, -hy), (hx - c, -hy), (hx, -hy + c), (hx, hy - c), (hx - c, hy), (-hx + c, hy), (-hx, hy - c), (-hx, -hy + c)]
    return [to_px(x, y) for x, y in pts]


def draw_background():
    img = Image.new('RGB', (W, H), (10, 12, 22))
    d = ImageDraw.Draw(img, 'RGBA')
    poly = field_polygon()
    # bandes de pelouse
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    stripes = Image.new('RGB', (W, H), GRASS_A)
    sd = ImageDraw.Draw(stripes)
    band = 1024 * SCALE
    y = CY - 5120 * SCALE
    i = 0
    while y < CY + 5120 * SCALE:
        sd.rectangle([0, y, W, y + band], fill=GRASS_A if i % 2 == 0 else GRASS_B)
        y += band
        i += 1
    img.paste(stripes, (0, 0), mask)
    # buts
    gw, gd = 893, 880
    for sign, col in ((-1, BLUE), (1, ORANGE)):
        x0, y0 = to_px(-gw, sign * 5120)
        x1, y1 = to_px(gw, sign * (5120 + gd))
        d.rectangle([min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)], fill=col + (90,), outline=col + (230,), width=2)
    # lignes
    d.polygon(poly, outline=LINE, width=2)
    d.line([to_px(-4096, 0), to_px(4096, 0)], fill=LINE, width=2)
    r = 1000 * SCALE
    d.ellipse([CX - r, CY - r, CX + r, CY + r], outline=LINE, width=2)
    # gros boosts
    for bx, by in ((3072, 4096), (-3072, 4096), (3072, -4096), (-3072, -4096), (3584, 0), (-3584, 0)):
        px, py = to_px(bx, by)
        d.ellipse([px - 5, py - 5, px + 5, py + 5], fill=(250, 204, 21, 160))
    return img


def load_font(size):
    for name in ('DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT = load_font(18)
FONT_SMALL = load_font(13)


def render_clip(arr, n_players, t_start, t_end, score_at, out_path, cut_time):
    """Dessine les frames [t_start, t_end] et les encode en MP4 (H.264)."""
    times = arr[:, 12]
    idx = [i for i in range(len(arr)) if t_start <= times[i] <= t_end]
    if len(idx) < FPS * 2:
        return False
    bg = draw_background()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(
        ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
         '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out_path)],
        stdin=subprocess.PIPE,
    )
    trail = []
    headings = [0.0] * n_players
    for k, i in enumerate(idx):
        row = arr[i]
        frame = bg.copy()
        d = ImageDraw.Draw(frame, 'RGBA')
        # HUD : score + chrono
        blue, orange = score_at(row[12])
        secs = max(0, int(math.ceil(row[13]))) if not math.isnan(row[13]) else 0
        d.rounded_rectangle([W / 2 - 110, 8, W / 2 + 110, 40], radius=10, fill=(0, 0, 0, 170))
        d.text((W / 2 - 95, 14), f'{blue}', font=FONT, fill=BLUE + (255,))
        d.text((W / 2, 24), f'{secs // 60}:{secs % 60:02d}', font=FONT, fill=(255, 255, 255, 255), anchor='mm')
        d.text((W / 2 + 85, 14), f'{orange}', font=FONT, fill=ORANGE + (255,))

        # voitures
        for p in range(n_players):
            base = 14 + p * 13
            x, y, z = row[base], row[base + 1], row[base + 2]
            if any(math.isnan(v) for v in (x, y, z)):
                continue
            vx, vy = row[base + 6], row[base + 7]
            if not math.isnan(vx) and math.hypot(vx, vy) > 150:
                headings[p] = math.atan2(vy, vx)
            px, py = to_px(x, y)
            lift = min(z, 2000) / 2000
            rad = 9 + 5 * lift
            col = BLUE if p < n_players // 2 else ORANGE
            d.ellipse([px - 7 + 4 * lift, py - 4 + 10 * lift, px + 7 + 4 * lift, py + 4 + 10 * lift], fill=(0, 0, 0, 90))  # ombre
            a = headings[p]
            nose = (px + math.cos(a) * rad * 1.5, py - math.sin(a) * rad * 1.5)
            left = (px + math.cos(a + 2.5) * rad, py - math.sin(a + 2.5) * rad)
            right = (px + math.cos(a - 2.5) * rad, py - math.sin(a - 2.5) * rad)
            d.polygon([nose, left, right], fill=col + (255,), outline=(255, 255, 255, 200))
            boost = row[base + 12]
            if not math.isnan(boost):
                d.rectangle([px - 9, py + rad + 3, px - 9 + 18 * min(1, boost / 255), py + rad + 6], fill=(250, 204, 21, 220))

        # balle + traînée
        bx, by, bz = row[0], row[1], row[2]
        if not math.isnan(bx):
            trail.append(to_px(bx, by))
            trail = trail[-12:]
            for j, (tx, ty) in enumerate(trail[:-1]):
                a = int(40 + 120 * j / len(trail))
                d.ellipse([tx - 3, ty - 3, tx + 3, ty + 3], fill=(255, 255, 255, a))
            px, py = to_px(bx, by)
            lift = min(bz, 2000) / 2000
            r = 8 + 7 * lift
            d.ellipse([px - 6 + 5 * lift, py - 3 + 14 * lift, px + 6 + 5 * lift, py + 3 + 14 * lift], fill=(0, 0, 0, 110))
            d.ellipse([px - r, py - r, px + r, py + r], fill=(245, 245, 245, 255), outline=(30, 30, 30, 255), width=2)

        if row[12] >= cut_time:
            d.text((W / 2, H - 22), '▶ LA SUITE', font=FONT_SMALL, fill=(255, 255, 255, 200), anchor='mm')
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    proc.wait()
    return proc.returncode == 0


def analyse(path):
    info, arr = subtr_actor.get_ndarray_with_info_from_replay_filepath(
        str(path), ['BallRigidBody', 'CurrentTime', 'SecondsRemaining'], ['PlayerRigidBody', 'PlayerBoost'], float(FPS)
    )
    meta = info['replay_meta']
    n_players = len(meta['team_zero']) + len(meta['team_one'])
    if n_players < 2 or arr.shape[1] != 14 + 13 * n_players:
        return None
    fd = subtr_actor.get_replay_frames_data(str(path))
    goals = [(g['time'], g['scoring_team_is_team_0']) for g in fd['goal_events'] if 'time' in g]
    events = [e for e in fd['player_stat_events'] if 'time' in e]
    return arr, n_players, goals, events


def shots_with_outcome(goals, events, t_min, t_max):
    shots = []
    for e in events:
        if e['kind'] != 'Shot':
            continue
        t, team0 = e['time'], e['is_team_0']
        if t - BEFORE_SHOT < t_min + 3 or t + REVEAL_MAX > t_max:
            continue
        # pas de but dans la séquence montrée avant la frappe (sinon remise en jeu au milieu)
        if any(t - BEFORE_SHOT - 2 <= gt < t for gt, _ in goals):
            continue
        goal = next((gt for gt, g0 in goals if g0 == team0 and t < gt <= t + GOAL_WINDOW), None)
        save = any(x['kind'] == 'Save' and x['is_team_0'] != team0 and t < x['time'] <= t + SAVE_WINDOW for x in events)
        outcome = 'goal' if goal is not None else 'save' if save else 'miss'
        end = min(t + REVEAL_MAX, goal + 1.5) if goal is not None else t + REVEAL_MAX
        shots.append({'time': t, 'team0': team0, 'outcome': outcome, 'end': end})
    return shots


CHOICES = ['⚽ BUT !', '🧤 Arrêt du gardien', '❌ À côté / contré']
ANSWER = {'goal': 0, 'save': 1, 'miss': 2}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('replays', type=Path)
    ap.add_argument('--out', type=Path, default=Path('public/clips/rl'))
    ap.add_argument('--manifest', type=Path, default=Path('content/rl-suite.json'))
    ap.add_argument('--max', type=int, default=24)
    ap.add_argument('--per-replay', type=int, default=2)
    ap.add_argument('--seed', type=int, default=7)
    args = ap.parse_args()
    random.seed(args.seed)

    files = sorted(args.replays.glob('*.replay'))
    random.shuffle(files)
    picked = {'goal': [], 'save': [], 'miss': []}
    quota = math.ceil(args.max / 3)
    for f in files:
        if all(len(v) >= quota for v in picked.values()):
            break
        try:
            res = analyse(f)
        except Exception as err:  # replay trop ancien / corrompu
            print(f'skip {f.name}: {str(err)[:80]}', file=sys.stderr)
            continue
        if not res:
            continue
        arr, n_players, goals, events = res
        times = arr[:, 12]
        shots = shots_with_outcome(goals, events, float(times[0]), float(times[-1]))
        random.shuffle(shots)
        taken = 0
        for s in shots:
            if taken >= args.per_replay or len(picked[s['outcome']]) >= quota:
                continue
            clip_id = hashlib.sha1(f'{f.name}-{s["time"]:.2f}'.encode()).hexdigest()[:10]
            out = args.out / f'{clip_id}.mp4'
            start = s['time'] - BEFORE_SHOT
            cut = s['time'] + CUT_AFTER_SHOT

            def score_at(t, goals=goals):
                return (sum(1 for gt, g0 in goals if g0 and gt <= t), sum(1 for gt, g0 in goals if not g0 and gt <= t))

            if not render_clip(arr, n_players, start, s['end'], score_at, out, cut):
                continue
            team = 'BLEUE' if s['team0'] else 'ORANGE'
            picked[s['outcome']].append({
                'file': out.name,
                'cut': round(cut - start, 2),
                'end': round(s['end'] - start, 2),
                'team': team,
                'outcome': s['outcome'],
                'size': n_players // 2,
            })
            taken += 1
            print(f'{out.name}  {s["outcome"]:<5} {n_players // 2}v{n_players // 2}  ({f.name})')

    clips = [c for v in picked.values() for c in v]
    random.shuffle(clips)
    base = '/' + str(args.out).split('public/', 1)[-1].strip('/')
    manifest = [
        {
            'clip': {'type': 'file', 'src': f'{base}/{c["file"]}', 'start': 0, 'end': c['cut']},
            'revealClip': {'type': 'file', 'src': f'{base}/{c["file"]}', 'start': c['cut'], 'end': c['end']},
            'question': f'Rocket League {c["size"]}v{c["size"]} — l’équipe {c["team"]} frappe… que se passe-t-il ?',
            'choices': CHOICES,
            'answer': ANSWER[c['outcome']],
        }
        for c in clips
    ]
    args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(manifest)} vidéos → {args.manifest}  ({ {k: len(v) for k, v in picked.items()} })')


if __name__ == '__main__':
    main()
