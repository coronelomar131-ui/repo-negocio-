import { Revelar } from "./Revelar";

const PASOS = [
  { t: "Platicamos", d: "Me cuentas cómo trabajas hoy. Si se puede, voy a tu negocio a verlo en persona. No cuesta." },
  { t: "Te cotizo por escrito", d: "Qué incluye, qué no, cuánto cuesta y en cuántas entregas. Sin letras chiquitas." },
  { t: "Anticipo", d: "Arranco con un anticipo que pagas aquí mismo con Mercado Pago, con tarjeta o en efectivo." },
  { t: "Avances cada semana", d: "Ves el sistema crecer y lo pruebas con tu equipo. Lo que no te convence, se cambia." },
  { t: "Entrega y capacitación", d: "Lo dejo funcionando con tus datos y le enseño a cada quien su parte." },
  { t: "Soporte mensual", d: "Si algo falla o el negocio cambia, el sistema se ajusta. No te quedas solo." },
];

export function ComoTrabajo() {
  return (
    <section id="como-trabajo" aria-labelledby="como-t" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <Revelar className="max-w-3xl">
        <p className="etiqueta text-naranja">Cómo trabajo</p>
        <h2 id="como-t" className="font-titulo mt-3 text-fluid-xl font-bold leading-[1.02] text-balance">Primero entiendo tu negocio. Después escribo código.</h2>
      </Revelar>
      <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {PASOS.map((p, i) => (
          <Revelar key={p.t} como="li" retraso={Math.min(i, 5) * 60} className="relative border-t-[1.5px] border-tinta pt-5">
            <span className="font-titulo-angosta numeros text-5xl font-bold leading-none text-naranja">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="font-titulo mt-4 text-xl font-bold">{p.t}</h3>
            <p className="mt-2 max-w-[38ch] leading-relaxed text-tinta-2">{p.d}</p>
          </Revelar>
        ))}
      </ol>
    </section>
  );
}
