"use client";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, MessageCircle } from "lucide-react";
import { Marca } from "./Marca";
import { ligaWhatsApp } from "@/lib/sitio";

const LIGAS = [
  { href: "#trabajos", texto: "Trabajos" },
  { href: "#arma", texto: "Arma tu sistema" },
  { href: "#como-trabajo", texto: "Cómo trabajo" },
  { href: "#pagar", texto: "Pagar" },
  { href: "#preguntas", texto: "Preguntas" },
];
const HOLA = "Hola Omar, vi tu página de Taller Digital y quiero platicarte de mi negocio.";

export function Navegacion() {
  const [abierto, setAbierto] = useState(false);
  const [bajo, setBajo] = useState(false);
  // La barra toma fondo solo cuando ya hay contenido debajo
  useEffect(() => {
    const f = () => setBajo(window.scrollY > 12);
    f(); addEventListener("scroll", f, { passive: true });
    return () => removeEventListener("scroll", f);
  }, []);

  return (
    <header className={`sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200 ${bajo ? "border-linea bg-papel/92 backdrop-blur-md" : "border-transparent bg-transparent"}`}>
      <nav aria-label="Principal" className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#inicio" aria-label="Taller Digital by Omar, inicio"><Marca /></a>
        <ul className="hidden items-center gap-7 lg:flex">
          {LIGAS.map((l) => <li key={l.href}><a href={l.href} className="subraya-hover text-fluid-sm font-medium text-tinta-2 hover:text-tinta">{l.texto}</a></li>)}
        </ul>
        <div className="flex items-center gap-2">
          <a href={ligaWhatsApp(HOLA)} target="_blank" rel="noopener" className="boton hidden h-11 items-center gap-2 rounded-full bg-tinta px-5 text-sm font-semibold text-hoja hover:bg-acero sm:inline-flex">
            <MessageCircle className="size-4" aria-hidden="true" /> Escríbeme
          </a>
          <Dialog.Root open={abierto} onOpenChange={setAbierto}>
            <Dialog.Trigger className="boton grid size-11 place-items-center rounded-full border border-trazo lg:hidden" aria-label="Abrir menú">
              <Menu className="size-5" aria-hidden="true" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="cortina fixed inset-0 z-50 bg-tinta/40" />
              <Dialog.Content className="cajon fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-hoja px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4 shadow-2xl" aria-describedby={undefined}>
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-papel-3" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <Dialog.Title asChild><span><Marca /></span></Dialog.Title>
                  <Dialog.Close className="boton grid size-11 place-items-center rounded-full border border-trazo" aria-label="Cerrar menú"><X className="size-5" aria-hidden="true" /></Dialog.Close>
                </div>
                <ul className="mt-6 divide-y divide-linea">
                  {LIGAS.map((l) => (
                    <li key={l.href}><a href={l.href} onClick={() => setAbierto(false)} className="font-titulo flex min-h-14 items-center text-2xl font-semibold">{l.texto}</a></li>
                  ))}
                </ul>
                <a href={ligaWhatsApp(HOLA)} target="_blank" rel="noopener" className="boton mt-6 flex h-14 items-center justify-center gap-2 rounded-full bg-naranja text-base font-semibold text-hoja">
                  <MessageCircle className="size-5" aria-hidden="true" /> Escríbeme por WhatsApp
                </a>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </nav>
    </header>
  );
}
