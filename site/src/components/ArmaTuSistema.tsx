"use client";
import { useState } from "react";
import { MessageCircle, Check } from "lucide-react";
import { ligaWhatsApp } from "@/lib/sitio";
import { Revelar } from "./Revelar";

/** "Arma tu sistema": la persona marca las piezas que necesita y sale el mensaje de WhatsApp ya escrito. */
const GRUPOS = [
  { nombre: "Vender", piezas: ["Ventas y notas con folio", "Cotizaciones", "Clientes y crédito", "Punto de venta de mostrador"] },
  { nombre: "Operar", piezas: ["Inventario", "Compras y proveedores", "Envíos y guías", "Pedidos y comandas", "Agenda y citas"] },
  { nombre: "Cobrar", piezas: ["Cobranza", "Caja y corte del día", "Pagos en línea", "Seguimiento de facturas"] },
  { nombre: "Conectar", piezas: ["Mercado Libre", "WhatsApp con asistente", "Reportes por WhatsApp", "Tienda en línea"] },
  { nombre: "Equipo", piezas: ["Roles y permisos", "Acceso con PIN", "Funciona sin internet", "Comisiones de vendedores"] },
];
const GIROS = ["Refaccionaria", "Restaurante o fonda", "Tienda o abarrotes", "Taller o servicio", "Distribuidora", "Otro"];

export function ArmaTuSistema() {
  const [giro, setGiro] = useState<string | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const alternar = (p: string) => setMarcadas((m) => (m.includes(p) ? m.filter((x) => x !== p) : [...m, p]));
  const mensaje = `Hola Omar, vi tu página de Taller Digital.${giro ? ` Tengo un negocio: ${giro.toLowerCase()}.` : ""}${marcadas.length ? ` Me interesa un sistema con: ${marcadas.join(", ")}.` : ""} ¿Me cotizas?`;

  return (
    <section id="arma" aria-labelledby="arma-t" className="border-y border-linea bg-papel-2/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <Revelar className="max-w-3xl">
          <p className="etiqueta text-naranja">Arma tu sistema</p>
          <h2 id="arma-t" className="font-titulo mt-3 text-fluid-xl font-bold leading-[1.02] text-balance">Escoge las piezas. Lo demás lo platicamos.</h2>
          <p className="mt-5 text-fluid-base leading-relaxed text-tinta-2">Marca lo que tu negocio necesita. Con eso te escribo una cotización por escrito, sin costo y sin compromiso.</p>
        </Revelar>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="space-y-8">
            <fieldset>
              <legend className="etiqueta text-tinta-2">Tu negocio</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {GIROS.map((g) => (
                  <button key={g} type="button" aria-pressed={giro === g} onClick={() => setGiro(giro === g ? null : g)}
                    className={`boton min-h-11 rounded-full border-[1.5px] px-4 text-sm font-semibold ${giro === g ? "border-tinta bg-tinta text-hoja" : "border-trazo bg-hoja/60 hover:border-tinta"}`}>{g}</button>
                ))}
              </div>
            </fieldset>
            {GRUPOS.map((gr) => (
              <fieldset key={gr.nombre}>
                <legend className="etiqueta text-tinta-2">{gr.nombre}</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {gr.piezas.map((p) => {
                    const si = marcadas.includes(p);
                    return (
                      <button key={p} type="button" aria-pressed={si} onClick={() => alternar(p)}
                        className={`boton inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] px-3.5 text-sm font-medium ${si ? "border-naranja bg-naranja-suave text-tinta" : "border-trazo bg-hoja/60 hover:border-tinta"}`}>
                        <span className={`grid size-4.5 place-items-center rounded-[5px] border-[1.5px] transition-colors duration-150 ${si ? "border-naranja bg-naranja text-hoja" : "border-trazo"}`} aria-hidden="true">
                          {si && <Check className="size-3" strokeWidth={3.5} />}
                        </span>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            {/* En celular el resumen queda hasta abajo: esta barra acompaña mientras se escogen piezas */}
            <div className="sticky bottom-4 z-10 lg:hidden">
              <div className="flex items-center justify-between gap-3 rounded-full bg-tinta py-2 pl-5 pr-2 text-hoja shadow-[0_16px_30px_-12px_oklch(0.225_0.008_70/0.6)]">
                <span className="text-sm font-semibold" aria-live="polite">{marcadas.length ? `${marcadas.length} ${marcadas.length === 1 ? "pieza" : "piezas"}` : "Escoge piezas"}</span>
                <a href={ligaWhatsApp(mensaje)} target="_blank" rel="noopener" className="boton inline-flex h-11 items-center gap-2 rounded-full bg-naranja px-4 text-sm font-semibold">
                  <MessageCircle className="size-4" aria-hidden="true" /> Cotizar
                </a>
              </div>
            </div>
          </div>

          {/* Resumen pegado mientras se baja */}
          <aside className="lg:sticky lg:top-24" aria-label="Tu sistema">
            <div className="dentado bg-hoja px-5 pb-9 pt-5 shadow-[0_24px_50px_-30px_oklch(0.225_0.008_70/0.45)]">
              <p className="etiqueta text-tinta-3">Tu sistema</p>
              <p className="font-titulo mt-1 text-2xl font-bold">{marcadas.length ? `${marcadas.length} ${marcadas.length === 1 ? "pieza" : "piezas"}` : "Aún sin piezas"}</p>
              {giro && <p className="mt-1 text-sm text-tinta-2">Para: {giro}</p>}
              <ul className="mt-4 max-h-56 space-y-1.5 overflow-auto border-y-[1.5px] border-dashed border-trazo py-3 text-sm" aria-live="polite">
                {marcadas.length ? marcadas.map((m) => <li key={m} className="entra-suave flex gap-2"><span className="text-naranja" aria-hidden="true">—</span>{m}</li>) : <li className="text-tinta-3">Marca las piezas de la izquierda.</li>}
              </ul>
              <a href={ligaWhatsApp(mensaje)} target="_blank" rel="noopener"
                className="boton mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-naranja text-sm font-semibold text-hoja hover:bg-naranja-2">
                <MessageCircle className="size-4.5" aria-hidden="true" /> Pedir cotización por WhatsApp
              </a>
              <p className="mt-3 text-center text-xs text-tinta-3">Te llega el mensaje ya escrito.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
