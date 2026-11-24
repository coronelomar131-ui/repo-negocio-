import { NextResponse } from "next/server";
import { consultarPago, firmaValida, hayLlave } from "@/lib/mercadopago";

/**
 * Aviso de Mercado Pago cada vez que un pago cambia (webhook). Solo se acepta con firma válida,
 * y aun así se vuelve a preguntar el pago a Mercado Pago: nunca se cree lo que diga el cuerpo.
 * Queda registrado en los logs de Vercel. Mercado Pago, además, te manda un correo por cada pago.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const cuerpo = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string } };
  const idDato = url.searchParams.get("data.id") ?? String(cuerpo.data?.id ?? "");
  const tipo = url.searchParams.get("type") ?? cuerpo.type ?? "";

  if (!idDato || !firmaValida(req.headers.get("x-signature"), req.headers.get("x-request-id"), idDato)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (tipo === "payment" && hayLlave()) {
    const p = await consultarPago(idDato);
    if (p) console.log(`[pago] ${p.id} ${p.status} $${p.transaction_amount} · ${p.description} · ref ${p.external_reference}`);
  }
  // Siempre 200 rápido: si no, Mercado Pago reintenta el aviso
  return NextResponse.json({ ok: true });
}
