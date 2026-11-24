"use client";
import { useEffect, useRef, useState, type ReactNode, type ElementType } from "react";

/**
 * Entrada al hacer scroll (receta "Scroll reveal" del skill animate): solo en superficies de
 * marketing, una sola vez, sube 16 px con opacidad. Con movimiento reducido solo aparece.
 */
export function Revelar({ children, como: Como = "div", retraso = 0, className = "" }: { children: ReactNode; como?: ElementType; retraso?: number; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "0px 0px -80px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Como ref={ref} data-visible={visible || undefined} className={`revelar ${className}`} style={{ transitionDelay: `${retraso}ms` }}>
      {children}
    </Como>
  );
}
