import { Navegacion } from "@/components/Navegacion";
import { Portada } from "@/components/Portada";
import { Antes } from "@/components/Antes";
import { Trabajos } from "@/components/Trabajos";
import { ArmaTuSistema } from "@/components/ArmaTuSistema";
import { ComoTrabajo } from "@/components/ComoTrabajo";
import { Pagar } from "@/components/Pagar";
import { SobreMi } from "@/components/SobreMi";
import { Preguntas } from "@/components/Preguntas";
import { Cierre, Pie } from "@/components/Pie";
import { SITIO } from "@/lib/sitio";

// Datos estructurados para Google: negocio de servicios con su contacto
const datos = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Taller Digital by Omar",
  description: "Sistemas a la medida para negocios mexicanos: ventas, inventario, notas, cocina, caja y cobranza.",
  url: SITIO.url,
  telephone: SITIO.whatsappVisible,
  areaServed: "MX",
  founder: { "@type": "Person", name: "Omar" },
};

export default function Inicio() {
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-tinta focus:px-4 focus:py-2 focus:text-hoja">Saltar al contenido</a>
      <Navegacion />
      <main id="contenido">
        <Portada />
        <Antes />
        <Trabajos />
        <ArmaTuSistema />
        <ComoTrabajo />
        <Pagar />
        <SobreMi />
        <Preguntas />
        <Cierre />
      </main>
      <Pie />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos) }} />
    </>
  );
}
