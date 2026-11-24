import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "@/components/Marca";
import { SITIO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Aviso de privacidad · Taller Digital by Omar",
  description: "Cómo trata Taller Digital by Omar los datos personales de quienes piden cotización o pagan en línea.",
  alternates: { canonical: "/aviso-de-privacidad" },
};

const ACTUALIZADO = "24 de noviembre de 2026";

export default function AvisoDePrivacidad() {
  return (
    <main className="min-h-dvh px-4 py-10 sm:py-16">
      <article className="mx-auto max-w-2xl">
        <Link href="/" aria-label="Volver al inicio"><Marca /></Link>
        <h1 className="font-titulo mt-10 text-fluid-xl font-bold leading-[1.02]">Aviso de privacidad</h1>
        <p className="mt-3 text-sm text-tinta-3">Última actualización: {ACTUALIZADO}</p>
        <div className="mt-8 space-y-6 leading-relaxed text-tinta-2 [&_h2]:font-titulo [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-tinta">
          <section>
            <h2>Quién es responsable de tus datos</h2>
            {/* TODO(Omar): poner nombre completo y domicilio para recibir notificaciones, como pide la ley */}
            <p>Omar, que trabaja con el nombre comercial Taller Digital by Omar ({SITIO.zona}), es responsable del uso y protección de tus datos personales. Contacto: WhatsApp {SITIO.whatsappVisible}.</p>
          </section>
          <section>
            <h2>Qué datos pedimos</h2>
            <p>Tu nombre, correo, teléfono o WhatsApp, y la información de tu negocio que tú quieras contarnos para cotizar. No pedimos datos sensibles.</p>
          </section>
          <section>
            <h2>Para qué los usamos</h2>
            <p>Para responderte, preparar tu cotización, darte seguimiento al proyecto, cobrar los pagos que acordemos y enviarte comprobantes. No vendemos ni rentamos tus datos.</p>
          </section>
          <section>
            <h2>Pagos en línea</h2>
            <p>Los pagos los procesa Mercado Pago. Los datos de tu tarjeta los captura Mercado Pago directamente: nosotros nunca los vemos ni los guardamos. Mercado Pago tiene su propio aviso de privacidad.</p>
          </section>
          <section>
            <h2>Con quién se comparten</h2>
            <p>Solo con quienes hacen falta para darte el servicio: Mercado Pago para los cobros, y los servicios donde se aloja esta página y los sistemas que construimos. No se comparten con nadie más sin tu permiso, salvo que una autoridad lo pida conforme a la ley.</p>
          </section>
          <section>
            <h2>Tus derechos</h2>
            <p>Puedes pedir en cualquier momento ver tus datos, corregirlos, que los borremos o que dejemos de usarlos (derechos ARCO), o retirar tu consentimiento. Escríbenos por WhatsApp al {SITIO.whatsappVisible}; te respondemos en un plazo máximo de 20 días hábiles.</p>
          </section>
          <section>
            <h2>Cambios a este aviso</h2>
            <p>Si este aviso cambia, lo publicaremos en esta misma página con su nueva fecha.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
