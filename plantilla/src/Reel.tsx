// Reel profesional de ComunIA: metraje real (Pexels) animado + tipografía cinética + tarjetas de interfaz.
import React from "react";
import {
  AbsoluteFill, Img, OffthreadVideo, Easing, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Sequence, continueRender, delayRender,
} from "remotion";
import { BellRing, Check, Phone, User, Sparkles, Wrench, ShieldCheck, X, MessageCircle } from "lucide-react";

// ---------------------------------------------------------------- tipos
type UI =
  | { tipo: "toast"; titulo: string; texto: string; color?: "rojo" | "ambar" | "verde" }
  | { tipo: "chat"; cabecera?: string; mensajes: { de: "vecino" | "agente"; texto: string }[] }
  | { tipo: "estados"; titulo?: string; filas: { texto: string; estado: "rojo" | "ambar" | "verde"; animar?: boolean; etiqueta?: string }[] }
  | { tipo: "flujo"; nodos: [string, string, string]; llamada?: string }
  | { tipo: "tachado"; antes: string; despues: string }
  | { tipo: "pasos"; pasos: string[] };
export type Escena = {
  dur: number; // segundos
  media?: string; // ruta en public/ (mp4 o jpg)
  kicker?: string;
  titulo?: string; // *palabras* en acento, / salto de línea
  sub?: string;
  ui?: UI;
  posicion?: "arriba" | "abajo";
  outro?: { tagline: string; cta: string };
};
export type Plan = { marca?: string; acento?: string; acento2?: string; escenas: Escena[]; portada?: { media: string; lineas: string[]; kicker?: string } };

const FPS = 30;
const SOLAPE = 12; // fotogramas de transición entre escenas
export const duracionTotal = (p: Plan) => {
  const t = p.escenas.reduce((a, e) => a + Math.round(e.dur * FPS), 0);
  return t - SOLAPE * (p.escenas.length - 1);
};

// ---------------------------------------------------------------- estilo
const C = {
  noche: "#060A16",
  blanco: "#FFFFFF",
  suave: "rgba(255,255,255,0.72)",
  vidrio: "rgba(12,18,36,0.62)",
  borde: "rgba(255,255,255,0.14)",
  rojo: "#FF3B5C",
  ambar: "#FFB020",
  verde: "#22C55E",
};
const F = { titulo: "SG", texto: "IN", mono: "JB" };
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const INOUT = Easing.bezier(0.65, 0, 0.35, 1);
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ev = (f: number, a: number, d: number, e = OUT) => interpolate(f, [a, a + d], [0, 1], { ...cl, easing: e });

const fuentes = delayRender("fuentes");
Promise.all(
  [
    ["SG", "space-grotesk-latin-700-normal.woff2", "700"],
    ["IN", "inter-latin-600-normal.woff2", "600"],
    ["IN", "inter-latin-800-normal.woff2", "800"],
    ["JB", "jetbrains-mono-latin-400-normal.woff2", "400"],
  ].map(([fam, file, w]) => {
    const ff = new FontFace(fam, `url(${staticFile(file)})`, { weight: w });
    (document.fonts as any).add(ff);
    return ff.load();
  }),
).then(() => continueRender(fuentes));

// ---------------------------------------------------------------- fondo: metraje con Ken Burns + grade
const Metraje: React.FC<{ src?: string; dur: number; i: number }> = ({ src, dur, i }) => {
  const f = useCurrentFrame();
  const p = f / dur;
  const dir = i % 4;
  const s = interpolate(p, [0, 1], [1.12, 1.26]);
  const x = interpolate(p, [0, 1], dir === 0 ? [-30, 30] : dir === 1 ? [30, -30] : [0, 0]);
  const y = interpolate(p, [0, 1], dir === 2 ? [-40, 40] : dir === 3 ? [40, -40] : [0, 0]);
  const esVideo = src && /\.(mp4|mov|webm)$/i.test(src);
  return (
    <AbsoluteFill style={{ backgroundColor: C.noche, overflow: "hidden" }}>
      {src ? (
        <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${s})` }}>
          {esVideo ? (
            <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 20%, #1B2A55 0%, #060A16 60%)" }} />
      )}
      {/* grade: tinte azul noche + contraste para legibilidad */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,10,22,0.9) 0%, rgba(6,10,22,0.55) 30%, rgba(6,10,22,0.15) 48%, rgba(6,10,22,0.3) 62%, rgba(6,10,22,0.92) 100%)" }} />
      <AbsoluteFill style={{ background: "rgba(20,40,110,0.18)", mixBlendMode: "color" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- grano + viñeta (encima de todo)
const Grano: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`grano${f % 4}.png`)})`, backgroundSize: "540px 960px", opacity: 0.07, mixBlendMode: "overlay" }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- título cinético
const partes = (t: string) => {
  // devuelve líneas -> palabras con marca de acento
  return t.split("/").map((l) =>
    l.trim().split(/\s+/).reduce<{ w: string; a: boolean }[]>((acc, w) => {
      acc.push({ w: w.replace(/\*/g, ""), a: false });
      return acc;
    }, []),
  );
};
const marcarAcento = (t: string) => {
  const out: boolean[] = [];
  let dentro = false;
  for (const tok of t.replace(/\//g, " ").split(/\s+/).filter(Boolean)) {
    const empieza = tok.startsWith("*");
    if (empieza) dentro = true;
    out.push(dentro);
    if (tok.endsWith("*") && (tok.length > 1 || !empieza)) dentro = false;
  }
  return out;
};
const Titulo: React.FC<{ texto: string; inicio: number; acento: string; acento2: string; tam?: number }> = ({ texto, inicio, acento, acento2, tam = 104 }) => {
  const f = useCurrentFrame();
  const lineas = partes(texto);
  const acentos = marcarAcento(texto);
  let k = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lineas.map((ws, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap", gap: "0 22px" }}>
          {ws.map((w) => {
            const idx = k++;
            const t = ev(f, inicio + idx * 3, 18);
            const a = acentos[idx];
            return (
              <span key={idx} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 8, marginBottom: -8 }}>
                <span
                  style={{
                    display: "inline-block",
                    transform: `translateY(${(1 - t) * 110}%) rotate(${(1 - t) * 6}deg)`,
                    fontFamily: F.titulo, fontWeight: 700, fontSize: tam, lineHeight: 1.02, letterSpacing: -2.5,
                    color: C.blanco,
                    ...(a
                      ? { backgroundImage: `linear-gradient(92deg, ${acento} 0%, ${acento2} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 4px 18px rgba(0,0,0,0.6))" }
                      : {}),
                    textShadow: a ? "none" : "0 6px 30px rgba(0,0,0,0.45)",
                  }}
                >
                  {w.w}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Kicker: React.FC<{ texto: string; inicio: number; acento: string }> = ({ texto, inicio, acento }) => {
  const f = useCurrentFrame();
  const t = ev(f, inicio, 16);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: t, transform: `translateX(${(1 - t) * -30}px)`, marginBottom: 26 }}>
      <div style={{ width: 56 * t, height: 4, background: acento, borderRadius: 2 }} />
      <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: acento, textTransform: "uppercase" }}>{texto}</span>
    </div>
  );
};

// ---------------------------------------------------------------- tarjetas de interfaz (vidrio)
const Vidrio: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: C.vidrio, border: `1.5px solid ${C.borde}`, borderRadius: 36,
      backdropFilter: "blur(22px) saturate(140%)", WebkitBackdropFilter: "blur(22px) saturate(140%)",
      boxShadow: "0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)", ...style,
    }}
  >
    {children}
  </div>
);
const col = (e: "rojo" | "ambar" | "verde") => (e === "rojo" ? C.rojo : e === "ambar" ? C.ambar : C.verde);
const etq = (e: "rojo" | "ambar" | "verde") => (e === "rojo" ? "Sin gestionar" : e === "ambar" ? "Empresa avisada" : "Resuelta");

const Entrada: React.FC<{ inicio: number; children: React.ReactNode; desde?: "abajo" | "derecha" | "arriba" }> = ({ inicio, children, desde = "abajo" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - inicio, fps, config: { damping: 16, stiffness: 120, mass: 0.9 } });
  const off = (1 - s) * 140;
  const tr = desde === "abajo" ? `translateY(${off}px)` : desde === "arriba" ? `translateY(${-off}px)` : `translateX(${off}px)`;
  return <div style={{ opacity: Math.min(1, s * 1.4), transform: `${tr} scale(${0.94 + 0.06 * s})` }}>{children}</div>;
};

const Toast: React.FC<{ ui: Extract<UI, { tipo: "toast" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const c = col(ui.color ?? "rojo");
  const pulso = 1 + 0.5 * Math.max(0, Math.sin((f - inicio) / 5));
  return (
    <Entrada inicio={inicio} desde="arriba">
      <Vidrio style={{ padding: "30px 34px", display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ position: "relative", width: 96, height: 96, borderRadius: 28, background: c, display: "grid", placeItems: "center", boxShadow: `0 0 ${30 * pulso}px ${c}` }}>
          <BellRing size={52} color="#fff" strokeWidth={2.4} style={{ transform: `rotate(${Math.sin(f / 2.2) * 12}deg)` }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 40, color: C.blanco }}>{ui.titulo}</span>
          <span style={{ fontFamily: F.texto, fontWeight: 600, fontSize: 30, color: C.suave }}>{ui.texto}</span>
        </div>
        <span style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 26, color: C.suave }}>ahora</span>
      </Vidrio>
    </Entrada>
  );
};

const Chat: React.FC<{ ui: Extract<UI, { tipo: "chat" }>; inicio: number; dur: number; acento: string }> = ({ ui, inicio, dur, acento }) => {
  const f = useCurrentFrame();
  const n = ui.mensajes.length;
  const paso = Math.max(18, Math.floor((dur - inicio - 30) / n));
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "26px 32px", borderBottom: `1px solid ${C.borde}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: `linear-gradient(135deg, ${acento}, #6D5BFF)`, display: "grid", placeItems: "center" }}>
            <Sparkles size={34} color="#fff" />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 32, color: C.blanco }}>{ui.cabecera ?? "ComunIA · Averías"}</span>
            <span style={{ fontFamily: F.texto, fontWeight: 600, fontSize: 24, color: C.verde }}>en línea</span>
          </div>
          <MessageCircle size={36} color={C.suave} style={{ marginLeft: "auto" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "28px 28px 34px" }}>
          {ui.mensajes.map((m, i) => {
            const t0 = inicio + 10 + i * paso;
            const escribiendo = m.de === "agente" && f >= t0 - 14 && f < t0;
            if (f < t0 - (m.de === "agente" ? 14 : 0)) return null;
            const s = ev(f, t0, 12);
            const yo = m.de === "vecino";
            return (
              <div key={i} style={{ display: "flex", justifyContent: yo ? "flex-start" : "flex-end" }}>
                <div
                  style={{
                    maxWidth: "82%", padding: "20px 26px", borderRadius: 30,
                    borderBottomLeftRadius: yo ? 8 : 30, borderBottomRightRadius: yo ? 30 : 8,
                    background: yo ? "rgba(255,255,255,0.12)" : `linear-gradient(135deg, ${acento}, #4F46E5)`,
                    fontFamily: F.texto, fontWeight: 600, fontSize: 32, lineHeight: 1.3, color: C.blanco,
                    transform: `scale(${escribiendo ? 1 : 0.85 + 0.15 * s})`, transformOrigin: yo ? "left bottom" : "right bottom",
                    opacity: escribiendo ? 1 : s,
                  }}
                >
                  {escribiendo ? (
                    <span style={{ display: "flex", gap: 8, padding: "6px 4px" }}>
                      {[0, 1, 2].map((d) => (
                        <span key={d} style={{ width: 12, height: 12, borderRadius: 6, background: "#fff", opacity: 0.4 + 0.6 * Math.abs(Math.sin((f + d * 4) / 4)) }} />
                      ))}
                    </span>
                  ) : (
                    m.texto
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Vidrio>
    </Entrada>
  );
};

const Estados: React.FC<{ ui: Extract<UI, { tipo: "estados" }>; inicio: number; dur: number }> = ({ ui, inicio, dur }) => {
  const f = useCurrentFrame();
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "28px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 34, color: C.blanco }}>{ui.titulo ?? "Incidencias"}</span>
          <span style={{ fontFamily: F.mono, fontSize: 24, color: C.suave }}>Panel ComunIA</span>
        </div>
        {ui.filas.map((r, i) => {
          const t = ev(f, inicio + 8 + i * 7, 14);
          // la fila animada pasa rojo -> ámbar -> verde
          let e = r.estado;
          if (r.animar) {
            const p = (f - inicio) / Math.max(1, dur - inicio);
            e = p < 0.38 ? "rojo" : p < 0.7 ? "ambar" : "verde";
          }
          const c = col(e);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 8px", borderTop: i ? `1px solid ${C.borde}` : "none", opacity: t, transform: `translateX(${(1 - t) * 60}px)` }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: c, boxShadow: `0 0 18px ${c}` }} />
              <span style={{ fontFamily: F.texto, fontWeight: 600, fontSize: 31, color: C.blanco, flex: 1 }}>{r.texto}</span>
              <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 24, color: c, background: `${c}22`, border: `1.5px solid ${c}66`, padding: "10px 18px", borderRadius: 999 }}>{(!r.animar && r.etiqueta) || etq(e)}</span>
            </div>
          );
        })}
      </Vidrio>
    </Entrada>
  );
};

const Flujo: React.FC<{ ui: Extract<UI, { tipo: "flujo" }>; inicio: number; acento: string }> = ({ ui, inicio, acento }) => {
  const f = useCurrentFrame();
  const iconos = [User, Sparkles, Wrench];
  const W = 900;
  const xs = [110, 450, 790];
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "40px 0 34px", width: W }}>
        <div style={{ position: "relative", height: 250 }}>
          <svg width={W} height={250} style={{ position: "absolute", inset: 0 }}>
            {[0, 1].map((k) => {
              const t = ev(f, inicio + 14 + k * 18, 18, INOUT);
              const x1 = xs[k] + 80, x2 = xs[k + 1] - 80;
              const dot = ((f - inicio) % 30) / 30;
              return (
                <g key={k}>
                  <line x1={x1} y1={90} x2={x1 + (x2 - x1) * t} y2={90} stroke={acento} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
                  {t >= 1 && <circle cx={x1 + (x2 - x1) * dot} cy={90} r={9} fill="#fff" style={{ filter: `drop-shadow(0 0 10px ${acento})` }} />}
                </g>
              );
            })}
          </svg>
          {ui.nodos.map((n, i) => {
            const Ico = iconos[i];
            const t = ev(f, inicio + i * 18, 16);
            return (
              <div key={i} style={{ position: "absolute", left: xs[i] - 80, top: 10, width: 160, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, opacity: t, transform: `scale(${0.7 + 0.3 * t})` }}>
                <div style={{ width: 160, height: 160, borderRadius: 48, display: "grid", placeItems: "center", background: i === 1 ? `linear-gradient(135deg, ${acento}, #6D5BFF)` : "rgba(255,255,255,0.1)", border: `1.5px solid ${C.borde}`, boxShadow: i === 1 ? `0 0 50px ${acento}88` : "none" }}>
                  <Ico size={72} color="#fff" strokeWidth={2} />
                </div>
                <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 28, color: C.blanco, textAlign: "center", whiteSpace: "nowrap" }}>{n}</span>
              </div>
            );
          })}
        </div>
        {ui.llamada && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
            {(() => {
              const t0 = inicio + 54;
              const t = ev(f, t0, 14);
              const hecho = f > t0 + 40;
              const c = hecho ? C.verde : acento;
              return (
                <div style={{ opacity: t, transform: `translateY(${(1 - t) * 30}px)`, display: "flex", alignItems: "center", gap: 18, padding: "18px 30px", borderRadius: 999, background: `${c}22`, border: `1.5px solid ${c}88` }}>
                  {hecho ? <Check size={36} color={c} strokeWidth={3} /> : <Phone size={34} color={c} style={{ transform: `rotate(${Math.sin(f / 1.6) * 14}deg)` }} />}
                  <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 30, color: C.blanco }}>{hecho ? "Empresa avisada" : ui.llamada}</span>
                </div>
              );
            })()}
          </div>
        )}
      </Vidrio>
    </Entrada>
  );
};

const Tachado: React.FC<{ ui: Extract<UI, { tipo: "tachado" }>; inicio: number; acento: string }> = ({ ui, inicio, acento }) => {
  const f = useCurrentFrame();
  const raya = ev(f, inicio + 16, 14, INOUT);
  const nuevo = ev(f, inicio + 32, 16);
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "34px 36px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: 1 - 0.55 * raya }}>
          <div style={{ width: 70, height: 70, borderRadius: 22, background: `${C.rojo}33`, display: "grid", placeItems: "center" }}><X size={42} color={C.rojo} strokeWidth={3} /></div>
          <span style={{ position: "relative", fontFamily: F.texto, fontWeight: 800, fontSize: 40, color: C.blanco }}>
            {ui.antes}
            <span style={{ position: "absolute", left: 0, top: "52%", height: 6, width: `${raya * 100}%`, background: C.rojo, borderRadius: 3 }} />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: nuevo, transform: `translateY(${(1 - nuevo) * 30}px)` }}>
          <div style={{ width: 70, height: 70, borderRadius: 22, background: `${C.verde}33`, display: "grid", placeItems: "center" }}><ShieldCheck size={42} color={C.verde} strokeWidth={2.6} /></div>
          <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 44, color: acento }}>{ui.despues}</span>
        </div>
      </Vidrio>
    </Entrada>
  );
};

const Pasos: React.FC<{ ui: Extract<UI, { tipo: "pasos" }>; inicio: number; acento: string }> = ({ ui, inicio, acento }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {ui.pasos.map((p, i) => (
        <Entrada key={i} inicio={inicio + i * 9} desde="derecha">
          <Vidrio style={{ padding: "24px 30px", display: "flex", alignItems: "center", gap: 24, borderRadius: 28 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg, ${acento}, #6D5BFF)`, display: "grid", placeItems: "center", fontFamily: F.titulo, fontWeight: 700, fontSize: 34, color: "#fff" }}>{i + 1}</div>
            <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 34, color: C.blanco }}>{p}</span>
            {f > inicio + i * 9 + 22 && <Check size={38} color={C.verde} strokeWidth={3} style={{ marginLeft: "auto" }} />}
          </Vidrio>
        </Entrada>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- marca
const Marca: React.FC<{ acento: string; acento2: string; tam?: number }> = ({ acento, acento2, tam = 40 }) => (
  <span style={{ fontFamily: F.titulo, fontWeight: 700, fontSize: tam, letterSpacing: -1, color: "#fff" }}>
    Comun
    <span style={{ backgroundImage: `linear-gradient(92deg, ${acento}, ${acento2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>IA</span>
  </span>
);

const Outro: React.FC<{ e: Escena; acento: string; acento2: string; dur: number }> = ({ e, acento, acento2, dur }) => {
  const f = useCurrentFrame();
  const t = ev(f, 4, 26);
  const brillo = interpolate(f, [10, 50], [-60, 160], cl);
  const tag = ev(f, 26, 18);
  const cta = ev(f, 42, 18);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: 450, background: `radial-gradient(circle, ${acento}44 0%, transparent 65%)`, transform: `scale(${0.6 + 0.4 * t + 0.03 * Math.sin(f / 12)})` }} />
      <div style={{ position: "relative", opacity: t, transform: `scale(${0.85 + 0.15 * t})`, filter: `blur(${(1 - t) * 18}px)` }}>
        <Marca acento={acento} acento2={acento2} tam={190} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, transparent ${brillo - 20}%, rgba(255,255,255,0.55) ${brillo}%, transparent ${brillo + 20}%)`, mixBlendMode: "overlay" }} />
      </div>
      <div style={{ opacity: tag, transform: `translateY(${(1 - tag) * 30}px)`, fontFamily: F.texto, fontWeight: 600, fontSize: 46, color: C.suave, textAlign: "center", padding: "0 80px" }}>{e.outro?.tagline}</div>
      <div style={{ opacity: cta, transform: `translateY(${(1 - cta) * 30}px) scale(${1 + 0.025 * Math.sin(f / 6)})`, padding: "24px 48px", borderRadius: 999, background: `linear-gradient(92deg, ${acento}, ${acento2})`, fontFamily: F.texto, fontWeight: 800, fontSize: 40, color: "#fff", boxShadow: `0 20px 60px ${acento}66` }}>
        {e.outro?.cta}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- escena
const EscenaV: React.FC<{ e: Escena; i: number; dur: number; plan: Plan; ultima: boolean }> = ({ e, i, dur, plan, ultima }) => {
  const f = useCurrentFrame();
  const acento = plan.acento ?? "#22D3EE";
  const acento2 = plan.acento2 ?? "#7C83FF";
  // transición: entra con zoom/blur, sale con fundido
  const entra = i === 0 ? 1 : ev(f, 0, SOLAPE, INOUT);
  const sale = ultima ? 1 : 1 - ev(f, dur - SOLAPE, SOLAPE, INOUT);
  const z = 1 + (1 - entra) * 0.12;
  const blur = (1 - entra) * 16;
  const arriba = (e.posicion ?? "arriba") === "arriba";
  return (
    <AbsoluteFill style={{ opacity: Math.min(entra, sale), transform: `scale(${z})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
      <Metraje src={e.media} dur={dur} i={i} />
      {e.outro ? (
        <Outro e={e} acento={acento} acento2={acento2} dur={dur} />
      ) : (
        <AbsoluteFill style={{ padding: "0 72px", justifyContent: "space-between", flexDirection: "column", paddingTop: 230, paddingBottom: 250 }}>
          <div style={{ order: arriba ? 0 : 1 }}>
            {e.kicker && <Kicker texto={e.kicker} inicio={4} acento={acento} />}
            {e.titulo && <Titulo texto={e.titulo} inicio={6} acento={acento} acento2={acento2} />}
            {e.sub && (
              <div style={{ marginTop: 26, fontFamily: F.texto, fontWeight: 600, fontSize: 38, lineHeight: 1.3, color: C.suave, opacity: ev(f, 22, 18) }}>{e.sub}</div>
            )}
          </div>
          <div style={{ order: arriba ? 1 : 0 }}>
            {e.ui?.tipo === "toast" && <Toast ui={e.ui} inicio={18} />}
            {e.ui?.tipo === "chat" && <Chat ui={e.ui} inicio={14} dur={dur} acento={acento} />}
            {e.ui?.tipo === "estados" && <Estados ui={e.ui} inicio={14} dur={dur} />}
            {e.ui?.tipo === "flujo" && <Flujo ui={e.ui} inicio={12} acento={acento} />}
            {e.ui?.tipo === "tachado" && <Tachado ui={e.ui} inicio={14} acento={acento} />}
            {e.ui?.tipo === "pasos" && <Pasos ui={e.ui} inicio={14} acento={acento} />}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- composición
export const Reel: React.FC<{ plan: Plan }> = ({ plan }) => {
  const f = useCurrentFrame();
  const total = duracionTotal(plan);
  const acento = plan.acento ?? "#22D3EE";
  const acento2 = plan.acento2 ?? "#7C83FF";
  let t = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: C.noche }}>
      {plan.escenas.map((e, i) => {
        const d = Math.round(e.dur * FPS);
        const desde = t;
        t += d - SOLAPE;
        return (
          <Sequence key={i} from={desde} durationInFrames={d}>
            <EscenaV e={e} i={i} dur={d} plan={plan} ultima={i === plan.escenas.length - 1} />
          </Sequence>
        );
      })}
      {/* barra de progreso + marca fija */}
      <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: `${(f / total) * 100}%`, background: `linear-gradient(90deg, ${acento}, ${acento2})` }} />
      <div style={{ position: "absolute", top: 90, left: 72, opacity: f < total - 150 ? 0.95 : interpolate(f, [total - 150, total - 130], [0.95, 0], cl) }}>
        <Marca acento={acento} acento2={acento2} tam={44} />
      </div>
      <Grano />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- portada
export const Portada: React.FC<{ plan: Plan }> = ({ plan }) => {
  const acento = plan.acento ?? "#22D3EE";
  const acento2 = plan.acento2 ?? "#7C83FF";
  const p = plan.portada!;
  return (
    <AbsoluteFill style={{ backgroundColor: C.noche }}>
      <AbsoluteFill>
        {p.media && <Img src={staticFile(p.media)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.15)" }} />}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,10,22,0.35) 0%, rgba(6,10,22,0.55) 45%, rgba(6,10,22,0.95) 100%)" }} />
        <AbsoluteFill style={{ background: "rgba(20,40,110,0.2)", mixBlendMode: "color" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px", gap: 10 }}>
        {p.kicker && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 56, height: 4, background: acento }} />
            <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: acento }}>{p.kicker}</span>
          </div>
        )}
        {p.lineas.map((l, i) => {
          const a = l.startsWith("*");
          return (
            <div key={i} style={{ fontFamily: F.titulo, fontWeight: 700, fontSize: i === 0 ? 150 : 120, lineHeight: 1, letterSpacing: -4, color: "#fff", ...(a ? { backgroundImage: `linear-gradient(92deg, ${acento}, ${acento2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : {}) }}>
              {l.replace(/\*/g, "")}
            </div>
          );
        })}
        <div style={{ marginTop: 40 }}><Marca acento={acento} acento2={acento2} tam={60} /></div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
