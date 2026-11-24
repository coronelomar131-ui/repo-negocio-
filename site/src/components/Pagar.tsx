"use client";
import { useState, type FormEvent } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Revelar } from "./Revelar";

/** Orden de pago: arma el cobro y manda a la persona al cobro seguro de Mercado Pago. */
const CONCEPTOS = ["Anticipo de proyecto", "Pago de avance", "Mensualidad de soporte", "Otro"] as const;

export function Pagar() {
  const [concepto, setConcepto] = useState<(typeof CONCEPTOS)[number]>("Anticipo de proyecto");
  const [monto, setMonto] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [folio, setFolio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const pesos = Number(monto.replace(/[^0-9.]/g, ""));
  const valido = pesos >= 50 && pesos <= 200000 && nombre.trim().length > 1 && /^\S+@\S+\.\S+$/.test(correo.trim());

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true); setError("");
    try {
      const r = await fetch("/api/pago", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepto, monto: pesos, nombre: nombre.trim(), correo: correo.trim(), folio: folio.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.liga) throw new Error(d.error ?? "No se pudo preparar el pago. Intenta de nuevo o escríbeme por WhatsApp.");
      window.location.href = d.liga;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEnviando(false);
    }
  }

  return (
    <section id="pagar" aria-labelledby="pagar-t" className="bg-tinta text-hoja">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:py-28">
        <Revelar>
          <p className="etiqueta text-naranja">Pagar en línea</p>
          <h2 id="pagar-t" className="font-titulo mt-3 text-fluid-xl font-bold leading-[1.02] text-balance">¿Ya tienes tu cotización? Paga aquí.</h2>
          <p className="mt-5 max-w-[48ch] text-fluid-base leading-relaxed text-papel-3">
            El cobro lo hace Mercado Pago: pagas con tarjeta de crédito o débito, o en efectivo, según las opciones que te muestre. Yo nunca veo los datos de tu tarjeta.
          </p>
          <ul className="mt-8 space-y-3 text-papel-2">
            {["Te llega el comprobante a tu correo", "Pon el folio de tu cotización para ubicar tu pago", "¿Dudas antes de pagar? Escríbeme por WhatsApp"].map((t) => (
              <li key={t} className="flex gap-3"><span className="mt-2.5 h-px w-4 shrink-0 bg-naranja" aria-hidden="true" />{t}</li>
            ))}
          </ul>
        </Revelar>

        <Revelar retraso={120}>
          <form onSubmit={enviar} className="dentado bg-hoja px-6 pb-12 pt-6 text-tinta sm:px-8" noValidate>
            <div className="flex items-baseline justify-between border-b-[1.5px] border-dashed border-trazo pb-4">
              <p className="font-titulo text-xl font-bold">Orden de pago</p>
              <p className="etiqueta text-tinta-3">Taller Digital</p>
            </div>
            <fieldset className="mt-5">
              <legend className="etiqueta text-tinta-2">Concepto</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CONCEPTOS.map((c) => (
                  <label key={c} className={`boton flex min-h-11 cursor-pointer items-center rounded-xl border-[1.5px] px-3 text-sm font-medium ${concepto === c ? "border-tinta bg-papel-2" : "border-trazo"}`}>
                    <input type="radio" name="concepto" value={c} checked={concepto === c} onChange={() => setConcepto(c)} className="sr-only" />{c}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Monto en pesos" id="monto">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-tinta-3">$</span>
                  <input id="monto" inputMode="decimal" required value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="2500" className="entrada numeros pl-8 font-titulo text-xl font-bold" aria-describedby="monto-ayuda" />
                </div>
                <span id="monto-ayuda" className="mt-1 block text-xs text-tinta-3">Entre $50 y $200,000</span>
              </Campo>
              <Campo etiqueta="Folio de cotización (opcional)" id="folio">
                <input id="folio" value={folio} onChange={(e) => setFolio(e.target.value)} maxLength={40} placeholder="COT-012" className="entrada" />
              </Campo>
              <Campo etiqueta="Tu nombre" id="nombre">
                <input id="nombre" required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} className="entrada" />
              </Campo>
              <Campo etiqueta="Tu correo" id="correo">
                <input id="correo" type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} maxLength={120} className="entrada" />
              </Campo>
            </div>
            {error && <p className="baja-suave mt-4 rounded-xl bg-naranja-suave px-3 py-2 text-sm" role="alert">{error}</p>}
            <button type="submit" disabled={!valido || enviando} className="boton mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-naranja text-base font-semibold text-hoja hover:bg-naranja-2 disabled:opacity-40">
              {enviando ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Lock className="size-4.5" aria-hidden="true" />}
              {enviando ? "Preparando el pago…" : pesos >= 50 ? `Pagar $${pesos.toLocaleString("es-MX")} con Mercado Pago` : "Pagar con Mercado Pago"}
            </button>
            <p className="mt-3 text-center text-xs text-tinta-3">Al pagar aceptas el <a href="/aviso-de-privacidad" className="underline underline-offset-2">aviso de privacidad</a>.</p>
          </form>
        </Revelar>
      </div>
    </section>
  );
}

function Campo({ etiqueta, id, children }: { etiqueta: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="etiqueta mb-1.5 block text-tinta-2">{etiqueta}</label>
      {children}
    </div>
  );
}
