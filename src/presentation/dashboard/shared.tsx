import { TrendingUp, type LucideIcon } from "lucide-react";
import { CountText } from "@/presentation/ui/motion";

export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistio",
};

export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-cyan-50 text-cyan-700",
  CONFIRMED: "bg-teal-50 text-teal-700",
  COMPLETED: "bg-[#e8f8f9] text-[#17656c]",
  CANCELLED: "bg-slate-100 text-slate-500",
  NO_SHOW: "bg-red-50 text-red-600",
};

export const PAYMENT_COLORS: Record<string, string> = {
  PAID: "text-[#17656c]",
  PENDING: "text-cyan-700",
  WAIVED: "text-slate-500",
};

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPaymentLabel(status: string) {
  if (status === "PAID") return "Pagado";
  if (status === "PENDING") return "Pendiente";
  return "Exento";
}

export function DeltaBadge({
  value,
  positiveClassName = "text-[#17656c]",
  negativeClassName = "text-red-500",
}: {
  value: string;
  positiveClassName?: string;
  negativeClassName?: string;
}) {
  const positive = value.startsWith("+");
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        positive ? positiveClassName : negativeClassName
      }`}
    >
      {positive ? <TrendingUp size={12} /> : null}
      {value}
    </span>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  iconColor,
  delay,
  highlighted = false,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  iconColor: string;
  delay: number;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`animate-card-in rounded-[var(--radius-card)] p-5 ${
        highlighted
          ? "border border-white/70 bg-gradient-to-br from-[#50c9d5] to-[#84d9e1] text-[#080b04] shadow-[0_14px_32px_-12px_rgba(80,201,213,.55)]"
          : "zs-glass zs-lift"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <p
          className={`text-xs font-medium uppercase tracking-wide ${
            highlighted ? "text-[#080b04]/75" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            highlighted ? "bg-white/35 text-[#080b04]" : iconColor
          }`}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className={`mt-3 text-2xl font-bold ${highlighted ? "text-[#080b04]" : "text-slate-900"}`}>
        <CountText text={String(value)} />
      </p>
      {delta ? (
        <div className="mt-1">
          <DeltaBadge
            value={delta}
            positiveClassName={highlighted ? "text-[#080b04]" : "text-[#17656c]"}
            negativeClassName={highlighted ? "text-[#7a1010]" : "text-[var(--err-text)]"}
          />
          <span className={`ml-1 text-[10px] ${highlighted ? "text-[#080b04]/70" : "text-slate-500"}`}>
            vs mes anterior
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function SkeletonCard() {
  return <div className="h-32 animate-pulse rounded-[var(--radius-card)] bg-white/50" />;
}

export function SkeletonBlock({ h = "h-64" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-[var(--radius-card)] bg-white/50`} />;
}
