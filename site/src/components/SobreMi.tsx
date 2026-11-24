import { Revelar } from "./Revelar";
import { SITIO } from "@/lib/sitio";

/** Quién está detrás del taller. Omar puede cambiar este texto y poner su foto. */
export function SobreMi() {
  return (
    <section aria-labelledby="sobre-t" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid items-center gap-10 lg:grid-cols-[320px_1fr] lg:gap-16">
        <Revelar>
          {/* Lugar para la foto de Omar: mientras, un monograma */}
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[320px] rotate-[-1.5deg] overflow-hidden rounded-[22px] bg-acero shadow-[0_30px_60px_-30px_oklch(0.225_0.008_70/0.5)]">
            <div className="tapete absolute inset-0 opacity-40" aria-hidden="true" />
            <span className="font-titulo absolute inset-0 grid place-items-center text-[9rem] font-extrabold leading-none text-hoja/90" aria-hidden="true">O</span>
            <span className="etiqueta absolute bottom-4 left-4 rounded-md bg-hoja px-2.5 py-1.5 text-tinta">Omar · {SITIO.marca}</span>
          </div>
        </Revelar>
        <Revelar retraso={120}>
          <p className="etiqueta text-naranja">Quién hace los sistemas</p>
          <h2 id="sobre-t" className="font-titulo mt-3 text-fluid-xl font-bold leading-[1.02] text-balance">Soy Omar. Hago sistemas para negocios como el tuyo.</h2>
          <div className="mt-6 max-w-[60ch] space-y-4 text-fluid-base leading-relaxed text-tinta-2">
            <p>Empecé por necesidad: el negocio de autopartes que conozco por dentro se estaba ahogando en notas, hojas de Excel y mensajes. Ningún programa de catálogo le quedaba, así que lo construí a la medida. Hoy ese sistema lleva ventas, inventario, Mercado Libre y cobranza, y el equipo lo usa todos los días.</p>
            <p>Así trabajo con cada cliente: entro a ver cómo se mueve tu negocio, te pregunto lo que nadie te pregunta y hago el sistema alrededor de eso. Si algo no se usa, sobra.</p>
          </div>
          <dl className="mt-8 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
            {[["2", "sistemas hechos de punta a punta"], ["MX", "hecho en México, en español"], ["1 a 1", "tratas directo conmigo"]].map(([n, t]) => (
              <div key={t} className="border-t-[1.5px] border-tinta pt-3">
                <dt className="sr-only">{t}</dt>
                <dd><span className="font-titulo-angosta block text-4xl font-bold">{n}</span><span className="mt-1 block text-sm text-tinta-2">{t}</span></dd>
              </div>
            ))}
          </dl>
        </Revelar>
      </div>
    </section>
  );
}
