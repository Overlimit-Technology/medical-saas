"use client";

import { DeleteIconButton } from "@/presentation/common/DeleteIconButton";
import {
  useFormTemplatesViewModel,
  FIELD_TYPE_LABELS,
  type FieldType,
} from "./FormTemplatesViewModel";

export default function FormTemplates() {
  const { state, actions } = useFormTemplatesViewModel();

  if (state.roleLoading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-slate-100" />
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!state.hasAccess) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
          No tienes acceso a esta sección. Redirigiendo...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Plantillas de ficha clínica</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-slate-400">{state.totalLabel}</span>
              {state.headerHint && (
                <span className="text-xs text-slate-400">&middot; {state.headerHint}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                value={state.query}
                onChange={(e) => actions.setQuery(e.target.value)}
                placeholder="Buscar"
                className="w-48 rounded-full border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:w-64 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={actions.openCreateModal}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Nueva plantilla"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>

        {/* Table */}
        <div className="mt-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Campos</th>
                <th className="px-4 py-3 font-medium">Fichas</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {state.loading && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                    Cargando plantillas...
                  </td>
                </tr>
              )}
              {!state.loading && state.filteredItems.length === 0 && !state.query.trim() && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                    No hay plantillas registradas.
                  </td>
                </tr>
              )}
              {!state.loading && state.filteredItems.length === 0 && state.query.trim() && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                    No se encontraron plantillas con ese criterio.
                  </td>
                </tr>
              )}
              {state.filteredItems.map((item, idx) => {
                const initial = item.name.charAt(0).toUpperCase();
                return (
                  <tr
                    key={item.id}
                    style={{ animationDelay: `${idx * 25}ms` }}
                    className="animate-card-in group cursor-pointer border-b border-slate-50 transition-colors last:border-b-0 hover:bg-slate-50/70"
                    onClick={() => actions.openEditModal(item)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-500">
                          {initial}
                        </div>
                        <div>
                          <span className="font-medium text-slate-800">{item.name}</span>
                          {item.description && (
                            <p className="text-xs text-slate-400">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.fields.length}</td>
                    <td className="px-4 py-3 text-slate-600">{item._count.clinicalRecords}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                          onClick={() => actions.openEditModal(item)}
                        >
                          Editar
                        </button>
                        <DeleteIconButton
                          ariaLabel={`Eliminar ${item.name}`}
                          onClick={() => actions.setDeleteTarget(item)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {state.isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={actions.closeModal} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              {state.selected ? "Editar plantilla" : "Nueva plantilla"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {state.selected
                ? state.hasRecords
                  ? "Esta plantilla tiene fichas asociadas. Solo puedes editar nombre y descripción."
                  : "Modifica la plantilla y sus campos."
                : "Crea una nueva plantilla de ficha clínica con sus campos."}
            </p>

            <form onSubmit={actions.handleSubmit} className="mt-5 grid gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Nombre</label>
                <input
                  value={state.form.name}
                  onChange={(e) => actions.handleFieldChange("name", e.target.value)}
                  placeholder="Ej: Ficha General"
                  className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.name ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`}
                />
                {state.errors.name && <p className="mt-1 text-[11px] text-rose-500">{state.errors.name}</p>}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Descripción</label>
                <input
                  value={state.form.description}
                  onChange={(e) => actions.handleFieldChange("description", e.target.value)}
                  placeholder="Descripción opcional"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </div>

              {/* Fields builder */}
              {(!state.selected || !state.hasRecords) && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Campos</label>
                    <button
                      type="button"
                      onClick={actions.addField}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                    >
                      + Agregar campo
                    </button>
                  </div>
                  {state.errors.fields && <p className="mb-2 text-[11px] text-rose-500">{state.errors.fields}</p>}

                  <div className="space-y-2">
                    {state.form.fields.map((field, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                          <input
                            value={field.label}
                            onChange={(e) => actions.updateField(idx, { label: e.target.value })}
                            placeholder="Nombre del campo"
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                          <select
                            value={field.fieldType}
                            onChange={(e) => actions.updateField(idx, { fieldType: e.target.value as FieldType })}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                          >
                            {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([val, lbl]) => (
                              <option key={val} value={val}>{lbl}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.isRequired}
                              onChange={(e) => actions.updateField(idx, { isRequired: e.target.checked })}
                              className="rounded"
                            />
                            Req.
                          </label>
                          <div className="flex items-center gap-0.5">
                            <button type="button" onClick={() => actions.moveField(idx, "up")} disabled={idx === 0} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                            </button>
                            <button type="button" onClick={() => actions.moveField(idx, "down")} disabled={idx === state.form.fields.length - 1} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                            {state.form.fields.length > 1 && (
                              <button type="button" onClick={() => actions.removeField(idx)} className="rounded p-1 text-rose-400 hover:text-rose-600">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              </button>
                            )}
                          </div>
                        </div>
                        {field.fieldType === "SELECT" && (
                          <div className="mt-2">
                            <input
                              value={field.options ?? ""}
                              onChange={(e) => actions.updateField(idx, { options: e.target.value })}
                              placeholder="Opciones separadas por coma (ej: Leve, Moderado, Severo)"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state.apiError && (
                <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                  {state.apiError}
                </div>
              )}

              <div className="mt-2 flex gap-3">
                <button type="button" onClick={actions.closeModal} className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800">
                  Cancelar
                </button>
                <button type="submit" disabled={state.isSubmitDisabled} className="flex-1 rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none">
                  {state.saving ? "Guardando..." : state.selected ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {state.successMessage && (
        <div className="animate-fade-in fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {state.successMessage}
        </div>
      )}

      {/* Delete Modal */}
      {state.deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={actions.dismissDeleteModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar plantilla</h3>
            <p className="mt-2 text-sm text-slate-500">
              ¿Estás seguro de eliminar la plantilla <span className="font-medium text-slate-700">{state.deleteTarget.name}</span>?
              {state.deleteTarget._count.clinicalRecords > 0
                ? " Se desactivará porque tiene fichas asociadas."
                : " Esta acción no se puede deshacer."}
            </p>
            {state.deleteError && (
              <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                {state.deleteError}
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={actions.dismissDeleteModal} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800">
                Cancelar
              </button>
              <button onClick={actions.handleDelete} className="rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20">
                {state.deleteTarget._count.clinicalRecords > 0 ? "Desactivar" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
