import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Mercado Pago (Checkout Pro). La llave privada vive solo en el servidor, en la variable
 * MP_ACCESS_TOKEN de Vercel; nunca llega al navegador.
 */
const API = process.env.MP_API_URL ?? "https://api.mercadopago.com";

export const hayLlave = () => Boolean(process.env.MP_ACCESS_TOKEN);
const llave = () => {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("Falta MP_ACCESS_TOKEN");
  return t;
};

export interface Preferencia { concepto: string; monto: number; nombre: string; correo: string; folio: string; referencia: string; sitio: string }

/** Crea el cobro y regresa la liga a la pantalla de pago de Mercado Pago. */
export async function crearPreferencia(p: Preferencia): Promise<string> {
  const publica = p.sitio.startsWith("https://") && !p.sitio.includes("localhost");
  const regreso = `${p.sitio}/pago/resultado`;
  const r = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${llave()}`, "Content-Type": "application/json", "X-Idempotency-Key": p.referencia },
    body: JSON.stringify({
      items: [{ id: p.folio || "pago-taller", title: `${p.concepto}${p.folio ? ` · ${p.folio}` : ""}`, quantity: 1, currency_id: "MXN", unit_price: p.monto }],
      payer: { name: p.nombre, email: p.correo },
      back_urls: { success: regreso, pending: regreso, failure: regreso },
      ...(publica ? { auto_return: "approved", notification_url: `${p.sitio}/api/mercadopago/aviso` } : {}),
      external_reference: p.referencia,
      statement_descriptor: "TALLER DIGITAL",
      metadata: { concepto: p.concepto, folio: p.folio, nombre: p.nombre },
    }),
    cache: "no-store",
  });
  const d = (await r.json().catch(() => ({}))) as { init_point?: string; sandbox_init_point?: string; message?: string };
  if (!r.ok || !d.init_point) throw new Error(`Mercado Pago respondió ${r.status}: ${d.message ?? "sin detalle"}`);
  // Con llaves de prueba se usa la pantalla de pruebas
  return llave().startsWith("TEST-") ? (d.sandbox_init_point ?? d.init_point) : d.init_point;
}

export interface Pago { id: number; status: string; status_detail: string; transaction_amount: number; description: string; external_reference: string; date_approved: string | null; payment_method_id: string }

/** Pregunta a Mercado Pago cómo quedó un pago. Es la única fuente confiable (la URL de regreso se puede alterar). */
export async function consultarPago(id: string): Promise<Pago | null> {
  if (!/^\d{1,20}$/.test(id)) return null;
  const r = await fetch(`${API}/v1/payments/${id}`, { headers: { Authorization: `Bearer ${llave()}` }, cache: "no-store" });
  if (!r.ok) return null;
  return (await r.json()) as Pago;
}

/**
 * Revisa la firma de los avisos de Mercado Pago (encabezado x-signature) con la clave secreta
 * del panel de Webhooks (MP_WEBHOOK_SECRET). Sin clave configurada, no se confía en el aviso.
 */
export function firmaValida(firma: string | null, idSolicitud: string | null, idDato: string): boolean {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto || !firma) return false;
  const partes = Object.fromEntries(firma.split(",").map((x) => x.trim().split("=") as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const manifiesto = `id:${idDato.toLowerCase()};${idSolicitud ? `request-id:${idSolicitud};` : ""}ts:${partes.ts};`;
  const esperada = createHmac("sha256", secreto).update(manifiesto).digest("hex");
  const a = Buffer.from(esperada), b = Buffer.from(partes.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
