#!/usr/bin/env python3
"""
Planche-contact horodatée d'une vidéo : permet de repérer les gags image par image
pour choisir où couper (« Devine la suite »).

    python tools/clips/sheet.py film.webm --start 0 --end 60 --fps 1 --out planche.png
"""
import argparse
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--start', type=float, default=0)
    ap.add_argument('--end', type=float, default=60)
    ap.add_argument('--fps', type=float, default=1)
    ap.add_argument('--cols', type=int, default=6)
    ap.add_argument('--width', type=int, default=220)
    ap.add_argument('--out', default='sheet.png')
    a = ap.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ['ffmpeg', '-loglevel', 'error', '-ss', str(a.start), '-to', str(a.end), '-i', a.video,
             '-vf', f'fps={a.fps},scale={a.width}:-2', f'{tmp}/%05d.png'],
            check=True,
        )
        frames = sorted(Path(tmp).glob('*.png'))
        if not frames:
            raise SystemExit('aucune image')
        w, h = Image.open(frames[0]).size
        rows = (len(frames) + a.cols - 1) // a.cols
        sheet = Image.new('RGB', (a.cols * w, rows * (h + 16)), (20, 20, 20))
        try:
            font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 12)
        except OSError:
            font = ImageFont.load_default()
        d = ImageDraw.Draw(sheet)
        for i, f in enumerate(frames):
            x, y = (i % a.cols) * w, (i // a.cols) * (h + 16)
            sheet.paste(Image.open(f), (x, y + 16))
            t = a.start + i / a.fps
            d.text((x + 3, y + 1), f'{int(t // 60)}:{t % 60:05.2f}', fill=(255, 220, 0), font=font)
        sheet.save(a.out)
        print(a.out, len(frames), 'images')


if __name__ == '__main__':
    main()
