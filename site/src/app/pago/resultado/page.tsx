import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { consultarPago, hayLlave, type Pago } from "@/lib/mercadopago";
import { Marca } from "@/components/Marca";
import { ligaWhatsApp } from "@/lib/sitio";

export const metadata: Metadata = { title: "Resultado de tu pago · Taller Digital by Omar", robots: { index: false } };

const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const METODO: Record<string, string> = {
  account_money: "Dinero en Mercado Pago", oxxo: "Efectivo en OXXO", paycash: "Efectivo en tienda",
  visa: "Tarjeta Visa", debvisa: "Tarjeta de débito Visa", master: "Tarjeta Mastercard", debmaster: "Tarjeta de débito Mastercard", amex: "Tarjeta American Express",
};

type Busqueda = Promise<Record<string, string | undefined>>;

/** Regreso de Mercado Pago. El marco sale de inmediato; el estado se confirma con Mercado Pago, no se toma de la URL. */
export default function Resultado({ searchParams }: { searchParams: Busqueda }) {
  return (
    <main className="tapete min-h-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-lg">
        <Link href="/" aria-label="Volver al inicio"><Marca /></Link>
        <Suspense fallback={<Hoja><p className="etiqueta text-tinta-3">Orden de pago</p><p className="font-titulo mt-5 text-fluid-lg font-bold">Confirmando tu pago con Mercado Pago…</p></Hoja>}>
          <Estado searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

function Hoja({ children }: { children: React.ReactNode }) {
  return <div className="dentado mt-10 bg-hoja px-6 pb-12 pt-7 shadow-[0_30px_60px_-30px_oklch(0.225_0.008_70/0.45)] sm:px-8">{children}</div>;
}

async function Estado({ searchParams }: { searchParams: Busqueda }) {
  const q = await searchParams;
  const id = q.payment_id ?? q.collection_id ?? "";
  let pago: Pago | null = null;
  if (id && id !== "null" && hayLlave()) pago = await consultarPago(id).catch(() => null);
  const estado = pago?.status ?? (id ? "sin-confirmar" : "cancelado");

  const VISTA: Record<string, { t: string; d: string; tono: string }> = {
    approved: { t: "Pago recibido. ¡Gracias!", d: "Ya quedó registrado. Te llega el comprobante a tu correo y yo te escribo para seguir.", tono: "bg-verde-suave" },
    in_process: { t: "Tu pago se está revisando", d: "Mercado Pago lo está validando. En cuanto se apruebe te llega un correo.", tono: "bg-ambar/60" },
    pending: { t: "Tu pago está pendiente", d: "Si elegiste pagar en efectivo, tienes la ficha en tu correo. En cuanto pagues, se confirma solo.", tono: "bg-ambar/60" },
    rejected: { t: "El pago no pasó", d: "Mercado Pago lo rechazó. Puedes intentar con otra tarjeta u otro medio, o escribirme.", tono: "bg-naranja-suave" },
    cancelado: { t: "No se hizo ningún cobro", d: "Saliste antes de pagar. Cuando quieras, vuelve a intentarlo.", tono: "bg-papel-2" },
    "sin-confirmar": { t: "Recibimos tu regreso", d: "Todavía no puedo confirmar el pago desde aquí. Si te llegó el comprobante de Mercado Pago, ya está; si no, escríbeme.", tono: "bg-papel-2" },
  };
  const v = VISTA[estado] ?? VISTA["sin-confirmar"];

  return (
        <Hoja>
          <span className={`etiqueta inline-block rounded-md px-2.5 py-1.5 ${v.tono}`}>Orden de pago</span>
          <h1 className="font-titulo mt-5 text-fluid-xl font-bold leading-[1.02]">{v.t}</h1>
          <p className="mt-4 leading-relaxed text-tinta-2">{v.d}</p>
          {pago && (
            <dl className="mt-7 space-y-2 border-t-[1.5px] border-dashed border-trazo pt-5 text-sm">
              <Fila t="Concepto" v={pago.description} />
              <Fila t="Monto" v={pesos(pago.transaction_amount)} />
              <Fila t="Forma de pago" v={METODO[pago.payment_method_id] ?? pago.payment_method_id} />
              <Fila t="Número de pago" v={String(pago.id)} />
            </dl>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={estado === "approved" ? "/" : "/#pagar"} className="boton inline-flex h-12 items-center rounded-full bg-tinta px-6 text-sm font-semibold text-hoja">
              {estado === "approved" ? "Volver al inicio" : "Intentar de nuevo"}
            </Link>
            <a href={ligaWhatsApp(`Hola Omar, sobre mi pago${pago ? ` número ${pago.id}` : ""}: `)} target="_blank" rel="noopener"
              className="boton inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-trazo px-5 text-sm font-semibold">
              <MessageCircle className="size-4" aria-hidden="true" /> Escribirme
            </a>
          </div>
        </Hoja>
  );
}

function Fila({ t, v }: { t: string; v: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-tinta-3">{t}</dt><dd className="numeros text-right font-semibold">{v}</dd></div>;
}
