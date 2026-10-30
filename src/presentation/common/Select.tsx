"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { usePortalTarget, usePresence } from "./dialogs/usePortalTarget";

export type SelectOption = {
  value: string;
  label: string;
  /** Texto secundario a la derecha (p. ej. rol o conteo). */
  hint?: string;
  disabled?: boolean;
};

export type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Busqueda dentro de la lista. Por defecto se activa con mas de 8 opciones. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Opcion fija al final (p. ej. "Otra..."); se informa con onChange(value). */
  otherOption?: { value: string; label: string };
  id?: string;
  name?: string;
  ariaLabel?: string;
  /** Clases extra para el boton (se agregan al estilo base). */
  className?: string;
  /** Clases del contenedor. */
  wrapperClassName?: string;
  /** Tamano compacto para filtros. */
  size?: "md" | "sm";
};

const AUTO_SEARCH_THRESHOLD = 8;

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  disabled,
  searchable,
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados",
  otherOption,
  id,
  name,
  ariaLabel,
  className = "",
  wrapperClassName = "",
  size = "md",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const autoId = useId();
  const listId = `${autoId}-list`;
  const target = usePortalTarget();
  const { mounted, visible } = usePresence(open, 140);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number; origin: string } | null>(null);

  const showSearch = searchable ?? options.length > AUTO_SEARCH_THRESHOLD;
  const all = useMemo(() => (otherOption ? [...options, { value: otherOption.value, label: otherOption.label }] : options), [options, otherOption]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((o) => (otherOption && o.value === otherOption.value) || o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q));
  }, [all, query, otherOption]);
  const selected = all.find((o) => o.value === value);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const choose = useCallback(
    (option: SelectOption) => {
      if (option.disabled) return;
      onChange(option.value);
      close();
    },
    [onChange, close],
  );

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;
    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const M = 8;
    const GAP = 4;
    const width = Math.min(Math.max(r.width, 180), vw - 2 * M);
    const left = Math.max(M, Math.min(r.left, vw - width - M));
    const h = pop.scrollHeight;
    const below = vh - r.bottom - GAP - M;
    const above = r.top - GAP - M;
    const down = h <= below || below >= above;
    const maxHeight = Math.max(140, Math.min(320, down ? below : above));
    const real = Math.min(h, maxHeight);
    setPos({
      top: down ? r.bottom + GAP : Math.max(M, r.top - GAP - real),
      left,
      width,
      maxHeight,
      origin: `${Math.max(0, Math.min(r.left + r.width / 2 - left, width))}px ${down ? "top" : "bottom"}`,
    });
  }, []);

  useLayoutEffect(() => {
    if (!mounted) {
      setPos(null);
      return;
    }
    place();
  }, [mounted, place, filtered.length]);

  useEffect(() => {
    if (!mounted) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [mounted, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent | TouchEvent) => {
      const node = event.target as Node;
      if (popRef.current?.contains(node) || triggerRef.current?.contains(node)) return;
      close(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, close]);

  // Al abrir: marca la opcion seleccionada y enfoca la busqueda o la lista.
  const placed = pos !== null;
  useEffect(() => {
    if (!open || !placed) return;
    const index = Math.max(0, filtered.findIndex((o) => o.value === value));
    setActive(index);
    (showSearch ? searchRef.current : listRef.current)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, placed]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, placed]);

  const move = (delta: number) => {
    if (filtered.length === 0) return;
    let next = active;
    for (let i = 0; i < filtered.length; i += 1) {
      next = (next + delta + filtered.length) % filtered.length;
      if (!filtered[next].disabled) break;
    }
    setActive(next);
  };

  const onPopKey = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        return;
      case "Home":
        if (!showSearch) {
          event.preventDefault();
          setActive(0);
        }
        return;
      case "End":
        if (!showSearch) {
          event.preventDefault();
          setActive(Math.max(0, filtered.length - 1));
        }
        return;
      case "Enter":
        event.preventDefault();
        if (filtered[active]) choose(filtered[active]);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case "Tab":
        close(false);
        return;
      default:
        if (!showSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          const now = Date.now();
          const t = typeahead.current;
          t.text = now - t.at > 700 ? event.key.toLowerCase() : t.text + event.key.toLowerCase();
          t.at = now;
          const idx = filtered.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(t.text));
          if (idx >= 0) setActive(idx);
        }
    }
  };

  const onTriggerKey = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const pad = size === "sm" ? "h-9 px-2.5 text-xs" : "min-h-[42px] px-3 py-2.5 text-sm";
  const activeId = filtered[active] ? `${autoId}-opt-${active}` : undefined;

  return (
    <div className={`relative ${wrapperClassName}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onTriggerKey}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50/40 text-left transition-colors focus:outline-none focus-visible:border-[#19b3bc] focus-visible:ring-2 focus-visible:ring-[#19b3bc]/15 disabled:cursor-not-allowed disabled:opacity-60 ${pad} ${open ? "border-[#19b3bc] bg-white ring-2 ring-[#19b3bc]/15" : "border-slate-200 hover:border-slate-300"} ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? "text-slate-700" : "text-slate-400"}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#19b3bc] transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} strokeWidth={2.2} />
      </button>

      {target && mounted
        ? createPortal(
            <div
              ref={popRef}
              onKeyDown={onPopKey}
              style={{
                position: "fixed",
                top: pos?.top ?? 0,
                left: pos?.left ?? 0,
                width: pos?.width ?? 220,
                maxHeight: pos?.maxHeight,
                transformOrigin: pos?.origin,
                visibility: pos ? "visible" : "hidden",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              }}
              className={`z-[10050] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-xl transition duration-150 ease-out motion-reduce:transition-none ${visible && pos ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
            >
              {showSearch && (
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActive(0);
                    }}
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-activedescendant={activeId}
                    aria-autocomplete="list"
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              )}
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                tabIndex={-1}
                aria-label={ariaLabel}
                aria-activedescendant={showSearch ? undefined : activeId}
                className="min-h-0 flex-1 overflow-y-auto p-1 outline-none"
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-center text-sm text-slate-400">{emptyText}</li>
                ) : (
                  filtered.map((option, index) => {
                    const isSelected = option.value === value;
                    const isOther = !!otherOption && option.value === otherOption.value;
                    return (
                      <li
                        key={option.value || `__empty_${index}`}
                        id={`${autoId}-opt-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        onMouseEnter={() => setActive(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => choose(option)}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ${isOther ? "mt-0.5 border-t border-slate-100 pt-2.5" : ""} ${option.disabled ? "cursor-not-allowed opacity-50" : ""} ${isSelected ? "bg-[#19b3bc]/10 font-medium text-[#0f8f98]" : "text-slate-700"} ${active === index && !isSelected ? "bg-slate-50" : ""}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        {option.hint ? <span className="shrink-0 text-xs text-slate-400">{option.hint}</span> : null}
                        {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#19b3bc]" strokeWidth={2.6} /> : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            target,
          )
        : null}
    </div>
  );
}
