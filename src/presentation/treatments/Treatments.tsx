"use client";

import { Plus, Search, Pill } from "lucide-react";
import { DeleteIconButton } from "@/presentation/common/DeleteIconButton";
import { FONASA_CODES, fonasaLabel } from "@/lib/fonasa";
import { Card, EmptyState, IconBox, Loading, Notice, PageHead, View, btnClass, zs } from "@/presentation/ui/zs";
import { useTreatmentsViewModel, formatPrice } from "./TreatmentsViewModel";

const FONASA_GROUPS = Array.from(new Set(FONASA_CODES.map((c) => c.group)));

export default function Treatments() {
  const { state, actions } = useTreatmentsViewModel();

  if (state.roleLoading) return <Loading label="Cargando servicios…" />;

  if (!state.hasAccess) {
    return (
      <View label="Servicios">
        <Notice tone="err">No tienes acceso a esta sección. Te estamos llevando a tu inicio…</Notice>
      </View>
    );
  }

  const withCode = state.filteredItems.filter((i) => i.fonasaCode).length;

  return (
    <View label="Servicios" wide>
      <PageHead
        tag="Configuración"
        title="Servicios"
        accent="y códigos Fonasa"
        lead="Lo que ofrece tu clínica, con su precio y su código de venta Fonasa."
        actions={
          <button type="button" onClick={actions.openCreateModal} className={btnClass("primary", "sm")}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            Nuevo servicio
          </button>
        }
      />

      <Card
        title={
          <>
            Catálogo <span className="text-[13px] font-normal text-slate-500">{state.totalLabel} · {withCode} con código Fonasa</span>
          </>
        }
        action={
          <label className="relative block">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" strokeWidth={1.8} />
            <input
              value={state.query}
              onChange={(e) => actions.setQuery(e.target.value)}
              placeholder="Buscar por nombre o código"
              className="h-11 w-64 rounded-full border border-slate-200 bg-white/60 pl-10 pr-4 text-sm outline-none transition focus:border-[#50c9d5] focus:ring-[3px] focus:ring-[#50c9d5]/20"
            />
          </label>
        }
      >
        {state.loading ? (
          <Loading label="Cargando servicios…" />
        ) : state.filteredItems.length === 0 ? (
          <EmptyState
            title={state.query.trim() ? "No encontramos servicios con esa búsqueda" : "Aún no tienes servicios"}
            action={
              state.query.trim() ? undefined : (
                <button type="button" onClick={actions.openCreateModal} className={btnClass("primary", "sm")}>
                  Agregar el primero
                </button>
              )
            }
          >
            {state.query.trim() ? "Prueba con otro nombre o con el código de 7 números." : "Agrega tus servicios con su precio y código Fonasa."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-3 py-3">Servicio</th>
                  <th className="px-3 py-3">Código Fonasa</th>
                  <th className="px-3 py-3">Precio</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {state.filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{ animationDelay: `${idx * 25}ms` }}
                    className="animate-card-in cursor-pointer border-b border-slate-200 transition-colors last:border-b-0 hover:bg-[#50c9d5]/[0.05]"
                    onClick={() => actions.openEditModal(item)}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <IconBox icon={Pill} size={36} />
                        <span className="font-display font-semibold text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {item.fonasaCode ? (
                        <span className="flex flex-col">
                          <b className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">{item.fonasaCode}</b>
                          <span className="max-w-[320px] truncate text-[12px] text-slate-500">{fonasaLabel(item.fonasaCode) ?? "Código propio"}</span>
                        </span>
                      ) : (
                        <span className="text-[13px] text-slate-400">Sin código</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums text-slate-900">{formatPrice(item.price)}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button className={btnClass("quiet", "sm")} onClick={() => actions.openEditModal(item)}>
                          Editar
                        </button>
                        <DeleteIconButton ariaLabel={`Eliminar ${item.name}`} onClick={() => actions.setDeleteTarget(item)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Crear / editar servicio */}
      {state.isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0d1b2a]/45 backdrop-blur-sm" onClick={actions.closeModal} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-modal-in">
            <h2 className="font-display text-2xl font-bold tracking-[-0.6px] text-slate-900">
              {state.selected ? "Editar servicio" : "Nuevo servicio"}
            </h2>
            <p className="mt-1 text-[14px] text-slate-500">Nombre, precio y, si corresponde, su código Fonasa.</p>

            <form onSubmit={actions.handleSubmit} className="mt-5 grid gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-900">Nombre</span>
                <input
                  value={state.form.name}
                  onChange={(e) => actions.handleFieldChange("name", e.target.value)}
                  placeholder="Ej: Sesión de kinesiología"
                  className={`${zs.input} ${state.errors.name ? "border-[#c23434]" : ""}`}
                />
                {state.errors.name && <span className="text-[12.5px] text-[#c23434]">{state.errors.name}</span>}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-900">Precio</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={state.form.price}
                    onChange={(e) => actions.handleFieldChange("price", e.target.value)}
                    placeholder="0"
                    className={`${zs.input} pl-8 ${state.errors.price ? "border-[#c23434]" : ""}`}
                  />
                </div>
                {state.errors.price && <span className="text-[12.5px] text-[#c23434]">{state.errors.price}</span>}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-900">Código Fonasa (opcional)</span>
                <select
                  value={FONASA_CODES.some((c) => c.code === state.form.fonasaCode) ? state.form.fonasaCode : state.form.fonasaCode ? "otro" : ""}
                  onChange={(e) => actions.handleFieldChange("fonasaCode", e.target.value === "otro" ? "" : e.target.value)}
                  className={zs.input}
                >
                  <option value="">Sin código Fonasa</option>
                  {FONASA_GROUPS.map((group) => (
                    <optgroup key={group} label={group}>
                      {FONASA_CODES.filter((c) => c.group === group).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} · {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="otro">Otro código…</option>
                </select>
                <input
                  value={state.form.fonasaCode}
                  onChange={(e) => actions.handleFieldChange("fonasaCode", e.target.value.replace(/\D/g, "").slice(0, 7))}
                  inputMode="numeric"
                  placeholder="O escribe el código de 7 números"
                  className={`${zs.input} font-mono tabular-nums ${state.errors.fonasaCode ? "border-[#c23434]" : ""}`}
                />
                {state.errors.fonasaCode ? (
                  <span className="text-[12.5px] text-[#c23434]">{state.errors.fonasaCode}</span>
                ) : (
                  <span className="text-[12.5px] text-slate-500">Elige de la lista o escribe otro código del arancel MLE.</span>
                )}
              </label>

              {state.apiError && <Notice tone="err">{state.apiError}</Notice>}

              <div className="mt-2 flex gap-3">
                <button type="button" onClick={actions.closeModal} className={btnClass("quiet", "md", "flex-1")}>
                  Cancelar
                </button>
                <button type="submit" disabled={state.isSubmitDisabled} className={btnClass("primary", "md", "flex-1")}>
                  {state.saving ? "Guardando…" : state.selected ? "Guardar cambios" : "Agregar servicio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {state.successMessage && (
        <div className="animate-fade-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {state.successMessage}
        </div>
      )}

      {/* Eliminar */}
      {state.deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0d1b2a]/45 backdrop-blur-sm" onClick={actions.dismissDeleteModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-modal-in">
            <h3 className="font-display text-xl font-bold text-slate-900">¿Eliminar este servicio?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Vas a eliminar <b className="text-slate-900">{state.deleteTarget.name}</b>. No se puede deshacer.
            </p>
            {state.deleteError && (
              <div className="mt-4">
                <Notice tone="err">{state.deleteError}</Notice>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={actions.dismissDeleteModal} className={btnClass("quiet", "sm")}>
                Cancelar
              </button>
              <button
                onClick={actions.handleDelete}
                className="inline-flex h-[38px] items-center justify-center rounded-full bg-[#c23434] px-4 font-display text-sm font-medium text-white transition hover:-translate-y-0.5"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </View>
  );
}
