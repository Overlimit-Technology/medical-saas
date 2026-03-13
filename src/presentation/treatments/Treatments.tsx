"use client";

import { DeleteIconButton } from "@/presentation/common/DeleteIconButton";
import { useTreatmentsViewModel, formatPrice } from "./TreatmentsViewModel";

export default function Treatments() {
  const { state, actions } = useTreatmentsViewModel();

  if (state.roleLoading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Cargando permisos...
      </div>
    );
  }

  if (!state.hasAccess) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
        No tienes acceso a esta seccion. Redirigiendo...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.8fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Catalogo general</p>
            <h1 className="text-xl font-semibold text-slate-900">Tratamientos</h1>
            <p className="text-xs text-slate-400">Selecciona un registro por id para editar sus datos.</p>
          </div>
          <input value={state.query} onChange={(e) => actions.setQuery(e.target.value)} placeholder="Buscar por id o nombre" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-slate-400" />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {state.loading && (
                <tr><td className="px-4 py-6 text-slate-400" colSpan={4}>Cargando tratamientos...</td></tr>
              )}
              {!state.loading && state.filteredItems.length === 0 && (
                <tr><td className="px-4 py-6 text-slate-400" colSpan={4}>No hay tratamientos registrados.</td></tr>
              )}
              {state.filteredItems.map((item) => {
                const isSelected = state.selectedTreatment?.id === item.id;
                return (
                  <tr key={item.id} className={`border-t border-slate-100 transition ${isSelected ? "bg-slate-50" : "hover:bg-slate-50"}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500">{formatPrice(item.price)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" disabled={Boolean(state.deletingId)} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => actions.setSelectedId(item.id)}>Editar</button>
                        <DeleteIconButton ariaLabel={`Eliminar ${item.name}`} disabled={Boolean(state.deletingId)} onClick={() => actions.handleDelete(item)} className={state.deletingId === item.id ? "animate-pulse" : ""} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Formulario</p>
            <h2 className="text-lg font-semibold">{state.selectedTreatment ? "Editar tratamiento" : "Nuevo tratamiento"}</h2>
          </div>
          {state.selectedTreatment && (
            <button type="button" onClick={() => actions.setSelectedId(null)} className="text-xs text-slate-500 hover:text-slate-900">Cancelar</button>
          )}
        </div>

        <form onSubmit={actions.handleSubmit} className="mt-6 grid gap-3">
          <div>
            <input value={state.form.id} onChange={(e) => actions.handleFieldChange("id", e.target.value)} placeholder="Id (ej:  hipertensión )" disabled={Boolean(state.selectedTreatment)} className={`w-full rounded-xl border px-3 py-2 text-sm ${state.errors.id ? "border-rose-300" : "border-slate-200"} ${state.selectedTreatment ? "bg-slate-100 text-slate-500" : ""}`} />
            {state.errors.id && <p className="mt-1 text-xs text-rose-500">{state.errors.id}</p>}
          </div>
          <div>
            <input value={state.form.name} onChange={(e) => actions.handleFieldChange("name", e.target.value)} placeholder="Nombre" className={`w-full rounded-xl border px-3 py-2 text-sm ${state.errors.name ? "border-rose-300" : "border-slate-200"}`} />
            {state.errors.name && <p className="mt-1 text-xs text-rose-500">{state.errors.name}</p>}
          </div>
          <div>
            <input type="number" min={0} step="0.01" value={state.form.price} onChange={(e) => actions.handleFieldChange("price", e.target.value)} placeholder="Precio" className={`w-full rounded-xl border px-3 py-2 text-sm ${state.errors.price ? "border-rose-300" : "border-slate-200"}`} />
            {state.errors.price && <p className="mt-1 text-xs text-rose-500">{state.errors.price}</p>}
          </div>
          {state.apiError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.apiError}</div>
          )}
          <button type="submit" disabled={state.saving || Boolean(state.deletingId)} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-400">
            {state.saving ? "Guardando..." : state.selectedTreatment ? "Guardar cambios" : "Crear tratamiento"}
          </button>
        </form>
      </div>

      {state.successMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {state.successMessage}
        </div>
      )}
    </div>
  );
}
