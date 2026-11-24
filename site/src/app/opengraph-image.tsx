import { ImageResponse } from "next/og";

export const alt = "Taller Digital by Omar: sistemas a la medida para tu negocio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen que sale al compartir la liga en WhatsApp o Facebook. */
export default function ImagenSocial() {
  const lineas = Array.from({ length: 22 }, (_, i) => i);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f3eee6", padding: 72, position: "relative" }}>
        {lineas.map((i) => <div key={"v" + i} style={{ position: "absolute", left: i * 56, top: 0, width: 1, height: 630, background: "rgba(29,27,24,0.07)" }} />)}
        {lineas.slice(0, 12).map((i) => <div key={"h" + i} style={{ position: "absolute", top: i * 56, left: 0, height: 1, width: 1200, background: "rgba(29,27,24,0.07)" }} />)}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: "#1d1b18", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="44" height="44" viewBox="0 0 40 40"><path d="M11 13h18M20 13v15" stroke="#d9531e" strokeWidth="4.4" strokeLinecap="round" fill="none" /><circle cx="20" cy="30" r="2.6" fill="#fbf8f2" /></svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: "#1d1b18" }}>Taller Digital</span>
            <span style={{ fontSize: 18, letterSpacing: 4, color: "#6b645b" }}>BY OMAR</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1, color: "#1d1b18" }}>Tu negocio no es de catálogo.</span>
          <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, color: "#d9531e" }}>Tu sistema tampoco.</span>
          <span style={{ fontSize: 28, marginTop: 28, color: "#4a453f" }}>Sistemas a la medida: ventas, inventario, cocina, caja, Mercado Libre y WhatsApp.</span>
        </div>
      </div>
    ),
    size,
  );
}
