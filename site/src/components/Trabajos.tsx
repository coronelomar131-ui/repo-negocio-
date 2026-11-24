import { Revelar } from "./Revelar";
import { DemoRefaccionaria } from "./DemoRefaccionaria";
import { DemoRestaurante } from "./DemoRestaurante";

const CASOS = [
  {
    ficha: "Trabajo 01",
    giro: "Refaccionaria",
    titulo: "Del mostrador a Mercado Libre, en un solo sistema",
    texto: "Una refaccionaria que vendía en mostrador, a talleres a crédito y en Mercado Libre, con todo apuntado en lugares distintos. Le hice un sistema con notas y folios, inventario, compras con su utilidad, envíos con guía y cobranza. Lo mejor: un asistente por WhatsApp que registra ventas y contesta cuánto debe cada cliente.",
    piezas: ["Notas y folios", "Inventario", "Mercado Libre", "Asistente por WhatsApp", "Cobranza", "Envíos y guías", "Roles por puesto"],
    demo: <DemoRefaccionaria />,
    nota: "Para cuidar al cliente, aquí lleva otro nombre, otro diseño y datos inventados.",
  },
  {
    ficha: "Trabajo 02",
    giro: "Restaurantes y fondas",
    titulo: "Comandero: la mesa, la cocina y la caja hablando entre sí",
    texto: "Un sistema propio para restaurantes. El mesero toma el pedido por comensal, la cocina lo recibe al momento con su tiempo corriendo, y la caja cobra, divide la cuenta e imprime el ticket. Cada mesero entra con su PIN y, si se va el internet, se sigue trabajando.",
    piezas: ["Pedido por comensal", "Comandas a cocina", "Cobro y ticket", "Corte de caja", "Acceso con PIN", "Funciona sin internet"],
    demo: <DemoRestaurante />,
    nota: "Pruébalo: toca la mesa 3, ábrela, pide algo y mándalo a cocina.",
  },
];

export function Trabajos() {
  return (
    <section id="trabajos" aria-labelledby="trabajos-t" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <Revelar className="max-w-3xl">
        <p className="etiqueta text-naranja">Trabajos entregados</p>
        <h2 id="trabajos-t" className="font-titulo mt-3 text-fluid-xl font-bold leading-[1.02] text-balance">No te enseño plantillas. Te enseño sistemas que hice de punta a punta.</h2>
        <p className="mt-5 text-fluid-base leading-relaxed text-tinta-2">Tócalos: son versiones de prueba que funcionan aquí mismo.</p>
      </Revelar>
      <div className="mt-16 space-y-24 lg:space-y-32">
        {CASOS.map((c, i) => (
          <article key={c.ficha} className={`grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <Revelar>
              <div className="flex items-center gap-3">
                <span className="etiqueta rounded-md bg-tinta px-2.5 py-1.5 text-hoja">{c.ficha}</span>
                <span className="etiqueta text-tinta-3">{c.giro}</span>
              </div>
              <h3 className="font-titulo mt-5 text-fluid-lg font-bold leading-tight text-balance">{c.titulo}</h3>
              <p className="mt-4 max-w-[56ch] text-fluid-base leading-relaxed text-tinta-2">{c.texto}</p>
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Partes del sistema">
                {c.piezas.map((p) => <li key={p} className="rounded-full border border-trazo px-3 py-1.5 text-sm">{p}</li>)}
              </ul>
              <p className="mt-6 border-l-2 border-naranja pl-3 text-sm text-tinta-3">{c.nota}</p>
            </Revelar>
            <Revelar retraso={120}>{c.demo}</Revelar>
          </article>
        ))}
      </div>
    </section>
  );
}
