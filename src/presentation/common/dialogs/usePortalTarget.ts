"use client";

import { useEffect, useState } from "react";

/**
 * Contenedor donde montar portales. Normalmente document.body, pero si hay un elemento en
 * pantalla completa solo se pinta su subarbol, asi que el portal debe ir dentro de el.
 */
export function usePortalTarget(): HTMLElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const resolve = () => setTarget((document.fullscreenElement as HTMLElement | null) ?? document.body);
    resolve();
    document.addEventListener("fullscreenchange", resolve);
    return () => document.removeEventListener("fullscreenchange", resolve);
  }, []);
  return target;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Monta/desmonta con tiempo para animar la salida. `visible` pasa a true un frame despues de montar. */
export function usePresence(open: boolean, exitMs = 180) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);
  return { mounted, visible };
}
