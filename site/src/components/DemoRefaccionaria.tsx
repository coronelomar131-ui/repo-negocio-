"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, Minus, RotateCcw, Send } from "lucide-react";

/** Demo de un sistema para refaccionaria. Nombre, productos y clientes son inventados. */
const SALE = [0.23, 1, 0.32, 1] as const;
const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

type Pestana = "venta" | "ml" | "whatsapp" | "cobranza";
const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: "venta", texto: "Venta" },
  { id: "ml", texto: "Mercado Libre" },
  { id: "whatsapp", texto: "WhatsApp" },
  { id: "cobranza", texto: "Cobranza" },
];
const CATALOGO = [
  { id: "bal", nombre: "Balatas delanteras", precio: 850, hay: 12 },
  { id: "bom", nombre: "Bomba de agua", precio: 1240, hay: 4 },
  { id: "fil", nombre: "Filtro de aceite", precio: 165, hay: 30 },
  { id: "amo", nombre: "Amortiguador trasero", precio: 1980, hay: 6 },
];

export function DemoRefaccionaria() {
  const [p, setP] = useState<Pestana>("venta");
  const i = PESTANAS.findIndex((x) => x.id === p);
  return (
    <div className="overflow-hidden rounded-[24px] border border-trazo bg-hoja shadow-[0_30px_60px_-34px_oklch(0.225_0.008_70/0.5)]">
      <div className="flex items-center justify-between border-b border-linea bg-papel-2/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-acero text-[0.7rem] font-bold text-hoja" aria-hidden="true">RO</span>
          <span className="text-sm font-semibold">Refacciones Orión</span>
        </div>
        <span className="etiqueta text-[0.6rem] text-tinta-3">Demo · datos de ejemplo</span>
      </div>
      {/* Pestañas con lente que se desliza (receta "Tab indicator") */}
      <div className="relative grid grid-cols-4 border-b border-linea p-1.5" role="tablist" aria-label="Partes del sistema">
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-xl bg-tinta transition-transform duration-[250ms] [transition-timing-function:var(--ease-in-out)]"
          style={{ width: "calc((100% - 12px) / 4)", transform: `translateX(${i * 100}%)` }} aria-hidden="true" />
        {PESTANAS.map((x) => (
          <button key={x.id} role="tab" aria-selected={p === x.id} onClick={() => setP(x.id)}
            className={`boton relative z-10 h-10 rounded-xl text-[0.8rem] font-semibold sm:text-sm ${p === x.id ? "text-hoja" : "text-tinta-2"}`}>{x.texto}</button>
        ))}
      </div>
      <div className="relative min-h-[380px] p-4 sm:p-5" role="tabpanel">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={p} initial={{ opacity: 0, transform: "translateY(8px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-6px)" }} transition={{ duration: 0.2, ease: SALE }}>
            {p === "venta" && <Venta />}
            {p === "ml" && <MercadoLibre />}
            {p === "whatsapp" && <Asistente />}
            {p === "cobranza" && <Cobranza />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Venta() {
  const [lleva, setLleva] = useState<Record<string, number>>({ bal: 1 });
  const [folio, setFolio] = useState(311);
  const [hecha, setHecha] = useState<number | null>(null);
  const [hay, setHay] = useState(() => Object.fromEntries(CATALOGO.map((c) => [c.id, c.hay])));
  const total = CATALOGO.reduce((s, c) => s + (lleva[c.id] ?? 0) * c.precio, 0);
  const cambiar = (id: string, d: number) => { setHecha(null); setLleva((l) => ({ ...l, [id]: Math.max(0, Math.min(hay[id], (l[id] ?? 0) + d)) })); };
  function crear() {
    if (!total) return;
    const f = folio + 1;
    setHay((h) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v - (lleva[k] ?? 0)])));
    setFolio(f); setHecha(f); setLleva({});
  }
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-tinta-2">Cliente: <b className="text-tinta">Taller Mecánico Ruiz</b></p>
        <p className="numeros text-xs text-tinta-3">Siguiente folio NE-{folio + 1}</p>
      </div>
      <ul className="mt-3 divide-y divide-linea rounded-2xl border border-linea">
        {CATALOGO.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{c.nombre}</p>
              <p className="numeros text-xs text-tinta-3">{pesos(c.precio)} · quedan <span className={hay[c.id] <= 3 ? "font-semibold text-naranja" : ""}>{hay[c.id]}</span></p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => cambiar(c.id, -1)} disabled={!lleva[c.id]} className="boton grid size-9 place-items-center rounded-full border border-trazo disabled:opacity-30" aria-label={`Quitar ${c.nombre}`}><Minus className="size-4" /></button>
              <span className="numeros w-6 text-center text-sm font-bold" aria-live="polite">{lleva[c.id] ?? 0}</span>
              <button onClick={() => cambiar(c.id, 1)} disabled={(lleva[c.id] ?? 0) >= hay[c.id]} className="boton grid size-9 place-items-center rounded-full border border-trazo disabled:opacity-30" aria-label={`Agregar ${c.nombre}`}><Plus className="size-4" /></button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="numeros"><span className="text-sm text-tinta-2">Total </span><b className="font-titulo text-2xl">{pesos(total)}</b></p>
        <button onClick={crear} disabled={!total} className="boton h-11 rounded-full bg-naranja px-5 text-sm font-semibold text-hoja disabled:opacity-40">Crear nota</button>
      </div>
      <AnimatePresence>
        {hecha && (
          <motion.p initial={{ opacity: 0, transform: "translateY(6px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: SALE }}
            className="mt-3 rounded-xl bg-verde-suave/60 px-3 py-2 text-sm" role="status">
            Nota <b>NE-{hecha}</b> creada. El inventario ya se descontó y el PDF está listo para mandarse.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const PEDIDOS_ML = [
  { p: "Sensor de oxígeno", c: 1350 }, { p: "Kit de clutch", c: 3890 }, { p: "Bujías de iridio (4)", c: 1120 },
  { p: "Termostato", c: 540 }, { p: "Bobina de encendido", c: 980 },
];
function MercadoLibre() {
  const poco = useReducedMotion();
  const [lista, setLista] = useState(() => PEDIDOS_ML.slice(0, 2).map((x, i) => ({ ...x, id: i, estado: "Lista para enviar" })));
  const sig = useRef(2);
  // Mientras se ve la pestaña, entra una venta nueva cada pocos segundos, como en la vida real
  useEffect(() => {
    const t = window.setInterval(() => {
      const x = PEDIDOS_ML[sig.current % PEDIDOS_ML.length];
      const id = sig.current++;
      setLista((l) => [{ ...x, id, estado: "Pagada" }, ...l].slice(0, 5));
      window.setTimeout(() => setLista((l) => l.map((y) => (y.id === id ? { ...y, estado: "Lista para enviar" } : y))), 1800);
    }, 3200);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div>
      <p className="text-sm text-tinta-2">Las ventas de Mercado Libre entran solas al sistema y descuentan el inventario.</p>
      <ul className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {lista.map((x) => (
            <motion.li key={x.id} layout={!poco} initial={{ opacity: 0, transform: "translateY(-10px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: SALE }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-linea bg-papel/60 px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{x.p}</p>
                <p className="numeros text-xs text-tinta-3">Mercado Libre · {pesos(x.c)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300 ${x.estado === "Pagada" ? "bg-ambar/70" : "bg-verde-suave"}`}>{x.estado}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

const CHARLA = [
  { yo: true, t: "Vendí 2 balatas delanteras al Taller Ruiz, más IVA" },
  { yo: false, t: "Listo. Nota NE-313 para Taller Mecánico Ruiz: 2 balatas delanteras, $1,700 más IVA = $1,972. Quedan 10 en inventario. ¿Te mando el PDF?" },
  { yo: true, t: "Sí, y ¿cuánto me debe ese cliente?" },
  { yo: false, t: "Con esta nota, Taller Ruiz debe $4,812 en 3 notas. La más vieja tiene 12 días." },
];
function Asistente() {
  const [n, setN] = useState(0);
  const [escribe, setEscribe] = useState(false);
  useEffect(() => {
    if (n >= CHARLA.length) return;
    const quien = CHARLA[n];
    setEscribe(!quien.yo);
    const t = window.setTimeout(() => { setEscribe(false); setN((x) => x + 1); }, quien.yo ? 700 : 1500);
    return () => window.clearTimeout(t);
  }, [n]);
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2.5 rounded-2xl bg-[oklch(0.93_0.02_120)] p-3 sm:p-4">
        {CHARLA.slice(0, n).map((m, i) => (
          <motion.p key={i} initial={{ opacity: 0, transform: "translateY(6px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: 0.22, ease: SALE }}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${m.yo ? "ml-auto rounded-br-md bg-[oklch(0.88_0.07_145)]" : "rounded-bl-md bg-hoja"}`}>
            {m.t}
          </motion.p>
        ))}
        {escribe && <p className="w-14 rounded-2xl rounded-bl-md bg-hoja px-3 py-2 text-center text-tinta-3" aria-label="Escribiendo"><span className="punto">•</span> <span className="punto">•</span> <span className="punto">•</span></p>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-tinta-3">Un asistente con IA que registra y contesta por WhatsApp. Antes de guardar, te pide tu sí.</p>
        <button onClick={() => setN(0)} className="boton grid size-10 shrink-0 place-items-center rounded-full border border-trazo" aria-label="Repetir la conversación"><RotateCcw className="size-4" /></button>
      </div>
    </div>
  );
}

const DEUDORES = [
  { c: "Taller Mecánico Ruiz", debe: 4812, dias: 12 },
  { c: "Grúas Hernández", debe: 9350, dias: 31 },
  { c: "Servicio Automotriz Luna", debe: 1640, dias: 4 },
];
function Cobranza() {
  const [lista, setLista] = useState(DEUDORES);
  const total = lista.reduce((s, d) => s + d.debe, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-tinta-2">Por cobrar</p>
        <p className="font-titulo numeros text-2xl font-bold">{pesos(total)}</p>
      </div>
      <ul className="mt-3 space-y-2">
        {lista.map((d) => (
          <li key={d.c} className="flex items-center gap-3 rounded-2xl border border-linea px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{d.c}</p>
              <p className={`numeros text-xs ${d.dias > 30 ? "font-semibold text-naranja" : "text-tinta-3"}`}>{d.debe ? `${pesos(d.debe)} · ${d.dias} días` : "Al corriente"}</p>
            </div>
            <button onClick={() => setLista((l) => l.map((x) => (x.c === d.c ? { ...x, debe: 0 } : x)))} disabled={!d.debe}
              className="boton inline-flex h-9 items-center gap-1.5 rounded-full border border-trazo px-3 text-xs font-semibold disabled:opacity-35">
              <Send className="size-3.5" aria-hidden="true" /> {d.debe ? "Registrar pago" : "Pagado"}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-tinta-3">Y cada mañana llega un resumen por WhatsApp: ventas de ayer y quién debe más de 30 días.</p>
    </div>
  );
}
