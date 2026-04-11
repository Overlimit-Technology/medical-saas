import { TrendingUp, type LucideIcon } from "lucide-react";

export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  NO_SHOW: "bg-rose-100 text-rose-700",
};

export const PAYMENT_COLORS: Record<string, string> = {
  PAID: "text-emerald-600",
  PENDING: "text-amber-600",
  WAIVED: "text-slate-400",
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

export function DeltaBadge({ value }: { value: string }) {
  const positive = value.startsWith("+");
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        positive ? "text-emerald-600" : "text-rose-500"
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
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  iconColor: string;
  delay: number;
}) {
  return (
    <div
      className="animate-card-in rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor}`}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      {delta && (
        <div className="mt-1">
          <DeltaBadge value={delta} />
          <span className="ml-1 text-[10px] text-slate-400">
            vs mes anterior
          </span>
        </div>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />;
}

export function SkeletonBlock({ h = "h-64" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-2xl bg-slate-100`} />;
}
