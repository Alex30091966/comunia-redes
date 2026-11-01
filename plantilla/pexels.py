# Descarga metraje real de Pexels sin repetir.
# uso: python3 pexels.py "consulta1|consulta2|..." [--fotos] --registro ../comunia-redes/registro.json
# Guarda en public/media/1.mp4, 2.mp4… (o .jpg) y escribe public/media/creditos.json con id, autor y url.
import json, os, sys, urllib.request, urllib.parse
KEY = os.environ.get("PEXELS_API_KEY")
if not KEY: sys.exit("FALTA PEXELS_API_KEY en el entorno")
consultas = sys.argv[1].split("|")
fotos = "--fotos" in sys.argv
reg = sys.argv[sys.argv.index("--registro") + 1] if "--registro" in sys.argv else None
usados = set()
if reg and os.path.exists(reg):
    for p in json.load(open(reg)).get("publicaciones", []):
        usados.update(str(x) for x in p.get("pexels_ids", []))
os.makedirs("public/media", exist_ok=True)
def api(url):
    r = urllib.request.Request(url, headers={"Authorization": KEY, "User-Agent": "comunia-redes"})
    return json.load(urllib.request.urlopen(r, timeout=30))
def baja(url, dest):
    r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(r, timeout=120) as s, open(dest, "wb") as f: f.write(s.read())
cred = []
for i, q in enumerate(consultas, 1):
    hecho = False
    for page in (1, 2, 3):
        if fotos:
            d = api(f"https://api.pexels.com/v1/search?query={urllib.parse.quote(q)}&orientation=portrait&per_page=30&page={page}")
            for ph in d.get("photos", []):
                if str(ph["id"]) in usados: continue
                dest = f"public/media/{i}.jpg"; baja(ph["src"]["large2x"], dest)
                cred.append({"n": i, "id": ph["id"], "autor": ph["photographer"], "url": ph["url"], "consulta": q}); usados.add(str(ph["id"])); hecho = True; break
        else:
            d = api(f"https://api.pexels.com/videos/search?query={urllib.parse.quote(q)}&orientation=portrait&size=medium&per_page=30&page={page}")
            for v in d.get("videos", []):
                if str(v["id"]) in usados or v.get("duration", 0) < 6: continue
                fs = [f for f in v["video_files"] if f.get("width") and f["height"] > f["width"] and 720 <= f["width"] <= 1440 and f.get("file_type") == "video/mp4"]
                if not fs: continue
                f = min(fs, key=lambda f: abs(f["width"] - 1080))
                dest = f"public/media/{i}.mp4"; baja(f["link"], dest)
                cred.append({"n": i, "id": v["id"], "autor": v["user"]["name"], "url": v["url"], "consulta": q}); usados.add(str(v["id"])); hecho = True; break
        if hecho: break
    print(("OK " if hecho else "SIN RESULTADO ") + q)
json.dump(cred, open("public/media/creditos.json", "w"), ensure_ascii=False, indent=1)
