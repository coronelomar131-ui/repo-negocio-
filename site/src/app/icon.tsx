import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Icono de la pestaña: el mismo dibujo del logotipo. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 64, height: 64, display: "flex", background: "#1d1b18", borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
        <svg width="44" height="44" viewBox="0 0 40 40">
          <path d="M11 13h18M20 13v15" stroke="#d9531e" strokeWidth="4.4" strokeLinecap="round" fill="none" />
          <circle cx="20" cy="30" r="2.6" fill="#fbf8f2" />
        </svg>
      </div>
    ),
    size,
  );
}
