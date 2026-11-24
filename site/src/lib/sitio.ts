/** Datos del taller. Lo que Omar cambie aquí se cambia en toda la página. */
export const SITIO = {
  marca: "Taller Digital",
  firma: "by Omar",
  nombre: "Omar",
  zona: "Ciudad de México y a distancia en todo México",
  whatsapp: "523339791593",
  whatsappVisible: "+52 333 979 1593",
  url: process.env.NEXT_PUBLIC_SITIO_URL ?? "https://tallerdigital.vercel.app",
};

/** Liga de WhatsApp con un mensaje ya escrito. */
export function ligaWhatsApp(mensaje: string) {
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
