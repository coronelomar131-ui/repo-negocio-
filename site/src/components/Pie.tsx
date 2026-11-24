import { MessageCircle } from "lucide-react";
import { Marca } from "./Marca";
import { Revelar } from "./Revelar";
import { SITIO, ligaWhatsApp } from "@/lib/sitio";

export function Cierre() {
  return (
    <section aria-labelledby="cierre-t" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pb-28">
      <Revelar>
        <div className="tapete relative overflow-hidden rounded-[28px] border border-trazo bg-hoja px-6 py-14 text-center sm:px-12 sm:py-20">
          <p className="etiqueta text-naranja">Tu turno</p>
          <h2 id="cierre-t" className="font-titulo mx-auto mt-4 max-w-[18ch] text-fluid-xl font-extrabold leading-[1] text-balance">Cuéntame cómo trabaja tu negocio.</h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-fluid-base text-tinta-2">Una plática de 15 minutos por WhatsApp. Si no te puedo ayudar, te lo digo de frente.</p>
          <a href={ligaWhatsApp("Hola Omar, quiero platicarte de mi negocio.")} target="_blank" rel="noopener"
            className="boton mt-9 inline-flex h-14 items-center gap-2.5 rounded-full bg-naranja px-8 text-base font-semibold text-hoja shadow-[0_10px_24px_-10px_var(--naranja)] hover:bg-naranja-2">
            <MessageCircle className="size-5" aria-hidden="true" /> Escríbeme al {SITIO.whatsappVisible}
          </a>
        </div>
      </Revelar>
    </section>
  );
}

export function Pie() {
  return (
    <footer className="bg-tinta text-papel-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <Marca claro />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">Sistemas a la medida para negocios mexicanos. {SITIO.zona}.</p>
        </div>
        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <a href="#trabajos" className="subraya-hover hover:text-hoja">Trabajos</a>
          <a href="#arma" className="subraya-hover hover:text-hoja">Arma tu sistema</a>
          <a href="#como-trabajo" className="subraya-hover hover:text-hoja">Cómo trabajo</a>
          <a href="#pagar" className="subraya-hover hover:text-hoja">Pagar</a>
          <a href={ligaWhatsApp("Hola Omar.")} target="_blank" rel="noopener" className="subraya-hover hover:text-hoja">WhatsApp {SITIO.whatsappVisible}</a>
          <a href="/aviso-de-privacidad" className="subraya-hover hover:text-hoja">Aviso de privacidad</a>
        </nav>
      </div>
      <div className="border-t border-[oklch(1_0_0/0.1)]">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-sm sm:px-6" style={{ color: "oklch(0.7 0.01 70)" }}>
          © 2026 Taller Digital by Omar · Built with Claude Web Builder by{" "}
          <a href="https://tododeia.com" target="_blank" rel="noopener" className="underline underline-offset-2">Tododeia</a>
        </p>
      </div>
    </footer>
  );
}
