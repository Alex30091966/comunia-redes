// Reel profesional de ComunIA: metraje real (Pexels) animado + tipografía cinética + tarjetas de interfaz.
// plan.estilo elige el sistema visual: "vidrio" (el original), "editorial", "claro", "partido" o "cine".
import React, { createContext, useContext } from "react";
import {
  AbsoluteFill, Img, OffthreadVideo, Easing, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Sequence, continueRender, delayRender,
} from "remotion";
import {
  BellRing, Check, Phone, User, Sparkles, Wrench, ShieldCheck, X, MessageCircle, Search, FileText, Download,
  CalendarDays, Mail, Paperclip, PhoneIncoming, Building2, FileSpreadsheet, MousePointer2, PenLine, Vote, Clock,
} from "lucide-react";

// ---------------------------------------------------------------- tipos
type Sem = "rojo" | "ambar" | "verde";
type UI =
  | { tipo: "toast"; titulo: string; texto: string; color?: Sem }
  | { tipo: "chat"; cabecera?: string; mensajes: { de: "vecino" | "agente"; texto: string }[] }
  | { tipo: "estados"; titulo?: string; filas: { texto: string; estado: Sem; animar?: boolean; etiqueta?: string }[] }
  | { tipo: "flujo"; nodos: [string, string, string]; llamada?: string; hecho?: string }
  | { tipo: "tachado"; antes: string; despues: string }
  | { tipo: "pasos"; pasos: string[] }
  | { tipo: "busqueda"; consulta: string; nombre: string; detalle: string; estado?: Sem }
  | { tipo: "documento"; titulo: string; lineas: string[]; sello?: string }
  | { tipo: "calendario"; dia: string; eventos: { hora: string; texto: string }[] }
  | { tipo: "votacion"; pregunta: string; opciones: { texto: string; pct: number }[]; mayoria: number; resultado?: string }
  | { tipo: "mito"; mito: string; realidad: string }
  | { tipo: "semaforo"; titulo?: string; filas: { texto: string; estado: Sem; cuando: string }[] }
  | { tipo: "email"; de: string; asunto: string; lineas: string[] }
  | { tipo: "confirmar"; peticion: string; accion: string; detalle: string }
  | { tipo: "llamada"; quien: string; frases: string[] }
  | { tipo: "ficha"; nombre: string; direccion: string; pestanas: string[]; filas: { k: string; v: string }[] }
  | { tipo: "excel"; archivo: string; filas: string[]; total: string }
  | { tipo: "firma"; nombre: string; texto: string }
  | { tipo: "lista"; titulo?: string; items: string[] };
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
type Estilo = "vidrio" | "editorial" | "claro" | "partido" | "cine";
export type Plan = {
  marca?: string; estilo?: Estilo; acento?: string; acento2?: string; tinte?: string; tamTitulo?: number;
  escenas: Escena[]; portada?: { media: string; lineas: string[]; kicker?: string };
};

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
  papel: "#F3EFE7",
  tinta: "#0D1222",
};
const F = { titulo: "SG", texto: "IN", mono: "JB" };
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const INOUT = Easing.bezier(0.65, 0, 0.35, 1);
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ev = (f: number, a: number, d: number, e = OUT) => interpolate(f, [a, a + d], [0, 1], { ...cl, easing: e });

// texto legible sobre el color de acento
const lum = (hex: string) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const sobre = (hex: string) => (lum(hex) > 0.4 ? "#0A0A0A" : "#FFFFFF");
// tema de tarjetas según el estilo
type Tema = { estilo: Estilo; card: string; texto: string; suave: string; borde: string; radio: number; sombra: string; blur: boolean; burbuja: string; acento: string; acento2: string };
const temaDe = (estilo: Estilo, acento: string, acento2: string): Tema => {
  const claro = estilo === "claro" || estilo === "editorial";
  return {
    estilo, acento, acento2,
    card: claro ? "#FFFFFF" : estilo === "partido" ? "rgba(18,20,28,0.86)" : C.vidrio,
    texto: claro ? C.tinta : C.blanco,
    suave: claro ? "rgba(13,18,34,0.62)" : C.suave,
    borde: claro ? "rgba(13,18,34,0.10)" : C.borde,
    radio: estilo === "editorial" ? 18 : estilo === "partido" ? 28 : 36,
    sombra: claro ? "0 30px 70px rgba(10,14,30,0.28)" : "0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
    blur: !claro,
    burbuja: claro ? "rgba(13,18,34,0.07)" : "rgba(255,255,255,0.12)",
  };
};
const TemaCtx = createContext<Tema>(temaDe("vidrio", "#22D3EE", "#7C83FF"));
const useTema = () => useContext(TemaCtx);

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
const Video: React.FC<{ src: string; dur: number; i: number; fuerza?: number }> = ({ src, dur, i, fuerza = 1 }) => {
  const f = useCurrentFrame();
  const p = f / dur;
  const dir = i % 4;
  const s = interpolate(p, [0, 1], [1.08 + 0.04 * fuerza, 1.08 + 0.18 * fuerza]);
  const x = interpolate(p, [0, 1], dir === 0 ? [-30, 30] : dir === 1 ? [30, -30] : [0, 0]);
  const y = interpolate(p, [0, 1], dir === 2 ? [-40, 40] : dir === 3 ? [40, -40] : [0, 0]);
  const esVideo = /\.(mp4|mov|webm)$/i.test(src);
  return (
    <AbsoluteFill style={{ transform: `translate(${x * fuerza}px, ${y * fuerza}px) scale(${s})` }}>
      {esVideo ? (
        <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
    </AbsoluteFill>
  );
};

const Metraje: React.FC<{ src?: string; dur: number; i: number; plan: Plan }> = ({ src, dur, i, plan }) => {
  const estilo = plan.estilo ?? "vidrio";
  const tinte = plan.tinte ?? "rgba(20,40,110,0.18)";
  if (estilo === "claro") {
    // marco redondeado sobre papel
    const f = useCurrentFrame();
    const t = ev(f, 0, 20);
    return (
      <AbsoluteFill style={{ backgroundColor: C.papel }}>
        <AbsoluteFill style={{ background: `radial-gradient(90% 50% at 85% 100%, ${plan.acento}22 0%, transparent 70%)` }} />
        {src && (
          <div style={{ position: "absolute", left: 48, top: 170, width: 984, height: 860, borderRadius: 48, overflow: "hidden", boxShadow: "0 40px 80px rgba(13,18,34,0.25)", transform: `scale(${0.97 + 0.03 * t})` }}>
            <Video src={src} dur={dur} i={i} fuerza={0.7} />
            <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.25) 100%)" }} />
          </div>
        )}
      </AbsoluteFill>
    );
  }
  if (estilo === "partido") {
    return (
      <AbsoluteFill style={{ backgroundColor: "#0C0D12" }}>
        {src && (
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1000, overflow: "hidden" }}>
            <Video src={src} dur={dur} i={i} />
            <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(12,13,18,0.55) 0%, rgba(12,13,18,0) 25%, rgba(12,13,18,0) 70%, rgba(12,13,18,0.9) 100%)" }} />
            <AbsoluteFill style={{ background: tinte, mixBlendMode: "color" }} />
          </div>
        )}
        <AbsoluteFill style={{ background: `radial-gradient(70% 30% at 0% 100%, ${plan.acento}30 0%, transparent 70%)` }} />
      </AbsoluteFill>
    );
  }
  if (estilo === "cine") {
    return (
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        {src && <Video src={src} dur={dur} i={i} fuerza={0.8} />}
        <AbsoluteFill style={{ background: "radial-gradient(80% 60% at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%)" }} />
        <AbsoluteFill style={{ background: tinte, mixBlendMode: "soft-light" }} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 75%)" }} />
      </AbsoluteFill>
    );
  }
  if (estilo === "editorial") {
    return (
      <AbsoluteFill style={{ backgroundColor: "#0A0A0A", overflow: "hidden" }}>
        {src && <Video src={src} dur={dur} i={i} />}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.88) 82%)" }} />
        <AbsoluteFill style={{ background: tinte, mixBlendMode: "color" }} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: C.noche, overflow: "hidden" }}>
      {src ? <Video src={src} dur={dur} i={i} /> : <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 20%, #1B2A55 0%, #060A16 60%)" }} />}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,10,22,0.9) 0%, rgba(6,10,22,0.55) 30%, rgba(6,10,22,0.15) 48%, rgba(6,10,22,0.3) 62%, rgba(6,10,22,0.92) 100%)" }} />
      <AbsoluteFill style={{ background: tinte, mixBlendMode: "color" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- grano + viñeta (encima de todo)
const Grano: React.FC<{ claro?: boolean }> = ({ claro }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`grano${f % 4}.png`)})`, backgroundSize: "540px 960px", opacity: claro ? 0.05 : 0.07, mixBlendMode: "overlay" }} />
      {!claro && <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- título cinético
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
const Titulo: React.FC<{ texto: string; inicio: number; tam?: number; centro?: boolean }> = ({ texto, inicio, tam = 104, centro }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const { acento, acento2, estilo } = T;
  const lineas = texto.split("/").map((l) => l.trim().split(/\s+/).map((w) => w.replace(/\*/g, "")));
  const acentos = marcarAcento(texto);
  const mayus = estilo === "editorial";
  let k = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: mayus ? 10 : 4, alignItems: centro ? "center" : "flex-start" }}>
      {lineas.map((ws, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap", gap: mayus ? "0 0" : "0 22px", justifyContent: centro ? "center" : "flex-start" }}>
          {ws.map((w) => {
            const idx = k++;
            const t = ev(f, inicio + idx * 3, 18);
            const a = acentos[idx];
            const base: React.CSSProperties = {
              display: "inline-block",
              transform: `translateY(${(1 - t) * 110}%) rotate(${(1 - t) * (mayus ? 0 : 6)}deg)`,
              fontFamily: mayus ? F.texto : F.titulo, fontWeight: mayus ? 800 : 700, fontSize: mayus ? tam * 0.92 : tam,
              lineHeight: mayus ? 1.0 : 1.02, letterSpacing: mayus ? -3 : -2.5,
              textTransform: mayus ? "uppercase" : "none",
              color: estilo === "claro" ? C.tinta : C.blanco,
              textShadow: estilo === "claro" ? "none" : "0 6px 30px rgba(0,0,0,0.45)",
            };
            let estiloA: React.CSSProperties = {};
            if (a) {
              if (estilo === "editorial") estiloA = { color: "#0A0A0A", background: acento, padding: "0 20px 0 12px", textShadow: "none" };
              else if (estilo === "claro") estiloA = { color: acento };
              else if (estilo === "partido") estiloA = { color: acento, textShadow: `0 0 40px ${acento}55` };
              else estiloA = { backgroundImage: `linear-gradient(92deg, ${acento} 0%, ${acento2} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 4px 18px rgba(0,0,0,0.6))", textShadow: "none" };
            }
            const raya = estilo === "partido" && a ? ev(f, inicio + idx * 3 + 12, 14, INOUT) : 0;
            return (
              <span key={idx} style={{ position: "relative", display: "inline-block", overflow: "hidden", paddingBottom: 12, marginBottom: -12 }}>
                <span style={{ ...base, ...(mayus && !a ? { paddingRight: 20 } : {}), ...estiloA }}>{w}</span>
                {estilo === "partido" && a && <span style={{ position: "absolute", left: 0, bottom: 6, height: 8, width: `${raya * 100}%`, background: acento2, borderRadius: 4 }} />}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Kicker: React.FC<{ texto: string; inicio: number; i: number; n: number }> = ({ texto, inicio, i, n }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const t = ev(f, inicio, 16);
  if (T.estilo === "editorial") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: t, marginBottom: 30, fontFamily: F.mono, fontSize: 30, color: "#fff", letterSpacing: 2 }}>
        <span style={{ color: T.acento }}>{String(i + 1).padStart(2, "0")}/{String(n).padStart(2, "0")}</span>
        <span style={{ width: 70 * t, height: 2, background: "#fff" }} />
        <span style={{ textTransform: "uppercase" }}>{texto}</span>
      </div>
    );
  }
  if (T.estilo === "partido") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 12, opacity: t, transform: `translateY(${(1 - t) * 20}px)`, marginBottom: 30, padding: "12px 24px", borderRadius: 999, background: `${T.acento}22`, border: `2px solid ${T.acento}` }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: T.acento }} />
        <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 28, letterSpacing: 3, color: T.acento, textTransform: "uppercase" }}>{texto}</span>
      </div>
    );
  }
  if (T.estilo === "cine") {
    return (
      <div style={{ opacity: t, marginBottom: 26, fontFamily: F.mono, fontSize: 32, letterSpacing: 8, color: "#fff", textTransform: "uppercase", textAlign: "center", textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>
        — {texto} —
      </div>
    );
  }
  const color = T.estilo === "claro" ? C.tinta : T.acento;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: t, transform: `translateX(${(1 - t) * -30}px)`, marginBottom: 26 }}>
      <div style={{ width: 56 * t, height: 4, background: T.acento, borderRadius: 2 }} />
      <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 30, letterSpacing: 6, color, textTransform: "uppercase" }}>{texto}</span>
    </div>
  );
};

// ---------------------------------------------------------------- tarjetas de interfaz
const Vidrio: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const T = useTema();
  return (
    <div
      style={{
        background: T.card, border: `1.5px solid ${T.borde}`, borderRadius: T.radio,
        ...(T.blur ? { backdropFilter: "blur(22px) saturate(140%)", WebkitBackdropFilter: "blur(22px) saturate(140%)" } : {}),
        boxShadow: T.sombra, ...style,
      }}
    >
      {children}
    </div>
  );
};
const col = (e: Sem) => (e === "rojo" ? C.rojo : e === "ambar" ? C.ambar : C.verde);
const etq = (e: Sem) => (e === "rojo" ? "Sin gestionar" : e === "ambar" ? "Empresa avisada" : "Resuelta");
const Txt: React.FC<{ t?: number; w?: number; s?: boolean; c?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ t = 32, w = 800, s, c, style, children }) => {
  const T = useTema();
  return <span style={{ fontFamily: F.texto, fontWeight: w, fontSize: t, color: c ?? (s ? T.suave : T.texto), lineHeight: 1.25, ...style }}>{children}</span>;
};
const Icono: React.FC<{ I: any; c: string; tam?: number; caja?: number }> = ({ I, c, tam = 40, caja = 76 }) => (
  <div style={{ width: caja, height: caja, borderRadius: caja * 0.3, background: `${c}26`, display: "grid", placeItems: "center", flexShrink: 0 }}>
    <I size={tam} color={c} strokeWidth={2.5} />
  </div>
);

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
        <div style={{ position: "relative", width: 96, height: 96, borderRadius: 28, background: c, display: "grid", placeItems: "center", boxShadow: `0 0 ${30 * pulso}px ${c}`, flexShrink: 0 }}>
          <BellRing size={52} color="#fff" strokeWidth={2.4} style={{ transform: `rotate(${Math.sin(f / 2.2) * 12}deg)` }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Txt t={40}>{ui.titulo}</Txt>
          <Txt t={30} w={600} s>{ui.texto}</Txt>
        </div>
        <span style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 26, color: useTema().suave }}>ahora</span>
      </Vidrio>
    </Entrada>
  );
};

const Chat: React.FC<{ ui: Extract<UI, { tipo: "chat" }>; inicio: number; dur: number }> = ({ ui, inicio, dur }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const n = ui.mensajes.length;
  const paso = Math.max(18, Math.floor((dur - inicio - 30) / n));
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "26px 32px", borderBottom: `1px solid ${T.borde}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: `linear-gradient(135deg, ${T.acento}, ${T.acento2})`, display: "grid", placeItems: "center" }}>
            <Sparkles size={34} color="#fff" />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Txt t={32}>{ui.cabecera ?? "ComunIA · Averías"}</Txt>
            <Txt t={24} w={600} c={C.verde}>en línea</Txt>
          </div>
          <MessageCircle size={36} color={T.suave} style={{ marginLeft: "auto" }} />
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
                    background: yo ? T.burbuja : `linear-gradient(135deg, ${T.acento}, ${T.acento2})`,
                    fontFamily: F.texto, fontWeight: 600, fontSize: 32, lineHeight: 1.3, color: yo ? T.texto : sobre(T.acento),
                    transform: `scale(${escribiendo ? 1 : 0.85 + 0.15 * s})`, transformOrigin: yo ? "left bottom" : "right bottom",
                    opacity: escribiendo ? 1 : s,
                  }}
                >
                  {escribiendo ? (
                    <span style={{ display: "flex", gap: 8, padding: "6px 4px" }}>
                      {[0, 1, 2].map((d) => (
                        <span key={d} style={{ width: 12, height: 12, borderRadius: 6, background: sobre(T.acento), opacity: 0.4 + 0.6 * Math.abs(Math.sin((f + d * 4) / 4)) }} />
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
  const T = useTema();
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "28px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <Txt t={34}>{ui.titulo ?? "Incidencias"}</Txt>
          <span style={{ fontFamily: F.mono, fontSize: 24, color: T.suave }}>Panel ComunIA</span>
        </div>
        {ui.filas.map((r, i) => {
          const t = ev(f, inicio + 8 + i * 7, 14);
          let e = r.estado;
          if (r.animar) {
            const p = (f - inicio) / Math.max(1, dur - inicio);
            e = p < 0.38 ? "rojo" : p < 0.7 ? "ambar" : "verde";
          }
          const c = col(e);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 8px", borderTop: i ? `1px solid ${T.borde}` : "none", opacity: t, transform: `translateX(${(1 - t) * 60}px)` }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: c, boxShadow: `0 0 18px ${c}` }} />
              <Txt t={31} w={600} style={{ flex: 1 }}>{r.texto}</Txt>
              <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 24, color: c, background: `${c}22`, border: `1.5px solid ${c}66`, padding: "10px 18px", borderRadius: 999 }}>{(!r.animar && r.etiqueta) || etq(e)}</span>
            </div>
          );
        })}
      </Vidrio>
    </Entrada>
  );
};

const Flujo: React.FC<{ ui: Extract<UI, { tipo: "flujo" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const iconos = [User, Sparkles, Wrench];
  const W = 936;
  const xs = [140, 468, 796];
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
                  <line x1={x1} y1={90} x2={x1 + (x2 - x1) * t} y2={90} stroke={T.acento} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
                  {t >= 1 && <circle cx={x1 + (x2 - x1) * dot} cy={90} r={9} fill={T.acento2} />}
                </g>
              );
            })}
          </svg>
          {ui.nodos.map((n, i) => {
            const Ico = iconos[i];
            const t = ev(f, inicio + i * 18, 16);
            return (
              <div key={i} style={{ position: "absolute", left: xs[i] - 80, top: 10, width: 160, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, opacity: t, transform: `scale(${0.7 + 0.3 * t})` }}>
                <div style={{ width: 160, height: 160, borderRadius: 48, display: "grid", placeItems: "center", background: i === 1 ? `linear-gradient(135deg, ${T.acento}, ${T.acento2})` : T.burbuja, border: `1.5px solid ${T.borde}`, boxShadow: i === 1 ? `0 0 50px ${T.acento}88` : "none" }}>
                  <Ico size={72} color={i === 1 ? "#fff" : T.texto} strokeWidth={2} />
                </div>
                <Txt t={28} style={{ textAlign: "center", whiteSpace: "nowrap" }}>{n}</Txt>
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
              const c = hecho ? C.verde : T.acento;
              return (
                <div style={{ opacity: t, transform: `translateY(${(1 - t) * 30}px)`, display: "flex", alignItems: "center", gap: 18, padding: "18px 30px", borderRadius: 999, background: `${c}22`, border: `1.5px solid ${c}88` }}>
                  {hecho ? <Check size={36} color={c} strokeWidth={3} /> : <Phone size={34} color={c} style={{ transform: `rotate(${Math.sin(f / 1.6) * 14}deg)` }} />}
                  <Txt t={30}>{hecho ? ui.hecho ?? "Empresa avisada" : ui.llamada}</Txt>
                </div>
              );
            })()}
          </div>
        )}
      </Vidrio>
    </Entrada>
  );
};

const Tachado: React.FC<{ ui: Extract<UI, { tipo: "tachado" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const raya = ev(f, inicio + 16, 14, INOUT);
  const nuevo = ev(f, inicio + 32, 16);
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "34px 36px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: 1 - 0.55 * raya }}>
          <Icono I={X} c={C.rojo} tam={42} caja={70} />
          <span style={{ position: "relative" }}>
            <Txt t={40}>{ui.antes}</Txt>
            <span style={{ position: "absolute", left: 0, top: "52%", height: 6, width: `${raya * 100}%`, background: C.rojo, borderRadius: 3 }} />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: nuevo, transform: `translateY(${(1 - nuevo) * 30}px)` }}>
          <Icono I={ShieldCheck} c={C.verde} tam={42} caja={70} />
          <Txt t={44} c={T.estilo === "claro" || T.estilo === "editorial" ? C.tinta : T.acento}>{ui.despues}</Txt>
        </div>
      </Vidrio>
    </Entrada>
  );
};

const Pasos: React.FC<{ ui: Extract<UI, { tipo: "pasos" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {ui.pasos.map((p, i) => (
        <Entrada key={i} inicio={inicio + i * 9} desde="derecha">
          <Vidrio style={{ padding: "24px 30px", display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg, ${T.acento}, ${T.acento2})`, display: "grid", placeItems: "center", fontFamily: F.titulo, fontWeight: 700, fontSize: 34, color: sobre(T.acento), flexShrink: 0 }}>{i + 1}</div>
            <Txt t={34}>{p}</Txt>
            {f > inicio + i * 9 + 22 && <Check size={38} color={C.verde} strokeWidth={3} style={{ marginLeft: "auto", flexShrink: 0 }} />}
          </Vidrio>
        </Entrada>
      ))}
    </div>
  );
};

// ---- nuevas tarjetas
const escribe = (texto: string, f: number, desde: number, vel = 1.6) => texto.slice(0, Math.max(0, Math.floor((f - desde) / vel)));
const Cursor: React.FC<{ f: number; c: string }> = ({ f, c }) => <span style={{ display: "inline-block", width: 4, height: 38, background: c, marginLeft: 4, opacity: Math.floor(f / 8) % 2 ? 0 : 1, verticalAlign: "middle" }} />;

const Busqueda: React.FC<{ ui: Extract<UI, { tipo: "busqueda" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const t0 = inicio + 10;
  const fin = t0 + ui.consulta.length * 1.6;
  const r = ev(f, fin + 8, 16);
  const c = col(ui.estado ?? "verde");
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 26px", borderRadius: T.radio * 0.6, background: T.burbuja, border: `2px solid ${T.acento}` }}>
          <Search size={40} color={T.acento} strokeWidth={2.6} />
          <span style={{ fontFamily: F.mono, fontSize: 36, color: T.texto }}>{escribe(ui.consulta, f, t0)}</span>
          {f < fin + 8 && <Cursor f={f} c={T.acento} />}
        </div>
        <div style={{ height: 150 * r, overflow: "hidden", opacity: r }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "30px 10px 6px" }}>
            <div style={{ width: 92, height: 92, borderRadius: 46, background: `linear-gradient(135deg, ${T.acento}, ${T.acento2})`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <User size={48} color="#fff" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <Txt t={36}>{ui.nombre}</Txt>
              <Txt t={26} w={600} s>{ui.detalle}</Txt>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: c, boxShadow: `0 0 16px ${c}` }} />
          </div>
        </div>
      </Vidrio>
    </Entrada>
  );
};

const Documento: React.FC<{ ui: Extract<UI, { tipo: "documento" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const sello = ev(f, inicio + 26 + ui.lineas.length * 6, 10);
  const descarga = ev(f, inicio + 46 + ui.lineas.length * 6, 14);
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "34px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 26 }}>
          <Icono I={FileText} c={T.acento} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Txt t={36}>{ui.titulo}</Txt>
            <span style={{ fontFamily: F.mono, fontSize: 24, color: T.suave }}>PDF · generado por ComunIA</span>
          </div>
        </div>
        {ui.lineas.map((l, i) => {
          const t = ev(f, inicio + 12 + i * 6, 12);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderTop: `1px solid ${T.borde}`, opacity: t, transform: `translateX(${(1 - t) * 40}px)` }}>
              <Txt t={28} w={600} s>{l}</Txt>
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22 }}>
          {ui.sello ? (
            <div style={{ transform: `rotate(-6deg) scale(${2 - sello})`, opacity: sello, padding: "10px 22px", border: `4px solid ${C.verde}`, borderRadius: 12, fontFamily: F.texto, fontWeight: 800, fontSize: 28, color: C.verde, letterSpacing: 2, textTransform: "uppercase" }}>{ui.sello}</div>
          ) : <span />}
          <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: descarga, padding: "14px 24px", borderRadius: 999, background: `linear-gradient(92deg, ${T.acento}, ${T.acento2})` }}>
            <Download size={30} color={sobre(T.acento)} strokeWidth={2.6} />
            <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 28, color: sobre(T.acento) }}>Descargar</span>
          </div>
        </div>
      </Vidrio>
    </Entrada>
  );
};

const Calendario: React.FC<{ ui: Extract<UI, { tipo: "calendario" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "28px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
          <CalendarDays size={40} color={T.acento} strokeWidth={2.4} />
          <Txt t={34}>{ui.dia}</Txt>
          <span style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 24, color: T.suave }}>Agenda</span>
        </div>
        {ui.eventos.map((e, i) => {
          const t0 = inicio + 12 + i * 14;
          const t = ev(f, t0, 14);
          const { fps } = useVideoConfig();
          const s = spring({ frame: f - t0, fps, config: { damping: 11, stiffness: 160 } });
          return (
            <div key={i} style={{ display: "flex", alignItems: "stretch", gap: 20, padding: "14px 0", borderTop: `1px solid ${T.borde}` }}>
              <span style={{ width: 110, fontFamily: F.mono, fontSize: 28, color: T.suave, paddingTop: 16 }}>{e.hora}</span>
              <div style={{ flex: 1, opacity: t, transform: `translateY(${(1 - s) * -50}px)`, padding: "16px 22px", borderRadius: 18, background: `${T.acento}22`, borderLeft: `8px solid ${T.acento}` }}>
                <Txt t={30}>{e.texto}</Txt>
              </div>
            </div>
          );
        })}
      </Vidrio>
    </Entrada>
  );
};

const Votacion: React.FC<{ ui: Extract<UI, { tipo: "votacion" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const llenado = ev(f, inicio + 14, 30, INOUT);
  const ok = ui.opciones[0].pct >= ui.mayoria;
  const res = ev(f, inicio + 50, 14);
  const c = ok ? C.verde : C.rojo;
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "30px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
          <Vote size={40} color={T.acento} strokeWidth={2.4} />
          <Txt t={32}>{ui.pregunta}</Txt>
        </div>
        {ui.opciones.map((o, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Txt t={28} w={600}>{o.texto}</Txt>
              <span style={{ fontFamily: F.mono, fontSize: 28, color: T.texto }}>{Math.round(o.pct * llenado)}%</span>
            </div>
            <div style={{ position: "relative", height: 26, borderRadius: 13, background: T.burbuja }}>
              <div style={{ height: "100%", width: `${o.pct * llenado}%`, borderRadius: 13, background: i === 0 ? `linear-gradient(90deg, ${T.acento}, ${T.acento2})` : T.suave }} />
              {i === 0 && <div style={{ position: "absolute", left: `${ui.mayoria}%`, top: -10, bottom: -10, width: 4, background: T.texto, opacity: llenado }} />}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, opacity: res, transform: `scale(${0.9 + 0.1 * res})`, transformOrigin: "left", padding: "14px 22px", borderRadius: 999, background: `${c}22`, border: `2px solid ${c}`, width: "fit-content" }}>
          {ok ? <Check size={32} color={c} strokeWidth={3} /> : <X size={32} color={c} strokeWidth={3} />}
          <Txt t={28} c={c}>{ui.resultado ?? (ok ? "Mayoría alcanzada" : "No se alcanza la mayoría")}</Txt>
        </div>
      </Vidrio>
    </Entrada>
  );
};

const Mito: React.FC<{ ui: Extract<UI, { tipo: "mito" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const giro = ev(f, inicio + 34, 18, INOUT);
  const cara = giro < 0.5;
  const ang = giro * 180;
  return (
    <Entrada inicio={inicio}>
      <div style={{ perspective: 1600 }}>
        <div style={{ transform: `rotateY(${cara ? ang : ang - 180}deg)` }}>
          <Vidrio style={{ padding: "40px 40px", minHeight: 260, display: "flex", flexDirection: "column", gap: 18, justifyContent: "center", borderLeft: `10px solid ${cara ? C.rojo : C.verde}` }}>
            <span style={{ fontFamily: F.mono, fontSize: 28, letterSpacing: 6, color: cara ? C.rojo : C.verde }}>{cara ? "MITO" : "REALIDAD"}</span>
            <Txt t={42} style={{ lineHeight: 1.2 }}>{cara ? ui.mito : ui.realidad}</Txt>
          </Vidrio>
        </div>
      </div>
    </Entrada>
  );
};

const Semaforo: React.FC<{ ui: Extract<UI, { tipo: "semaforo" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "28px 30px" }}>
        <Txt t={34} style={{ display: "block", marginBottom: 16 }}>{ui.titulo ?? "Obligaciones"}</Txt>
        {ui.filas.map((r, i) => {
          const t = ev(f, inicio + 10 + i * 9, 14);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, padding: "18px 0", borderTop: `1px solid ${T.borde}`, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 16, background: "#111" }}>
                {(["rojo", "ambar", "verde"] as Sem[]).map((s) => (
                  <div key={s} style={{ width: 20, height: 20, borderRadius: 10, background: s === r.estado ? col(s) : "#333", boxShadow: s === r.estado ? `0 0 14px ${col(s)}` : "none" }} />
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <Txt t={31}>{r.texto}</Txt>
                <Txt t={25} w={600} c={col(r.estado)}>{r.cuando}</Txt>
              </div>
            </div>
          );
        })}
      </Vidrio>
    </Entrada>
  );
};

const Email: React.FC<{ ui: Extract<UI, { tipo: "email" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  return (
    <Entrada inicio={inicio} desde="arriba">
      <Vidrio style={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
          <Icono I={Mail} c={T.acento} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Txt t={26} w={600} s>{ui.de}</Txt>
            <Txt t={34}>{ui.asunto}</Txt>
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 24, color: T.suave }}>hoy</span>
        </div>
        {ui.lineas.map((l, i) => {
          const t = ev(f, inicio + 16 + i * 8, 12);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderTop: `1px solid ${T.borde}`, opacity: t }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: T.acento }} />
              <Txt t={29} w={600}>{l}</Txt>
            </div>
          );
        })}
      </Vidrio>
    </Entrada>
  );
};

const Confirmar: React.FC<{ ui: Extract<UI, { tipo: "confirmar" }>; inicio: number; dur: number }> = ({ ui, inicio, dur }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const prop = ev(f, inicio + 18, 14);
  const tClick = Math.min(inicio + 56, dur - 40);
  const cx = interpolate(f, [inicio + 30, tClick], [260, 0], { ...cl, easing: INOUT });
  const cy = interpolate(f, [inicio + 30, tClick], [180, 0], { ...cl, easing: INOUT });
  const pulsado = f >= tClick;
  const press = f >= tClick && f < tClick + 6 ? 0.94 : 1;
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "28px 30px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ alignSelf: "flex-start", maxWidth: "85%", padding: "18px 24px", borderRadius: 26, borderBottomLeftRadius: 8, background: T.burbuja }}>
          <Txt t={30} w={600}>{ui.peticion}</Txt>
        </div>
        <div style={{ opacity: prop, transform: `translateY(${(1 - prop) * 30}px)`, padding: "22px 24px", borderRadius: 24, border: `2px dashed ${T.acento}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Sparkles size={30} color={T.acento} />
            <Txt t={30}>{ui.accion}</Txt>
          </div>
          <Txt t={26} w={600} s>{ui.detalle}</Txt>
          <div style={{ display: "flex", gap: 16, marginTop: 8, position: "relative" }}>
            <div style={{ padding: "14px 26px", borderRadius: 999, border: `2px solid ${T.borde}` }}><Txt t={26} s>Cancelar</Txt></div>
            <div style={{ position: "relative", transform: `scale(${press})`, padding: "14px 30px", borderRadius: 999, background: pulsado ? C.verde : `linear-gradient(92deg, ${T.acento}, ${T.acento2})`, display: "flex", alignItems: "center", gap: 10 }}>
              {pulsado && <Check size={28} color="#fff" strokeWidth={3} />}
              <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 26, color: pulsado ? "#fff" : sobre(T.acento) }}>{pulsado ? "Hecho" : "Confirmar"}</span>
              <MousePointer2 size={52} color={T.texto} fill={T.estilo === "claro" || T.estilo === "editorial" ? "#fff" : "#000"} style={{ position: "absolute", left: 70 + cx, top: 30 + cy, opacity: prop }} />
            </div>
          </div>
        </div>
      </Vidrio>
    </Entrada>
  );
};

const Llamada: React.FC<{ ui: Extract<UI, { tipo: "llamada" }>; inicio: number; dur: number }> = ({ ui, inicio, dur }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const desc = inicio + 24;
  const cogida = f >= desc;
  const paso = Math.max(20, Math.floor((dur - desc - 20) / ui.frases.length));
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "30px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 96, height: 96, borderRadius: 48, background: cogida ? C.verde : T.acento, display: "grid", placeItems: "center", boxShadow: `0 0 ${20 + 14 * Math.abs(Math.sin(f / 5))}px ${cogida ? C.verde : T.acento}`, flexShrink: 0 }}>
            <PhoneIncoming size={48} color="#fff" style={{ transform: cogida ? "none" : `rotate(${Math.sin(f / 1.5) * 14}deg)` }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Txt t={36}>{ui.quien}</Txt>
            <Txt t={26} w={600} c={cogida ? C.verde : T.suave}>{cogida ? `Agente IA · ${Math.floor((f - desc) / 30) + 0}:${String(Math.floor(((f - desc) % 30) * 2)).padStart(2, "0")}` : "Llamada entrante…"}</Txt>
          </div>
          {cogida && (
            <div style={{ display: "flex", gap: 5, alignItems: "center", height: 60 }}>
              {[0, 1, 2, 3, 4, 5].map((k) => <div key={k} style={{ width: 7, borderRadius: 4, background: T.acento, height: 14 + 40 * Math.abs(Math.sin(f / 3 + k * 1.3)) }} />)}
            </div>
          )}
        </div>
        {cogida && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
            {ui.frases.map((fr, i) => {
              const t0 = desc + 10 + i * paso;
              if (f < t0) return null;
              const t = ev(f, t0, 12);
              const agente = i % 2 === 1;
              return (
                <div key={i} style={{ opacity: t, display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span style={{ fontFamily: F.mono, fontSize: 24, color: agente ? T.acento : T.suave, width: 120, flexShrink: 0 }}>{agente ? "AGENTE" : "VECINA"}</span>
                  <Txt t={29} w={600}>{fr}</Txt>
                </div>
              );
            })}
          </div>
        )}
      </Vidrio>
    </Entrada>
  );
};

const Ficha: React.FC<{ ui: Extract<UI, { tipo: "ficha" }>; inicio: number; dur: number }> = ({ ui, inicio, dur }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const n = ui.pestanas.length;
  const activa = Math.min(n - 1, Math.max(0, Math.floor((f - inicio - 16) / Math.max(14, (dur - inicio - 30) / n))));
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "28px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22 }}>
          <Icono I={Building2} c={T.acento} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Txt t={34}>{ui.nombre}</Txt>
            <Txt t={25} w={600} s>{ui.direccion}</Txt>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {ui.pestanas.map((p, i) => (
            <div key={i} style={{ padding: "12px 20px", borderRadius: 999, background: i === activa ? T.acento : T.burbuja, transition: "none" }}>
              <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 25, color: i === activa ? "#0A0A0A" : T.texto }}>{p}</span>
            </div>
          ))}
        </div>
        {ui.filas.map((r, i) => {
          const t = ev(f, inicio + 14 + i * 6, 12);
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 4px", borderTop: `1px solid ${T.borde}`, opacity: t }}>
              <Txt t={28} w={600} s>{r.k}</Txt>
              <Txt t={28}>{r.v}</Txt>
            </div>
          );
        })}
      </Vidrio>
    </Entrada>
  );
};

const Excel: React.FC<{ ui: Extract<UI, { tipo: "excel" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const barra = ev(f, inicio + 14, 34, INOUT);
  const fin = ev(f, inicio + 50, 14);
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "28px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
          <Icono I={FileSpreadsheet} c={C.verde} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontFamily: F.mono, fontSize: 28, color: T.texto }}>{ui.archivo}</span>
            <div style={{ height: 10, borderRadius: 5, background: T.burbuja, marginTop: 10 }}>
              <div style={{ height: "100%", width: `${barra * 100}%`, borderRadius: 5, background: C.verde }} />
            </div>
          </div>
        </div>
        {ui.filas.map((r, i) => {
          const t = ev(f, inicio + 16 + i * 7, 12);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 6px", borderTop: `1px solid ${T.borde}`, opacity: t, transform: `translateX(${(1 - t) * -60}px)` }}>
              <Check size={28} color={C.verde} strokeWidth={3} />
              <Txt t={28} w={600}>{r}</Txt>
            </div>
          );
        })}
        <div style={{ marginTop: 14, opacity: fin, fontFamily: F.texto, fontWeight: 800, fontSize: 30, color: C.verde }}>{ui.total}</div>
      </Vidrio>
    </Entrada>
  );
};

const Firma: React.FC<{ ui: Extract<UI, { tipo: "firma" }>; inicio: number }> = ({ ui, inicio }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const d = ev(f, inicio + 14, 36, INOUT);
  const ok = ev(f, inicio + 54, 12);
  const L = 1400;
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "28px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 12 }}>
          <PenLine size={36} color={T.acento} strokeWidth={2.4} />
          <Txt t={30}>{ui.texto}</Txt>
        </div>
        <div style={{ position: "relative", height: 220, borderRadius: 22, background: T.estilo === "claro" || T.estilo === "editorial" ? "#F6F4EF" : "rgba(255,255,255,0.06)", border: `1.5px dashed ${T.borde}` }}>
          <svg width="100%" height="220" viewBox="0 0 860 220">
            <path d="M60 150 C 110 40, 150 40, 160 130 S 220 190, 250 110 C 270 60, 300 60, 310 120 C 320 170, 360 160, 390 100 C 410 60, 440 70, 450 120 C 460 160, 500 150, 530 110 C 560 70, 600 90, 620 130 C 640 160, 700 120, 760 90"
              fill="none" stroke={T.texto} strokeWidth={6} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - d)} />
          </svg>
          <div style={{ position: "absolute", left: 40, right: 40, bottom: 40, height: 2, background: T.borde }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, opacity: ok }}>
          <Check size={30} color={C.verde} strokeWidth={3} />
          <Txt t={28} c={C.verde}>{ui.nombre}</Txt>
        </div>
      </Vidrio>
    </Entrada>
  );
};

const Lista: React.FC<{ ui: Extract<UI, { tipo: "lista" }>; inicio: number; dur: number }> = ({ ui, inicio, dur }) => {
  const f = useCurrentFrame();
  const T = useTema();
  const paso = Math.max(10, Math.floor((dur - inicio - 30) / ui.items.length));
  return (
    <Entrada inicio={inicio}>
      <Vidrio style={{ padding: "28px 30px" }}>
        {ui.titulo && <Txt t={34} style={{ display: "block", marginBottom: 12 }}>{ui.titulo}</Txt>}
        {ui.items.map((it, i) => {
          const tk = ev(f, inicio + 12 + i * paso, 10);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 0", borderTop: `1px solid ${T.borde}` }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, border: `3px solid ${tk > 0.5 ? C.verde : T.suave}`, background: tk > 0.5 ? C.verde : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
                {tk > 0.5 && <Check size={30} color="#fff" strokeWidth={3.5} style={{ transform: `scale(${tk})` }} />}
              </div>
              <Txt t={31} w={tk > 0.5 ? 800 : 600} s={tk <= 0.5}>{it}</Txt>
            </div>
          );
        })}
      </Vidrio>
    </Entrada>
  );
};

const Tarjeta: React.FC<{ ui: UI; dur: number }> = ({ ui, dur }) => {
  switch (ui.tipo) {
    case "toast": return <Toast ui={ui} inicio={18} />;
    case "chat": return <Chat ui={ui} inicio={14} dur={dur} />;
    case "estados": return <Estados ui={ui} inicio={14} dur={dur} />;
    case "flujo": return <Flujo ui={ui} inicio={12} />;
    case "tachado": return <Tachado ui={ui} inicio={14} />;
    case "pasos": return <Pasos ui={ui} inicio={14} />;
    case "busqueda": return <Busqueda ui={ui} inicio={12} />;
    case "documento": return <Documento ui={ui} inicio={12} />;
    case "calendario": return <Calendario ui={ui} inicio={12} />;
    case "votacion": return <Votacion ui={ui} inicio={12} />;
    case "mito": return <Mito ui={ui} inicio={12} />;
    case "semaforo": return <Semaforo ui={ui} inicio={12} />;
    case "email": return <Email ui={ui} inicio={14} />;
    case "confirmar": return <Confirmar ui={ui} inicio={12} dur={dur} />;
    case "llamada": return <Llamada ui={ui} inicio={12} dur={dur} />;
    case "ficha": return <Ficha ui={ui} inicio={12} dur={dur} />;
    case "excel": return <Excel ui={ui} inicio={12} />;
    case "firma": return <Firma ui={ui} inicio={12} />;
    case "lista": return <Lista ui={ui} inicio={12} dur={dur} />;
  }
  return null;
};

// ---------------------------------------------------------------- marca
const Marca: React.FC<{ acento: string; acento2: string; tam?: number; oscuro?: boolean }> = ({ acento, acento2, tam = 40, oscuro }) => (
  <span style={{ fontFamily: F.titulo, fontWeight: 700, fontSize: tam, letterSpacing: -1, color: oscuro ? C.tinta : "#fff", filter: oscuro ? undefined : "drop-shadow(0 2px 10px rgba(0,0,0,0.55))" }}>
    Comun
    <span style={{ backgroundImage: `linear-gradient(92deg, ${acento}, ${acento2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>IA</span>
  </span>
);

const Outro: React.FC<{ e: Escena; plan: Plan }> = ({ e, plan }) => {
  const f = useCurrentFrame();
  const acento = plan.acento ?? "#22D3EE";
  const acento2 = plan.acento2 ?? "#7C83FF";
  const claro = plan.estilo === "claro";
  const editorial = plan.estilo === "editorial";
  const t = ev(f, 4, 26);
  const brillo = interpolate(f, [10, 50], [-60, 160], cl);
  const tag = ev(f, 26, 18);
  const cta = ev(f, 42, 18);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40, background: claro ? C.papel : editorial ? acento : "transparent" }}>
      {!editorial && <div style={{ position: "absolute", width: 900, height: 900, borderRadius: 450, background: `radial-gradient(circle, ${acento}44 0%, transparent 65%)`, transform: `scale(${0.6 + 0.4 * t + 0.03 * Math.sin(f / 12)})` }} />}
      <div style={{ position: "relative", opacity: t, transform: `scale(${0.85 + 0.15 * t})`, filter: `blur(${(1 - t) * 18}px)` }}>
        {editorial ? (
          <span style={{ fontFamily: F.titulo, fontWeight: 700, fontSize: 190, letterSpacing: -1, color: "#0A0A0A" }}>ComunIA</span>
        ) : (
          <Marca acento={acento} acento2={acento2} tam={190} oscuro={claro} />
        )}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, transparent ${brillo - 20}%, rgba(255,255,255,0.55) ${brillo}%, transparent ${brillo + 20}%)`, mixBlendMode: "overlay" }} />
      </div>
      <div style={{ opacity: tag, transform: `translateY(${(1 - tag) * 30}px)`, fontFamily: F.texto, fontWeight: 600, fontSize: 46, color: claro ? "rgba(13,18,34,0.7)" : editorial ? "#0A0A0A" : C.suave, textAlign: "center", padding: "0 80px" }}>{e.outro?.tagline}</div>
      <div style={{ opacity: cta, transform: `translateY(${(1 - cta) * 30}px) scale(${1 + 0.025 * Math.sin(f / 6)})`, padding: "24px 48px", borderRadius: 999, background: editorial ? "#0A0A0A" : `linear-gradient(92deg, ${acento}, ${acento2})`, fontFamily: F.texto, fontWeight: 800, fontSize: 40, color: editorial ? "#fff" : sobre(acento), boxShadow: editorial ? "none" : `0 20px 60px ${acento}66` }}>
        {e.outro?.cta}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- escena (maquetación según estilo)
const EscenaV: React.FC<{ e: Escena; i: number; n: number; dur: number; plan: Plan; ultima: boolean }> = ({ e, i, n, dur, plan, ultima }) => {
  const f = useCurrentFrame();
  const estilo = plan.estilo ?? "vidrio";
  const tam = plan.tamTitulo ?? 104;
  // transición: cada estilo entra distinto
  const entra = i === 0 ? 1 : ev(f, 0, SOLAPE, INOUT);
  const sale = ultima ? 1 : 1 - ev(f, dur - SOLAPE, SOLAPE, INOUT);
  let trans: React.CSSProperties = {};
  if (estilo === "partido" || estilo === "editorial") {
    // barrido lateral
    trans = { clipPath: `inset(0 ${(1 - entra) * 100}% 0 0)` };
  } else if (estilo === "cine") {
    trans = { opacity: Math.min(entra, sale) };
  } else {
    const z = 1 + (1 - entra) * 0.12;
    const blur = (1 - entra) * 16;
    trans = { opacity: Math.min(entra, sale), transform: `scale(${z})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined };
  }
  const textoBloque = (
    <>
      {e.kicker && <Kicker texto={e.kicker} inicio={4} i={i} n={n - 1} />}
      {e.titulo && <Titulo texto={e.titulo} inicio={6} tam={estilo === "cine" ? tam * 0.86 : tam} centro={estilo === "cine"} />}
      {e.sub && <div style={{ marginTop: 26, fontFamily: F.texto, fontWeight: 600, fontSize: 38, lineHeight: 1.3, color: estilo === "claro" ? "rgba(13,18,34,0.65)" : C.suave, opacity: ev(f, 22, 18), textAlign: estilo === "cine" ? "center" : "left" }}>{e.sub}</div>}
    </>
  );
  const tarjeta = e.ui ? <Tarjeta ui={e.ui} dur={dur} /> : null;
  let cuerpo: React.ReactNode;
  if (e.outro) cuerpo = <Outro e={e} plan={plan} />;
  else if (estilo === "claro") {
    cuerpo = (
      <>
        <div style={{ position: "absolute", left: 72, right: 72, bottom: 1920 - 1030 + 40, display: "flex", flexDirection: "column", alignItems: "stretch" }}>{tarjeta}</div>
        <div style={{ position: "absolute", left: 72, right: 72, top: 1080 }}>{textoBloque}</div>
      </>
    );
  } else if (estilo === "partido") {
    const linea = ev(f, 2, 20, INOUT);
    cuerpo = (
      <>
        <div style={{ position: "absolute", left: 0, top: 996, height: 8, width: `${linea * 100}%`, background: `linear-gradient(90deg, ${plan.acento}, ${plan.acento2})` }} />
        <div style={{ position: "absolute", left: 72, right: 72, bottom: 1920 - 1000 + 50 }}>{tarjeta}</div>
        <div style={{ position: "absolute", left: 72, right: 72, top: 1070 }}>{textoBloque}</div>
      </>
    );
  } else if (estilo === "cine") {
    cuerpo = (
      <>
        <div style={{ position: "absolute", left: 64, right: 64, top: 380, display: "flex", flexDirection: "column", alignItems: "center" }}>{textoBloque}</div>
        <div style={{ position: "absolute", left: 72, right: 72, bottom: 360 }}>{tarjeta}</div>
      </>
    );
  } else if (estilo === "editorial") {
    cuerpo = (
      <>
        <div style={{ position: "absolute", left: 72, right: 72, top: 230 }}>{tarjeta}</div>
        <div style={{ position: "absolute", left: 72, right: 72, bottom: 300 }}>{textoBloque}</div>
      </>
    );
  } else {
    const arriba = (e.posicion ?? "arriba") === "arriba";
    cuerpo = (
      <AbsoluteFill style={{ padding: "0 72px", justifyContent: "space-between", flexDirection: "column", paddingTop: 230, paddingBottom: 250 }}>
        <div style={{ order: arriba ? 0 : 1 }}>{textoBloque}</div>
        <div style={{ order: arriba ? 1 : 0 }}>{tarjeta}</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={trans}>
      <Metraje src={e.outro ? undefined : e.media} dur={dur} i={i} plan={plan} />
      {cuerpo}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- composición
export const Reel: React.FC<{ plan: Plan }> = ({ plan }) => {
  const f = useCurrentFrame();
  const total = duracionTotal(plan);
  const estilo = plan.estilo ?? "vidrio";
  const acento = plan.acento ?? "#22D3EE";
  const acento2 = plan.acento2 ?? "#7C83FF";
  const tema = temaDe(estilo, acento, acento2);
  const n = plan.escenas.length;
  const finMarca = f < total - 150 ? 1 : interpolate(f, [total - 150, total - 130], [1, 0], cl);
  let t = 0;
  const inicios: number[] = [];
  return (
    <TemaCtx.Provider value={tema}>
      <AbsoluteFill style={{ backgroundColor: estilo === "claro" ? C.papel : C.noche }}>
        {plan.escenas.map((e, i) => {
          const d = Math.round(e.dur * FPS);
          const desde = t;
          inicios.push(desde);
          t += d - SOLAPE;
          return (
            <Sequence key={i} from={desde} durationInFrames={d}>
              <EscenaV e={e} i={i} n={n} dur={d} plan={plan} ultima={i === n - 1} />
            </Sequence>
          );
        })}
        {estilo === "cine" && (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 250, background: "#000" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 250, background: "#000" }} />
            <div style={{ position: "absolute", left: 64, right: 64, top: 150, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: finMarca }}>
              <Marca acento={acento} acento2={acento2} tam={44} />
              <span style={{ fontFamily: F.mono, fontSize: 26, color: "rgba(255,255,255,0.6)", letterSpacing: 3 }}>
                {`00:${String(Math.floor(f / 30)).padStart(2, "0")}:${String(f % 30).padStart(2, "0")}`}
              </span>
            </div>
            <div style={{ position: "absolute", left: 64, right: 64, bottom: 1920 - 250 + 40, height: 3, background: "rgba(255,255,255,0.15)" }}>
              <div style={{ height: "100%", width: `${(f / total) * 100}%`, background: acento }} />
            </div>
          </>
        )}
        {estilo === "editorial" && (
          <div style={{ position: "absolute", top: 40, left: 40, right: 40, display: "flex", gap: 10 }}>
            {plan.escenas.map((e, i) => {
              const d = Math.round(e.dur * FPS);
              const p = interpolate(f, [inicios[i], inicios[i] + d - SOLAPE], [0, 1], cl);
              return (
                <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.3)" }}>
                  <div style={{ height: "100%", width: `${p * 100}%`, borderRadius: 3, background: "#fff" }} />
                </div>
              );
            })}
          </div>
        )}
        {(estilo === "vidrio" || estilo === "partido" || estilo === "claro") && (
          <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: `${(f / total) * 100}%`, background: `linear-gradient(90deg, ${acento}, ${acento2})` }} />
        )}
        {estilo !== "cine" && (
          <div style={{ position: "absolute", top: 90, left: 72, opacity: 0.95 * finMarca }}>
            <Marca acento={acento} acento2={acento2} tam={44} oscuro={estilo === "claro"} />
          </div>
        )}
        <Grano claro={estilo === "claro"} />
      </AbsoluteFill>
    </TemaCtx.Provider>
  );
};

// ---------------------------------------------------------------- portada
export const Portada: React.FC<{ plan: Plan }> = ({ plan }) => {
  const acento = plan.acento ?? "#22D3EE";
  const acento2 = plan.acento2 ?? "#7C83FF";
  const estilo = plan.estilo ?? "vidrio";
  const p = plan.portada!;
  const claro = estilo === "claro";
  const editorial = estilo === "editorial";
  return (
    <AbsoluteFill style={{ backgroundColor: claro ? C.papel : C.noche }}>
      {claro ? (
        p.media && (
          <div style={{ position: "absolute", left: 48, top: 170, width: 984, height: 860, borderRadius: 48, overflow: "hidden" }}>
            <Img src={staticFile(p.media)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )
      ) : (
        <AbsoluteFill>
          {p.media && <Img src={staticFile(p.media)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.15)" }} />}
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,10,22,0.35) 0%, rgba(6,10,22,0.55) 45%, rgba(6,10,22,0.95) 100%)" }} />
          <AbsoluteFill style={{ background: plan.tinte ?? "rgba(20,40,110,0.2)", mixBlendMode: "color" }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ justifyContent: claro ? "flex-start" : "center", paddingTop: claro ? 1090 : 0, padding: claro ? "1090px 80px 0" : "0 80px", gap: 10 }}>
        {p.kicker && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 56, height: 4, background: acento }} />
            <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: claro ? C.tinta : acento }}>{p.kicker}</span>
          </div>
        )}
        {p.lineas.map((l, i) => {
          const a = l.startsWith("*");
          const base: React.CSSProperties = { fontFamily: editorial ? F.texto : F.titulo, fontWeight: editorial ? 800 : 700, fontSize: claro ? (i === 0 ? 130 : 110) : i === 0 ? 150 : 120, lineHeight: 1.02, letterSpacing: -4, color: claro ? C.tinta : "#fff", textTransform: editorial ? "uppercase" : "none" };
          const acc: React.CSSProperties = a
            ? editorial ? { color: "#0A0A0A", background: acento, padding: "0 16px", width: "fit-content" }
              : claro ? { color: acento }
                : { backgroundImage: `linear-gradient(92deg, ${acento}, ${acento2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
            : {};
          return <div key={i} style={{ ...base, ...acc }}>{l.replace(/\*/g, "")}</div>;
        })}
        <div style={{ marginTop: 40 }}><Marca acento={acento} acento2={acento2} tam={60} oscuro={claro} /></div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
