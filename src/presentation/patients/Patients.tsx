"use client";

import { useRouter } from "next/navigation";
import { DeleteIconButton } from "@/presentation/common/DeleteIconButton";
import { usePatientsViewModel, formatRelativeDate } from "./PatientsViewModel";

export default function Patients() {
  const router = useRouter();
  const { state, actions } = usePatientsViewModel();

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Panel principal ── */}
      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        {/* Encabezado */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Lista de Pacientes</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-slate-400">{state.totalLabel}</span>
              {state.headerHint && (
                <span className="text-xs text-slate-400">&middot; {state.headerHint}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Buscador */}
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                value={state.query}
                onChange={(event) => actions.handleSearchChange(event.target.value)}
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
            aria-label="Nuevo paciente"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>

        {/* Tabla */}
        <div className="mt-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">RUN</th>
                <th className="px-4 py-3 font-medium">Telefono</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {state.loading && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                    Cargando pacientes...
                  </td>
                </tr>
              )}
              {!state.loading && state.items.length === 0 && !state.query.trim() && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                    No hay pacientes registrados.
                  </td>
                </tr>
              )}
              {!state.loading && state.items.length === 0 && state.query.trim() && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                    No se encontraron pacientes con ese criterio.
                  </td>
                </tr>
              )}
              {state.items.map((patient, idx) => {
                const initials = `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();
                return (
                  <tr
                    key={patient.id}
                    style={{ animationDelay: `${idx * 25}ms` }}
                    className="animate-card-in group cursor-pointer border-b border-slate-50 transition-colors last:border-b-0 hover:bg-slate-50/70"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                          {initials}
                        </div>
                        <div>
                          <span className="font-medium text-slate-800">
                            {patient.firstName} {patient.lastName}{" "}
                            {patient.secondLastName && (
                              <span className="text-slate-400">{patient.secondLastName}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{patient.run}</td>
                    <td className="px-4 py-3 text-slate-500">{patient.phone ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-400">
                        {formatRelativeDate(patient.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                          onClick={() => actions.openEditModal(patient)}
                        >
                          Editar
                        </button>
                        <DeleteIconButton
                          ariaLabel={`Eliminar ${patient.firstName}`}
                          onClick={() => actions.setDeleteTarget(patient)}
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

      {/* ── Modal: Crear / Editar paciente ── */}
      {state.isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={actions.closeModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>

            <form onSubmit={actions.handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Nombre</label>
                  <input value={state.form.firstName} onChange={(e) => actions.handleFieldChange("firstName", e.target.value)} placeholder="Nombre" className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.firstName ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                  {state.errors.firstName && <p className="mt-1 text-[11px] text-rose-500">{state.errors.firstName}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Primer apellido</label>
                  <input value={state.form.lastName} onChange={(e) => actions.handleFieldChange("lastName", e.target.value)} placeholder="Apellido" className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.lastName ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                  {state.errors.lastName && <p className="mt-1 text-[11px] text-rose-500">{state.errors.lastName}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Segundo apellido</label>
                  <input value={state.form.secondLastName} onChange={(e) => actions.handleFieldChange("secondLastName", e.target.value)} placeholder="Opcional" className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">RUN</label>
                <input value={state.form.run} onChange={(e) => actions.handleFieldChange("run", e.target.value)} onBlur={actions.handleRunBlur} placeholder="Por favor ingresar RUN" className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.run ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                {state.errors.run && <p className="mt-1 text-[11px] text-rose-500">{state.errors.run}</p>}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Correo</label>
                <input value={state.form.email} onChange={(e) => actions.handleFieldChange("email", e.target.value)} placeholder="Por favor ingresar un correo" className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.email ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                {state.errors.email && <p className="mt-1 text-[11px] text-rose-500">{state.errors.email}</p>}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Numero de telefono</label>
                <div className="relative">
                  <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  <input value={state.form.phone} onChange={(e) => actions.handleFieldChange("phone", e.target.value)} placeholder="+56 9 1234 5678" className={`w-full rounded-xl border bg-slate-50/40 py-2.5 pl-9 pr-3 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.phone ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                </div>
                {state.errors.phone && <p className="mt-1 text-[11px] text-rose-500">{state.errors.phone}</p>}
              </div>

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

      {/* ── Toast de éxito ── */}
      {state.successMessage && (
        <div className="animate-fade-in fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {state.successMessage}
        </div>
      )}

      {/* ── Modal: Eliminar paciente ── */}
      {state.deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={actions.dismissDeleteModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar paciente</h3>
            <p className="mt-2 text-sm text-slate-500">
              ¿Estás seguro de eliminar al paciente {state.deleteTarget.firstName} {state.deleteTarget.lastName}?
              Esta acción no se puede deshacer.
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
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
