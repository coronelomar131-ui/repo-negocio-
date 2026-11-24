import { NextResponse } from "next/server";
import { crearPreferencia, hayLlave } from "@/lib/mercadopago";
import { SITIO } from "@/lib/sitio";

const CONCEPTOS = ["Anticipo de proyecto", "Pago de avance", "Mensualidad de soporte", "Otro"];
const limpio = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max) : "");

/** Recibe la orden de pago del formulario, la valida aquí (no se confía en el navegador) y crea el cobro. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const concepto = limpio(b.concepto, 40);
  const nombre = limpio(b.nombre, 80);
  const correo = limpio(b.correo, 120);
  const folio = limpio(b.folio, 40);
  const monto = Math.round(Number(b.monto) * 100) / 100;

  if (!CONCEPTOS.includes(concepto)) return NextResponse.json({ error: "Elige un concepto." }, { status: 400 });
  if (!Number.isFinite(monto) || monto < 50 || monto > 200000) return NextResponse.json({ error: "El monto debe ser entre $50 y $200,000." }, { status: 400 });
  if (nombre.length < 2) return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return NextResponse.json({ error: "Ese correo no parece válido." }, { status: 400 });
  if (!hayLlave()) {
    return NextResponse.json({ error: "Los pagos en línea todavía no están activados. Escríbeme por WhatsApp y te mando la liga de pago." }, { status: 503 });
  }

  // Dirección del sitio para regresar del pago: la configurada, o la de la petición (vercel.app o dominio propio)
  const origen = req.headers.get("origin");
  const sitio = process.env.NEXT_PUBLIC_SITIO_URL ?? (origen && /^https?:\/\/[^/]+$/.test(origen) ? origen : SITIO.url);
  try {
    const liga = await crearPreferencia({ concepto, monto, nombre, correo, folio, referencia: crypto.randomUUID(), sitio });
    return NextResponse.json({ liga });
  } catch (e) {
    console.error("[pago] no se pudo crear la preferencia:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Mercado Pago no respondió. Intenta en un momento o escríbeme por WhatsApp." }, { status: 502 });
  }
}
