"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Search } from "lucide-react";
import { EmptyState, IconBox, zs } from "./zs";

export type Option = {
  id: string;
  group: string;
  title: string;
  /** Una frase corta: que se hace ahi. */
  description: string;
  href: string;
  icon: LucideIcon;
  /** Palabras extra para el buscador (sinonimos). */
  keywords?: string;
  /** Dato corto a la derecha, por ejemplo "4 boxes". */
  meta?: string;
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Lista de opciones agrupadas con buscador. Reemplaza las grillas de tarjetas grandes de
 * Configuracion y Mi clinica: menos texto, todo a un clic y se encuentra escribiendo.
 */
export default function OptionFinder({ options, placeholder = "Buscar una opción…" }: { options: Option[]; placeholder?: string }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const hits = q
      ? options.filter((o) => normalize(`${o.title} ${o.description} ${o.keywords ?? ""} ${o.group}`).includes(q))
      : options;
    const order: string[] = [];
    const byGroup = new Map<string, Option[]>();
    for (const o of hits) {
      if (!byGroup.has(o.group)) {
        byGroup.set(o.group, []);
        order.push(o.group);
      }
      byGroup.get(o.group)!.push(o);
    }
    return order.map((g) => ({ group: g, items: byGroup.get(g)! }));
  }, [options, query]);

  return (
    <div className="flex flex-col gap-6">
      <label className="relative block max-w-xl">
        <span className="sr-only">Buscar</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" strokeWidth={1.8} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={`${zs.input} rounded-full bg-white pl-11`}
          autoComplete="off"
        />
      </label>

      {groups.length ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {groups.map(({ group, items }) => (
            <section key={group} className={zs.card} aria-label={group}>
              <h2 className={`${zs.label} mb-2`}>{group}</h2>
              <ul className="flex flex-col">
                {items.map((o) => (
                  <li key={o.id} className="border-t border-slate-200 first:border-t-0">
                    <Link
                      href={o.href}
                      className="group -mx-3 flex items-center gap-3.5 rounded-2xl px-3 py-3 transition-colors hover:bg-[#50c9d5]/[0.06]"
                    >
                      <IconBox icon={o.icon} />
                      <span className="min-w-0 flex-1">
                        <b className="block font-display text-[15px] font-semibold text-slate-900">{o.title}</b>
                        <span className="block truncate text-[13px] text-slate-500">{o.description}</span>
                      </span>
                      {o.meta ? <span className="shrink-0 text-[13px] tabular-nums text-slate-500">{o.meta}</span> : null}
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-[#1e737b]"
                        strokeWidth={1.8}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className={zs.card}>
          <EmptyState title={`No encontramos "${query}"`}>Prueba con otra palabra, por ejemplo boxes, correo o vacaciones.</EmptyState>
        </div>
      )}
    </div>
  );
}
