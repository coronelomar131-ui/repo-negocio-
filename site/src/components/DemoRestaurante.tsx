"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** Demo de Comandero: abrir mesa, pedir por comensal y mandar a cocina. Datos de ejemplo. */
const SALE = [0.23, 1, 0.32, 1] as const;
const PLATILLOS = ["Chilaquiles verdes", "Enchiladas suizas", "Agua de horchata", "Café de olla"];
type Mesa = { n: number; lugares: number; ocupada: boolean; redonda: boolean };
type Comanda = { id: number; mesa: number; lineas: { c: number; p: string }[]; desde: number; lista: boolean };

export function DemoRestaurante() {
  const poco = useReducedMotion();
  const [mesas, setMesas] = useState<Mesa[]>([
    { n: 1, lugares: 4, ocupada: true, redonda: false }, { n: 2, lugares: 2, ocupada: false, redonda: true },
    { n: 3, lugares: 4, ocupada: false, redonda: false }, { n: 4, lugares: 2, ocupada: true, redonda: true },
  ]);
  const [sel, setSel] = useState<number | null>(3);
  const [comensal, setComensal] = useState(1);
  const [pedido, setPedido] = useState<{ c: number; p: string }[]>([]);
  const [cocina, setCocina] = useState<Comanda[]>([{ id: 1, mesa: 1, lineas: [{ c: 1, p: "Café de olla" }, { c: 2, p: "Chilaquiles verdes" }], desde: 0, lista: false }]);
  // El reloj arranca ya en el navegador (así no difiere del servidor); la primera comanda lleva 7 minutos
  const [ahora, setAhora] = useState(0);
  useEffect(() => {
    const inicio = Date.now();
    setAhora(inicio);
    setCocina((c) => c.map((x) => (x.desde === 0 ? { ...x, desde: inicio - 7 * 60000 } : x)));
    const t = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const mesa = mesas.find((m) => m.n === sel);
  function abrir() { if (!mesa) return; setMesas((ms) => ms.map((m) => (m.n === mesa.n ? { ...m, ocupada: true } : m))); }
  function mandar() {
    if (!mesa || !pedido.length) return;
    setCocina((c) => [...c, { id: Date.now(), mesa: mesa.n, lineas: pedido, desde: Date.now(), lista: false }]);
    setPedido([]);
  }
  function lista(id: number) {
    setCocina((c) => c.map((x) => (x.id === id ? { ...x, lista: true } : x)));
    window.setTimeout(() => setCocina((c) => c.filter((x) => x.id !== id)), poco ? 200 : 900);
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-trazo bg-hoja shadow-[0_30px_60px_-34px_oklch(0.225_0.008_70/0.5)]">
      <div className="flex items-center justify-between border-b border-linea bg-papel-2/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-naranja text-[0.7rem] font-bold text-hoja" aria-hidden="true">C</span>
          <span className="text-sm font-semibold">Comandero</span>
        </div>
        <span className="etiqueta text-[0.6rem] text-tinta-3">Demo · datos de ejemplo</span>
      </div>
      <div className="grid md:grid-cols-[1.15fr_0.85fr]">
        {/* Salón */}
        <div className="border-b border-linea p-4 sm:p-5 md:border-b-0 md:border-r">
          <p className="etiqueta text-tinta-3">Salón</p>
          <div className="tapete mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-linea p-3">
            {mesas.map((m) => (
              <button key={m.n} onClick={() => { setSel(m.n); setComensal(1); }} aria-pressed={sel === m.n}
                aria-label={`Mesa ${m.n}, ${m.ocupada ? "ocupada" : "libre"}, ${m.lugares} lugares`}
                className={`boton grid place-items-center rounded-xl py-2 ${sel === m.n ? "bg-naranja-suave ring-2 ring-naranja" : ""}`}>
                <DibujoMesa m={m} poco={!!poco} />
                <span className="text-xs font-semibold text-tinta-2">{m.ocupada ? "Ocupada" : "Libre"}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 min-h-[148px]">
            {mesa && !mesa.ocupada && (
              <button onClick={abrir} className="boton h-11 w-full rounded-full bg-tinta text-sm font-semibold text-hoja">Abrir mesa {mesa.n} · {mesa.lugares} comensales</button>
            )}
            {mesa && mesa.ocupada && (
              <div>
                <div className="flex gap-1.5" role="radiogroup" aria-label="Comensal">
                  {Array.from({ length: mesa.lugares }, (_, i) => i + 1).map((c) => (
                    <button key={c} role="radio" aria-checked={comensal === c} onClick={() => setComensal(c)}
                      className={`boton size-9 rounded-lg border text-sm font-bold ${comensal === c ? "border-tinta bg-tinta text-hoja" : "border-trazo"}`}>{c}</button>
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {PLATILLOS.map((p) => (
                    <button key={p} onClick={() => setPedido((x) => [...x, { c: comensal, p }])} className="boton rounded-full border border-trazo px-3 py-1.5 text-xs font-semibold hover:border-tinta">+ {p}</button>
                  ))}
                </div>
                <button onClick={mandar} disabled={!pedido.length} className="boton mt-3 h-11 w-full rounded-full bg-naranja text-sm font-semibold text-hoja disabled:opacity-40">
                  Mandar a cocina{pedido.length ? ` · ${pedido.length}` : ""}
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Cocina */}
        <div className="bg-[oklch(0.24_0.008_250)] p-4 text-[oklch(0.95_0.006_85)] sm:p-5">
          <p className="etiqueta text-[oklch(0.75_0.01_250)]">Cocina</p>
          <ul className="mt-3 space-y-3" aria-live="polite">
            <AnimatePresence initial={false}>
              {cocina.map((x) => {
                const s = ahora && x.desde ? Math.max(0, Math.floor((ahora - x.desde) / 1000)) : 0;
                return (
                  <motion.li key={x.id} initial={{ opacity: 0, transform: poco ? "none" : "translateY(-14px) rotate(-2deg)" }} animate={{ opacity: 1, transform: "translateY(0px) rotate(0deg)" }}
                    exit={{ opacity: 0, transform: poco ? "none" : "translateY(18px)" }} transition={{ duration: 0.35, ease: SALE }}
                    className="dentado relative bg-hoja px-3.5 pb-6 pt-3 text-tinta">
                    <div className="flex items-baseline justify-between">
                      <b className="font-titulo text-lg">Mesa {x.mesa}</b>
                      <span className={`numeros text-xs font-bold ${s > 600 ? "text-naranja" : "text-tinta-3"}`}>{String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}</span>
                    </div>
                    <ul className="mt-1.5 space-y-0.5 text-sm">
                      {x.lineas.map((l, i) => <li key={i}><span className="text-tinta-3">C{l.c}</span> · {l.p}</li>)}
                    </ul>
                    <button onClick={() => lista(x.id)} disabled={x.lista} className="boton mt-2.5 h-9 w-full rounded-lg bg-verde-suave text-xs font-bold uppercase tracking-wider">Lista</button>
                    {x.lista && (
                      <motion.span initial={{ opacity: 0, transform: "rotate(-14deg) scale(1.3)" }} animate={{ opacity: 0.9, transform: "rotate(-8deg) scale(1)" }} transition={{ duration: 0.28, ease: SALE }}
                        className="absolute right-3 top-9 rounded border-2 border-verde px-2 font-titulo text-lg font-extrabold uppercase text-verde" aria-hidden="true">Lista</motion.span>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          {!cocina.length && <p className="mt-6 text-sm text-[oklch(0.75_0.01_250)]">El pase está vacío. Manda un pedido desde el salón.</p>}
        </div>
      </div>
    </div>
  );
}

/** Mesa vista desde arriba; al abrirla, los comensales se sientan uno por uno. */
function DibujoMesa({ m, poco }: { m: Mesa; poco: boolean }) {
  const sillas = m.lugares === 2 ? [[30, 6], [30, 54]] : [[30, 6], [54, 30], [30, 54], [6, 30]];
  return (
    <svg viewBox="0 0 60 60" className="size-16" aria-hidden="true">
      {sillas.map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 7} y={y - 3} width="14" height="6" rx="3" fill={m.ocupada ? "var(--tinta)" : "none"} stroke="var(--trazo)" strokeWidth="1.2"
            transform={i % 2 && m.lugares === 4 ? `rotate(90 ${x} ${y})` : undefined} style={{ transition: "fill 240ms ease" }} />
          {m.ocupada && (
            <motion.circle cx={x} cy={y} r="3.6" fill="var(--tinta-2)" initial={{ opacity: 0, transform: poco ? "none" : "translateY(-4px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: 0.25, ease: SALE, delay: i * 0.07 }} />
          )}
        </g>
      ))}
      {m.redonda
        ? <circle cx="30" cy="30" r="15" fill={m.ocupada ? "var(--ambar)" : "var(--hoja)"} stroke="var(--tinta)" strokeWidth="1.6" style={{ transition: "fill 280ms ease" }} />
        : <rect x="15" y="15" width="30" height="30" rx="5" fill={m.ocupada ? "var(--ambar)" : "var(--hoja)"} stroke="var(--tinta)" strokeWidth="1.6" style={{ transition: "fill 280ms ease" }} />}
      <text x="30" y="34" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--tinta)">{m.n}</text>
    </svg>
  );
}
