// node render.mjs foto 1.5 4 9  |  node render.mjs video  |  node render.mjs portada
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const SAL = path.join(RAIZ, "salida");
fs.mkdirSync(SAL, { recursive: true });
const entPath = path.join(process.env.HOME, "reel/entorno.json");
const ent = fs.existsSync(entPath) ? JSON.parse(fs.readFileSync(entPath, "utf8")) : { navegador: null, modo: "headless-shell" };
const nav = { browserExecutable: ent.navegador, chromeMode: ent.modo };
const [cmd, ...rest] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.join(RAIZ, "src/index.ts"), publicDir: path.join(RAIZ, "public") });
if (cmd === "foto") {
  const comp = await selectComposition({ serveUrl, id: "reel", ...nav });
  for (const s of rest) {
    const out = path.join(SAL, `foto_${s}.png`);
    await renderStill({ composition: comp, serveUrl, output: out, frame: Math.min(comp.durationInFrames - 1, Math.round(Number(s) * 30)), ...nav });
    console.log(out);
  }
} else if (cmd === "portada") {
  const comp = await selectComposition({ serveUrl, id: "portada", ...nav });
  await renderStill({ composition: comp, serveUrl, output: path.join(SAL, "portada.png"), frame: 0, ...nav });
  console.log("portada ok");
} else if (cmd === "video") {
  const comp = await selectComposition({ serveUrl, id: "reel", ...nav });
  const t0 = Date.now();
  await renderMedia({ composition: comp, serveUrl, codec: "h264", crf: 19, muted: true, outputLocation: path.join(SAL, "mudo.mp4"), concurrency: 4, ...nav,
    onProgress: ({ progress }) => { if (Math.round(progress * 100) % 20 === 0) process.stdout.write(`${Math.round(progress * 100)}% `); } });
  console.log(`\nmudo ok ${(Date.now() - t0) / 1000}s, ${comp.durationInFrames} fotogramas`);
  fs.writeFileSync(path.join(SAL, "duracion.txt"), String(comp.durationInFrames / 30));
}
