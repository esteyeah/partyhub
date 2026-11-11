#!/usr/bin/env bash
# Découpe un extrait (sans son) en MP4 H.264 léger pour le site.
#   tools/clips/cut.sh film.webm DEBUT FIN sortie.mp4
set -euo pipefail
ffmpeg -loglevel error -y -ss "$2" -to "$3" -i "$1" -an \
  -vf "scale='min(640,iw)':-2,fps=24" -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart "$4"
