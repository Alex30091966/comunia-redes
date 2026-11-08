# Asigna a cada escena un clip de Pexels sin usar (por consulta, con familias de respaldo) y una foto de portada.
# uso: python3 asignar.py  -> escribe asignacion.json
import json, os, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from noviembre import REELS
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
EXCLUIR = {37021581, 26255832, 7362700, 35099110}  # marcas visibles o texto en inglés
FAM = [
    ["man laptop coffee", "woman laptop office", "office desk laptop working", "email inbox laptop screen", "customer service headset"],
    ["woman texting smartphone", "smart home phone app", "man typing on phone"],
    ["people meeting table discussion", "business meeting conference room", "neighbors talking hallway"],
    ["financial documents calculator", "signing document pen", "insurance paperwork home", "paying bills laptop"],
    ["elderly woman phone call", "customer service headset"],
    ["electrician working panel", "technician toolbox", "light bulb replacing"],
    ["residential building facade", "apartment building exterior", "city aerial apartments", "night city windows apartments"],
]
AMBIENTE = ["cleaning building lobby", "building hallway corridor", "stairs in apartment building", "apartment building exterior",
            "city aerial apartments", "night city windows apartments", "keys door lock", "mailboxes apartment",
            "apartment building entrance door", "neighbors talking hallway"]

reg = json.load(open(os.path.join(RAIZ, "registro.json")))
usados = set()
for p in reg["publicaciones"]:
    usados |= set(p.get("pexels_ids", []))
idx = json.load(open(os.path.join(RAIZ, "banco/pool/indice.json")))
libres = collections.defaultdict(list)
fotos = collections.defaultdict(list)
for x in idx:
    if x["id"] in usados or x["id"] in EXCLUIR or not os.path.exists(os.path.join(RAIZ, x["archivo"])):
        continue
    (libres if x["tipo"] == "video" else fotos)[x["consulta"]].append(x)
fijos = json.load(open(os.path.join(os.path.dirname(__file__), "fijos.json"))) if os.path.exists(os.path.join(os.path.dirname(__file__), "fijos.json")) else {}

def tomar(pool, q, fam_list, ambiente):
    orden = [q] + [c for fam in fam_list if q in fam for c in fam if c != q] + ambiente
    for c in orden:
        if pool[c]:
            return pool[c].pop(0), c
    for c in pool:
        if pool[c]:
            return pool[c].pop(0), c
    raise SystemExit("banco agotado")

# primero quitamos del pool los clips fijados a mano
for k, vid in fijos.items():
    for c in libres:
        libres[c] = [x for x in libres[c] if x["id"] != vid]
# reparto óptimo global (Hungarian): coste 0 consulta pedida, 3 misma familia, 6 ambiente, 9 cualquier otra
import numpy as np
from scipy.optimize import linear_sum_assignment
escenas = [(R, i, e["media"][2:].split("|")) for R in REELS for i, e in enumerate(R["escenas"]) if "media" in e and f"{R['fecha']}#{i}" not in fijos]
clips = [x for c in libres for x in libres[c]]
def coste(qs, c):
    estricto = qs[0].startswith("!")
    qs = [qs[0].lstrip("!")] + qs[1:]
    if c in qs: return qs.index(c)
    if estricto: return 40
    q = qs[0]
    if any(q in fam and c in fam for fam in FAM): return 3
    if c in AMBIENTE: return 6
    return 9
M = np.array([[coste(qs, x["consulta"]) for x in clips] for (_, _, qs) in escenas])
fi, co = linear_sum_assignment(M)
elegido = {f"{escenas[a][0]['fecha']}#{escenas[a][1]}": clips[b] for a, b in zip(fi, co)}
for x in elegido.values():
    libres[x["consulta"]].remove(x)
out = {}
for R in REELS:
    asig = []
    for i, e in enumerate(R["escenas"]):
        if "media" not in e:
            continue
        clave = f"{R['fecha']}#{i}"
        q = e["media"][2:].split("|")[0].lstrip("!")
        x = next(y for y in idx if y["id"] == fijos[clave]) if clave in fijos else elegido[clave]
        c = x["consulta"]
        asig.append({"escena": i, "pedido": q, "dado": c, "id": x["id"], "archivo": x["archivo"], "autor": x["autor"]})
    f, c = tomar(fotos, R["foto"], FAM, list(fotos.keys()))
    out[R["fecha"]] = {"clips": asig, "foto": {"pedido": R["foto"], "dado": c, "id": f["id"], "archivo": f["archivo"], "autor": f["autor"]}}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "asignacion.json"), "w"), indent=1, ensure_ascii=False)
for d, a in out.items():
    for c in a["clips"]:
        if c["pedido"] != c["dado"]:
            print(d, c["escena"], c["pedido"], "->", c["dado"], c["id"])
    if a["foto"]["pedido"] != a["foto"]["dado"]:
        print(d, "foto", a["foto"]["pedido"], "->", a["foto"]["dado"])
print("restan clips:", sum(len(v) for v in libres.values()), " fotos:", sum(len(v) for v in fotos.values()))
