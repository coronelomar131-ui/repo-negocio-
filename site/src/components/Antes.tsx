import { Revelar } from "./Revelar";

const ANTES = [
  { t: "Notas en libreta", d: "Folios repetidos y nadie sabe cuál fue la última." },
  { t: "Inventario en Excel", d: "Dice que hay tres y en el anaquel no hay ninguna." },
  { t: "Pedidos por el grupo", d: "El mensaje importante quedó arriba de cuarenta stickers." },
  { t: "Cobranza de memoria", d: "¿Ya pagó el del taller? Hay que buscar el ticket." },
];
const DESPUES = [
  "Cada venta con su nota y su folio, sin saltos",
  "El inventario se descuenta solo al vender",
  "Todo el equipo ve lo mismo, al mismo tiempo",
  "Sabes quién te debe y desde cuándo",
];

export function Antes() {
  return (
    <section aria-labelledby="antes-t" className="border-y border-linea bg-papel-2/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <Revelar>
          <p className="etiqueta text-naranja">Así empieza casi siempre</p>
          <h2 id="antes-t" className="font-titulo mt-3 text-fluid-xl font-bold leading-[1.02] text-balance">El negocio crece y la libreta ya no alcanza.</h2>
          <p className="mt-5 max-w-[52ch] text-fluid-base leading-relaxed text-tinta-2">
            No necesitas un programa enorme lleno de botones que nadie usa. Necesitas que lo que ya hacen tú y tu equipo quede ordenado en un solo lugar, en el celular y en la compu.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {ANTES.map((a, i) => (
              <li key={a.t} className="rounded-2xl border border-linea bg-hoja/70 p-4" style={{ transform: `rotate(${[-1.2, 0.8, 0.6, -0.9][i]}deg)` }}>
                <p className="font-titulo-angosta text-lg font-bold text-tinta-2 line-through decoration-naranja decoration-2">{a.t}</p>
                <p className="mt-1 text-sm leading-snug text-tinta-3">{a.d}</p>
              </li>
            ))}
          </ul>
        </Revelar>
        <Revelar retraso={120} className="self-center">
          <div className="rounded-[28px] bg-tinta p-7 text-hoja sm:p-9">
            <p className="etiqueta text-naranja">Después</p>
            <p className="font-titulo mt-3 text-fluid-lg font-bold leading-tight">Un sistema hecho para cómo trabajas tú.</p>
            <ul className="mt-6 space-y-4">
              {DESPUES.map((d) => (
                <li key={d} className="flex gap-3 text-fluid-base leading-snug text-papel-2">
                  <svg viewBox="0 0 20 20" className="mt-1 size-4 shrink-0" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="var(--naranja)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </Revelar>
      </div>
    </section>
  );
}
