/**
 * Componentes compartidos de la app del equipo con el sistema visual del portal del paciente
 * (src/presentation/portal/portal.css): Syne + Lexend, turquesa #50c9d5, tarjetas de 24px,
 * botones pildora y estados con punto. Las pantallas nuevas o rediseñadas usan esto en vez de
 * escribir clases sueltas.
 */
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import ZensyaLogo from "@/presentation/portal/ZensyaLogo";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

// ---------------------------------------------------------------------------
// Clases (para cuando un componente existente solo necesita el estilo)
// ---------------------------------------------------------------------------

export const zs = {
  card: "relative min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-sm:p-[18px] max-sm:rounded-[20px]",
  label: "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500",
  small: "text-[13px] leading-normal text-slate-500",
  text: "text-[14.5px] leading-relaxed text-slate-600",
  input:
    "min-h-12 w-full rounded-xl border border-slate-200 bg-white/60 px-4 py-[11px] text-[15px] text-slate-900 outline-none transition placeholder:text-slate-500/65 focus:border-[#50c9d5] focus:ring-[3px] focus:ring-[#50c9d5]/20",
  link: "inline-flex items-center gap-1.5 font-display text-sm font-semibold text-[#1e737b] [&>svg]:transition-transform hover:[&>svg]:translate-x-1",
  btn: {
    base: "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border font-display font-medium transition-[transform,box-shadow,background-color,color,border-color] duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)] disabled:pointer-events-none disabled:opacity-45",
    md: "h-12 px-[22px] text-[15px]",
    sm: "h-[38px] px-4 text-sm",
    primary:
      "border-[#50c9d5] bg-[#50c9d5] text-[#080b04] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(80,201,213,.32)]",
    quiet: "border-slate-200 bg-white text-slate-900 hover:border-[#50c9d5]",
    ghost: "border-[#50c9d5] bg-transparent text-[#1e737b] hover:bg-[#50c9d5] hover:text-[#080b04]",
    danger: "border-slate-200 bg-transparent text-[#c23434] hover:border-[#c23434]",
  },
};

export type BtnVariant = "primary" | "quiet" | "ghost" | "danger";

export function btnClass(variant: BtnVariant = "primary", size: "md" | "sm" = "md", extra?: string) {
  return cx(zs.btn.base, zs.btn[size], zs.btn[variant], extra);
}

// ---------------------------------------------------------------------------
// Encabezado de pagina: tag, titulo Syne con palabra destacada y bajada
// ---------------------------------------------------------------------------

export function PageHead({
  tag,
  title,
  accent,
  lead,
  actions,
  back,
}: {
  tag?: ReactNode;
  title: ReactNode;
  /** Palabra o frase final del titulo en turquesa. */
  accent?: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex min-w-0 items-start gap-3">
        {back}
        <div className="flex min-w-0 flex-col gap-3">
          {tag ? <Tag>{tag}</Tag> : null}
          <h1 className="font-display text-[40px] font-bold leading-[1.12] tracking-[-1.5px] text-slate-900 max-sm:text-[30px] max-sm:tracking-[-1px]">
            {title}
            {accent ? <> <span className="text-[#50c9d5]">{accent}</span></> : null}
          </h1>
          {lead ? (
            <p className="max-w-[640px] font-display text-[17px] font-medium leading-relaxed text-slate-600 max-sm:text-[15.5px]">
              {lead}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function Tag({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <span className="inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full bg-[#50c9d5]/10 bg-gradient-to-r from-[#50c9d5]/30 to-[#50c9d5]/[0.08] px-3.5 py-1.5 font-display text-sm text-[#1e737b]">
      {Icon ? <Icon className="h-[15px] w-[15px]" strokeWidth={1.8} /> : null}
      {children}
    </span>
  );
}

/** Vista con entrada en cascada, igual que .view del portal. */
export function View({ children, label, wide }: { children: ReactNode; label?: string; wide?: boolean }) {
  return (
    <section
      aria-label={label}
      className={cx(
        "mx-auto flex w-full flex-col gap-6 max-sm:gap-[18px] [&>*]:animate-card-in",
        wide ? "max-w-none" : "max-w-[1400px]"
      )}
    >
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta
// ---------------------------------------------------------------------------

export function Card({
  children,
  className,
  title,
  action,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
  as?: "div" | "section" | "article";
}) {
  return (
    <As className={cx(zs.card, className)}>
      {title || action ? (
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
          {title ? (
            <h2 className="flex items-center gap-2.5 font-display text-xl font-bold leading-snug tracking-[-0.3px] text-slate-900">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </As>
  );
}

export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={zs.link}>
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Estado con punto
// ---------------------------------------------------------------------------

export type Tone = "ok" | "warn" | "off" | "err" | "info";

const TONE: Record<Tone, string> = {
  ok: "bg-[#50c9d5]/[0.08] text-[#1e737b]",
  warn: "bg-[#e8a020]/[0.14] text-[#8a5a0b]",
  off: "bg-slate-100 text-slate-500",
  err: "bg-[#e5484d]/10 text-[#c23434]",
  info: "bg-[#3b82f6]/10 text-[#1d4ed8]",
};

export function StatusPill({ tone = "ok", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[30px] px-2.5 py-1 text-[12.5px] font-medium leading-tight before:h-1.5 before:w-1.5 before:rounded-full before:bg-current",
        TONE[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Count({ children }: { children: ReactNode }) {
  return (
    <span className="ml-auto inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-xl bg-[#e8a020]/[0.14] px-[7px] text-xs font-semibold text-[#8a5a0b]">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Icono en cuadro
// ---------------------------------------------------------------------------

export function IconBox({ icon: Icon, tone = "accent", size = 40 }: { icon: LucideIcon; tone?: "accent" | "warn" | "err"; size?: number }) {
  const tones = {
    accent: "border-[#50c9d5]/30 bg-gradient-to-br from-[#50c9d5]/20 to-[#50c9d5]/[0.06] text-[#1e737b]",
    warn: "border-[#e8a020]/35 bg-[#e8a020]/[0.14] text-[#8a5a0b]",
    err: "border-[#e5484d]/30 bg-[#e5484d]/10 text-[#c23434]",
  };
  return (
    <span
      className={cx("grid shrink-0 place-items-center rounded-xl border", tones[tone])}
      style={{ width: size, height: size }}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Control segmentado (pestañas)
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: Array<{ id: T; label: ReactNode; icon?: LucideIcon; count?: number }>;
  value: T;
  onChange: (id: T) => void;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full gap-1 self-start overflow-x-auto rounded-full border border-slate-200 bg-white/60 p-[5px]"
    >
      {items.map(({ id, label: itemLabel, icon: Icon, count }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cx(
              "inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-[18px] text-sm font-medium transition-colors",
              active ? "bg-[#50c9d5] text-[#080b04]" : "text-slate-500 hover:text-slate-900"
            )}
          >
            {Icon ? <Icon className="h-4 w-4" strokeWidth={1.8} /> : null}
            {itemLabel}
            {count !== undefined ? (
              <span className={cx("rounded-full px-[7px] py-px text-[11px] font-semibold", active ? "bg-[#0d1b2a]/10" : "bg-slate-100")}>
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estados vacio, carga y error
// ---------------------------------------------------------------------------

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-9 text-center">
      <ZensyaLogo size={44} className="h-auto" />
      <b className="font-display text-[17px] font-bold text-slate-900">{title}</b>
      {children ? <p className={zs.small}>{children}</p> : null}
      {action}
    </div>
  );
}

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#50c9d5]/20 border-t-[#50c9d5]" />
      {label}
    </div>
  );
}

export function Notice({ children, tone = "info", icon: Icon }: { children: ReactNode; tone?: "info" | "err"; icon?: LucideIcon }) {
  return (
    <div
      className={cx(
        "flex items-start gap-3 rounded-[18px] border px-4 py-3.5 text-[13.5px] leading-relaxed",
        tone === "err"
          ? "border-[#e5484d]/30 bg-[#e5484d]/10 text-[#c23434]"
          : "border-[#50c9d5]/30 bg-[#50c9d5]/[0.08] text-slate-900"
      )}
      role={tone === "err" ? "alert" : undefined}
    >
      {Icon ? <Icon className={cx("mt-px h-[18px] w-[18px] shrink-0", tone === "err" ? "" : "text-[#1e737b]")} strokeWidth={1.8} /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cifra (KPI)
// ---------------------------------------------------------------------------

export function Stat({
  label,
  value,
  hint,
  icon,
  highlight,
  href,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  highlight?: boolean;
  href?: string;
}) {
  const Icon = icon;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cx(zs.label, highlight && "text-[#080b04]/70")}>{label}</span>
        {Icon ? (
          highlight ? (
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/25 text-[#080b04]">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
          ) : (
            <IconBox icon={Icon} />
          )
        ) : null}
      </div>
      <b className="mt-1 block font-display text-[32px] font-bold leading-none tracking-[-1px] tabular-nums">{value}</b>
      {hint ? <span className={cx("mt-2 block text-[13px]", highlight ? "text-[#080b04]/70" : "text-slate-500")}>{hint}</span> : null}
    </>
  );
  const className = cx(
    "block min-w-0 rounded-2xl border p-5 transition-[transform,box-shadow] duration-300",
    highlight
      ? "border-[#50c9d5] bg-gradient-to-br from-[#50c9d5] to-[#84d9e1] text-[#080b04] shadow-[0_14px_32px_rgba(80,201,213,.28)]"
      : "border-slate-200 bg-white text-slate-900 shadow-sm",
    href && "hover:-translate-y-0.5 hover:shadow-md"
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
