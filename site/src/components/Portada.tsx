"use client";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, MessageCircle } from "lucide-react";
import { ligaWhatsApp } from "@/lib/sitio";

const SALE = [0.23, 1, 0.32, 1] as const;
const TAREAS = [
  "Ventas y notas con folio consecutivo",
  "Inventario que se descuenta solo",
  "Pedidos de Mercado Libre al momento",
  "Asistente que registra por WhatsApp",
  "Cobranza y corte del día",
];
const CAPACIDADES = ["Se conecta con Mercado Libre", "Asistente por WhatsApp", "Funciona sin internet", "Tickets y comandas impresas"];

export function Portada() {
  const poco = useReducedMotion();
  // Entrada del hero: sube 18 px con opacidad; con movimiento reducido solo aparece
  const entra = (i: number) => ({
    initial: { opacity: 0, transform: poco ? "none" : "translateY(18px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: poco ? 0.3 : 0.7, ease: SALE, delay: 0.08 + i * 0.07 },
  });

  return (
    <section id="inicio" className="relative overflow-hidden">
      <div className="tapete pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden="true" />
      <Regla />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:pb-28">
        <div>
          <motion.p {...entra(0)} className="etiqueta inline-flex items-center gap-2 text-acero">
            <span className="inline-block size-2 rounded-full bg-naranja" aria-hidden="true" /> Taller de sistemas · Hecho en México
          </motion.p>
          <motion.h1 {...entra(1)} className="font-titulo mt-5 text-fluid-2xl font-extrabold leading-[0.92] text-balance">
            Tu negocio no es de catálogo. <span className="text-naranja">Tu sistema tampoco.</span>
          </motion.h1>
          <motion.p {...entra(2)} className="mt-6 max-w-[54ch] text-fluid-base leading-relaxed text-tinta-2">
            Hago programas a la medida para negocios con mostrador, almacén, cocina o reparto. Primero veo cómo trabajas hoy, con tu libreta y tus hojas de Excel. De ahí sale un sistema que tu equipo entiende desde el primer día.
          </motion.p>
          <motion.div {...entra(3)} className="mt-9 flex flex-wrap gap-3">
            <a href={ligaWhatsApp("Hola Omar, quiero un sistema para mi negocio. Te cuento: ")} target="_blank" rel="noopener"
              className="boton inline-flex h-14 items-center gap-2.5 rounded-full bg-naranja px-7 text-base font-semibold text-hoja shadow-[0_10px_24px_-10px_var(--naranja)] hover:bg-naranja-2">
              <MessageCircle className="size-5" aria-hidden="true" /> Cuéntame de tu negocio
            </a>
            <a href="#trabajos" className="boton inline-flex h-14 items-center gap-2 rounded-full border-[1.5px] border-trazo px-6 text-base font-semibold hover:border-tinta">
              Ver trabajos entregados <ArrowDown className="size-4" aria-hidden="true" />
            </a>
          </motion.div>
          <motion.ul {...entra(4)} className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-fluid-sm text-tinta-2">
            {CAPACIDADES.map((c) => (
              <li key={c} className="inline-flex items-center gap-2"><span className="h-px w-4 bg-naranja" aria-hidden="true" />{c}</li>
            ))}
          </motion.ul>
        </div>
        <OrdenDeTrabajo poco={!!poco} />
      </div>
    </section>
  );
}

/** Orden de trabajo que se va palomeando sola hasta quedar "Entregado". Se ve una vez, al cargar. */
function OrdenDeTrabajo({ poco }: { poco: boolean }) {
  const base = poco ? 0.2 : 0.9;
  return (
    <motion.div
      initial={{ opacity: 0, transform: poco ? "none" : "translateY(24px) rotate(1.5deg)" }}
      animate={{ opacity: 1, transform: "translateY(0px) rotate(-1.2deg)" }}
      transition={{ duration: poco ? 0.3 : 0.8, ease: SALE, delay: 0.25 }}
      className="relative mx-auto w-full max-w-[420px]"
    >
      <div className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rotate-2 rounded-sm bg-ambar/70 shadow-sm" aria-hidden="true" />
      <div className="dentado bg-hoja px-6 pb-10 pt-7 shadow-[0_30px_60px_-30px_oklch(0.225_0.008_70/0.45)] sm:px-8" role="img" aria-label="Orden de trabajo de un sistema para refaccionaria, con sus cinco partes terminadas y entregada">
        <div className="flex items-start justify-between gap-4 border-b-[1.5px] border-dashed border-trazo pb-4">
          <div>
            <p className="etiqueta text-tinta-3">Orden de trabajo</p>
            <p className="font-titulo mt-1 text-xl font-bold">Sistema para refaccionaria</p>
          </div>
          <p className="font-titulo-angosta numeros text-3xl font-bold text-tinta-3">#07</p>
        </div>
        <ul className="mt-5 space-y-3.5">
          {TAREAS.map((t, i) => (
            <li key={t} className="flex items-start gap-3 text-[0.95rem]">
              <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] border-[1.5px] border-tinta">
                <motion.svg viewBox="0 0 16 16" className="size-3.5" initial={{ opacity: 0, transform: "scale(0.6)" }} animate={{ opacity: 1, transform: "scale(1)" }}
                  transition={{ duration: 0.22, ease: SALE, delay: base + i * (poco ? 0.05 : 0.32) }} aria-hidden="true">
                  <path d="M3 8.5l3 3 7-7" fill="none" stroke="var(--naranja)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-end justify-between border-t-[1.5px] border-dashed border-trazo pt-4 text-sm text-tinta-2">
          <span>Cliente: refaccionaria en CDMX</span>
          <span className="numeros">Avance semanal</span>
        </div>
        <motion.span
          initial={{ opacity: 0, transform: poco ? "rotate(-12deg)" : "rotate(-18deg) scale(1.35)" }}
          animate={{ opacity: 0.92, transform: "rotate(-12deg) scale(1)" }}
          transition={{ duration: 0.32, ease: SALE, delay: base + TAREAS.length * (poco ? 0.05 : 0.32) + 0.1 }}
          className="font-titulo absolute bottom-[6.25rem] right-5 rounded-md border-[3px] border-verde px-3 py-1 text-2xl font-extrabold uppercase tracking-widest text-verde"
          aria-hidden="true"
        >
          Entregado
        </motion.span>
      </div>
    </motion.div>
  );
}

/** Regla de taller en el borde izquierdo (decorativa). */
function Regla() {
  return (
    <div className="pointer-events-none absolute left-0 top-0 hidden h-full w-6 border-r border-linea xl:block" aria-hidden="true">
      {Array.from({ length: 60 }, (_, i) => (
        <span key={i} className="absolute left-0 h-px bg-trazo" style={{ top: i * 14 + 8, width: i % 5 === 0 ? 16 : 8 }} />
      ))}
    </div>
  );
}
