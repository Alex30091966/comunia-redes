# Prepara un proyecto de Remotion por reel en ~/pro/<fecha> a partir de noviembre.py + asignacion.json.
# uso: python3 construir.py [fecha ...]
import json, os, sys, shutil, datetime
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, "..")
sys.path.insert(0, AQUI)
from noviembre import REELS
asig = json.load(open(os.path.join(AQUI, "asignacion.json")))
NM = os.path.expanduser("~/reel/node_modules")
fechas = sys.argv[1:] or [R["fecha"] for R in REELS]
for R in REELS:
    if R["fecha"] not in fechas:
        continue
    d = os.path.expanduser(f"~/pro/{R['fecha']}")
    os.makedirs(d, exist_ok=True)
    for f in ["render.mjs", "musica.py", "hacer.sh", "package.json", "tsconfig.json"]:
        shutil.copy(os.path.join(AQUI, f), d)
    shutil.copytree(os.path.join(AQUI, "src"), os.path.join(d, "src"), dirs_exist_ok=True)
    shutil.copytree(os.path.join(AQUI, "public"), os.path.join(d, "public"), dirs_exist_ok=True)
    if not os.path.exists(os.path.join(d, "node_modules")):
        os.symlink(NM, os.path.join(d, "node_modules"))
    med = os.path.join(d, "public/media")
    shutil.rmtree(med, ignore_errors=True); os.makedirs(med)
    a = asig[R["fecha"]]
    por_escena = {c["escena"]: c for c in a["clips"]}
    escenas = []
    for i, e in enumerate(R["escenas"]):
        e = dict(e)
        if "media" in e:
            c = por_escena[i]
            shutil.copy(os.path.join(RAIZ, c["archivo"]), os.path.join(med, f"{c['id']}.mp4"))
            e["media"] = f"media/{c['id']}.mp4"
        escenas.append(e)
    shutil.copy(os.path.join(RAIZ, a["foto"]["archivo"]), os.path.join(med, "portada.jpg"))
    plan = {k: R[k] for k in ["estilo", "acento", "acento2", "tinte", "tamTitulo"] if k in R}
    plan["escenas"] = escenas
    plan["portada"] = dict(R["portada"], media="media/portada.jpg")
    json.dump(plan, open(os.path.join(d, "src/plan.json"), "w"), indent=1, ensure_ascii=False)
    dia = datetime.date.fromisoformat(R["fecha"]).timetuple().tm_yday
    open(os.path.join(d, "semilla.txt"), "w").write(f"{dia} {R['musica']}")
    print("ok", d)
