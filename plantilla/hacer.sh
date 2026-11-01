#!/bin/bash
# Render completo: vídeo mudo + música original + mezcla final + portada.  uso: bash hacer.sh SEMILLA
set -e
cd "$(dirname "$0")"
SEM=${1:-1}
node render.mjs video
D=$(cat salida/duracion.txt)
CORTES=$(python3 -c "
import json; p=json.load(open('src/plan.json')); t=0; c=[]
for e in p['escenas'][:-1]: t+=e['dur']-12/30; c.append(round(t,2))
print(','.join(map(str,c)))")
python3 musica.py "$D" "$CORTES" salida/musica.wav "$SEM"
ffmpeg -hide_banner -loglevel error -y -i salida/mudo.mp4 -i salida/musica.wav -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart salida/reel.mp4
node render.mjs portada
ls -la salida/reel.mp4 salida/portada.png
