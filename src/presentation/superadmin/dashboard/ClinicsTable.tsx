"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { DashClinicRow } from "@/server/super-admin/dashboardCalc";
import { Badge, EmptyState } from "../SuperAdminPrimitives";
import { actionMenu, type ActionKind } from "./ClinicActions";
import { STATUS_LABEL, clp, dateLabel, num, statusTone } from "./format";
import { RowMenu } from "./ui";

type SortKey = "name" | "plan" | "status" | "price" | "patients" | "appointments" | "users" | "date";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Sede" },
  { key: "plan", label: "Plan" },
  { key: "status", label: "Estado" },
  { key: "price", label: "Precio mensual", align: "right" },
  { key: "patients", label: "Pacientes", align: "right" },
  { key: "appointments", label: "Citas del mes", align: "right" },
  { key: "users", label: "Usuarios", align: "right" },
  { key: "date", label: "Prueba / alta" },
];

const STATUS_ORDER = { ACTIVE: 0, PAST_DUE: 1, TRIAL: 2, CANCELED: 3 } as const;

function sortValue(r: DashClinicRow, key: SortKey): string | number {
  switch (key) {
    case "name":
      return r.name.toLowerCase();
    case "plan":
      return r.plan.toLowerCase();
    case "status":
      return STATUS_ORDER[r.billingStatus] * 2 + (r.isActive ? 0 : 1);
    case "price":
      return r.monthlyPrice;
    case "patients":
      return r.patients;
    case "appointments":
      return r.appointmentsMonth;
    case "users":
      return r.activeUsers;
    case "date":
      return new Date(r.billingStatus === "TRIAL" ? r.trialEndsAt ?? 0 : r.subscriptionStartedAt ?? 0).getTime();
  }
}

export default function ClinicsTable({
  rows,
  selectedId,
  onOpen,
  onPick,
}: {
  rows: DashClinicRow[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  onPick: (row: DashClinicRow, kind: ActionKind) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es");
      return (sort.dir === "asc" ? cmp : -cmp) || a.name.localeCompare(b.name, "es");
    });
    return list;
  }, [rows, sort]);

  if (rows.length === 0) {
    return (
      <div className="p-5">
        <EmptyState title="Ninguna sede coincide con los filtros">Cambia o limpia los filtros para ver mas sedes.</EmptyState>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {COLUMNS.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={`px-4 py-3 font-semibold ${c.align === "right" ? "text-right" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "asc" ? "desc" : "asc" }))}
                    className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900 ${active ? "text-slate-900" : ""}`}
                  >
                    {c.label}
                    {active ? sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                  </button>
                </th>
              );
            })}
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((r) => (
            <tr
              key={r.id}
              onClick={() => onOpen(r.id)}
              className={`cursor-pointer transition hover:bg-slate-50 ${selectedId === r.id ? "bg-cyan-50/60" : ""}`}
            >
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="text-left font-semibold text-slate-900 hover:text-[#0e88ab]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(r.id);
                  }}
                >
                  {r.name}
                </button>
                <p className="text-xs text-slate-500">{r.city}</p>
              </td>
              <td className="px-4 py-3 text-slate-700">{r.plan}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <Badge tone={statusTone(r.billingStatus)}>{STATUS_LABEL[r.billingStatus]}</Badge>
                  {!r.isActive && <Badge tone="rose">Sin acceso</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{r.paying ? clp(r.monthlyPrice) : r.monthlyPrice > 0 ? <span className="text-slate-400">{clp(r.monthlyPrice)}</span> : "-"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{num(r.patients)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{num(r.appointmentsMonth)}</td>
              <td className="px-4 py-3 text-right tabular-nums" title="Activos / entraron en los ultimos 30 dias">
                {r.activeUsers} <span className="text-xs text-slate-400">({r.activeUsers30d} en 30 d)</span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {r.billingStatus === "TRIAL" ? (
                  <span className={r.trialDaysLeft !== null && r.trialDaysLeft <= 7 ? "font-semibold text-amber-700" : ""}>
                    {r.trialDaysLeft === null ? "-" : r.trialDaysLeft < 0 ? `Vencio hace ${-r.trialDaysLeft} d` : `Vence en ${r.trialDaysLeft} d`}
                  </span>
                ) : (
                  dateLabel(r.subscriptionStartedAt)
                )}
              </td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <RowMenu
                  label={`Acciones de ${r.name}`}
                  items={[
                    { label: "Ver detalle", onClick: () => onOpen(r.id) },
                    ...actionMenu(r, (kind) => onPick(r, kind)),
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
