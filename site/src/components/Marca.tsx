/** Logotipo: una llave de taller dibujada que forma una "T", con el nombre y la firma. */
export function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="9" fill={claro ? "var(--hoja)" : "var(--tinta)"} />
        <path d="M11 13h18M20 13v15" stroke="var(--naranja)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="20" cy="30" r="2.4" fill={claro ? "var(--tinta)" : "var(--hoja)"} />
      </svg>
      <span className="leading-none">
        <span className={`font-titulo block text-[1.15rem] font-bold ${claro ? "text-hoja" : "text-tinta"}`}>Taller Digital</span>
        <span className={`etiqueta mt-1 block text-[0.62rem] ${claro ? "text-papel-3" : "text-tinta-3"}`}>by Omar</span>
      </span>
    </span>
  );
}
