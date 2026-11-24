"use client";
import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { Revelar } from "./Revelar";

const PREGUNTAS = [
  { p: "¿Cuánto cuesta un sistema?", r: "Depende de cuántas partes lleve y de con qué se conecte. Por eso primero platicamos y te doy una cotización por escrito, sin costo. Se paga por partes: un anticipo para empezar y el resto conforme ves avances." },
  { p: "¿Cuánto tarda?", r: "Lo sabrás en la cotización, porque cambia mucho de un negocio a otro. Lo que sí es igual: cada semana ves avances y los pruebas con tu equipo, no esperas meses a ciegas." },
  { p: "¿Funciona en el celular?", r: "Sí. Se usa desde el navegador del celular, la tableta o la compu, sin instalar nada. Todo tu equipo ve lo mismo al mismo tiempo." },
  { p: "¿Qué pasa si se va el internet?", r: "Se puede hacer que el sistema siga trabajando sin señal y mande todo cuando regrese, como en Comandero. Si tu negocio lo necesita, lo incluimos." },
  { p: "¿Se puede conectar con Mercado Libre o WhatsApp?", r: "Sí, ya lo he hecho: ventas de Mercado Libre que entran solas al sistema, y un asistente que registra y contesta por WhatsApp. Cada conexión necesita la cuenta de tu negocio en esos servicios." },
  { p: "¿Qué pasa después de la entrega?", r: "Hay soporte mensual: si algo falla, lo arreglo, y si tu negocio cambia, el sistema se ajusta. Qué incluye exactamente queda por escrito en la cotización." },
  { p: "¿Cómo pago?", r: "Aquí mismo en la página, con Mercado Pago: tarjeta de crédito, débito o efectivo, según las opciones que te muestre. Te llega tu comprobante por correo." },
];

export function Preguntas() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-t" className="border-t border-linea">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-28">
        <Revelar>
          <p className="etiqueta text-naranja">Preguntas</p>
          <h2 id="preguntas-t" className="font-titulo mt-3 text-fluid-xl font-bold leading-[1.02] text-balance">Lo que casi todos me preguntan.</h2>
        </Revelar>
        <Revelar retraso={100}>
          <Accordion.Root type="single" collapsible className="divide-y divide-linea border-y border-linea">
            {PREGUNTAS.map((q) => (
              <Accordion.Item key={q.p} value={q.p}>
                <Accordion.Header asChild>
                  <h3>
                    <Accordion.Trigger className="group flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left">
                      <span className="font-titulo text-lg font-semibold">{q.p}</span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-trazo transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-data-[state=open]:rotate-45" aria-hidden="true">
                        <Plus className="size-4" />
                      </span>
                    </Accordion.Trigger>
                  </h3>
                </Accordion.Header>
                <Accordion.Content className="acordeon overflow-hidden">
                  <p className="max-w-[62ch] pb-5 leading-relaxed text-tinta-2">{q.r}</p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </Revelar>
      </div>
    </section>
  );
}
