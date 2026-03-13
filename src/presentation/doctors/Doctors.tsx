"use client";

import { DeleteIconButton } from "@/presentation/common/DeleteIconButton";
import { useDoctorsViewModel, type UserRole } from "./DoctorsViewModel";

export default function Doctors() {
  const { state, actions } = useDoctorsViewModel();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-500">Asignados a la sede actual.</p>
        {state.apiError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.apiError}</div>
        )}

        <div className="mt-6 space-y-3">
          {state.items.map((user) => (
            <div key={user.id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{user.profile?.firstName} {user.profile?.lastName}</p>
                <DeleteIconButton ariaLabel={`Eliminar ${user.profile?.firstName ?? "usuario"}`} disabled={Boolean(state.deletingId)} className={state.deletingId === user.id ? "animate-pulse" : ""} onClick={() => actions.handleDelete(user)} />
              </div>
              <p className="text-xs text-slate-500">{user.email}</p>
              <p className="text-xs text-slate-500">{user.role === "DOCTOR" ? "Doctor" : "Secretaria"}</p>
              <p className="text-xs text-slate-400">{user.doctorProfile?.rut ?? user.profile?.rut}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Nuevo usuario</h2>
        <p className="mt-1 text-xs text-slate-500">La contrasena se genera automaticamente y se envia al correo.</p>
        <form onSubmit={actions.submit} className="mt-4 grid gap-3">
          <select value={state.form.role} onChange={(e) => actions.handleFormChange("role", e.target.value as UserRole)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="DOCTOR">Doctor</option>
            <option value="SECRETARY">Secretaria</option>
          </select>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sedes</p>
            <p className="mt-1 text-xs text-slate-400">Selecciona una o mas sedes para este usuario.</p>
            <div className="mt-3 grid gap-2">
              {state.clinics.length === 0 && <p className="text-xs text-slate-400">Sin sedes disponibles.</p>}
              {state.clinics.map((clinic) => {
                const checked = state.form.clinicIds.includes(clinic.id);
                return (
                  <label key={clinic.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <span>{clinic.name} - {clinic.city}</span>
                    <input type="checkbox" checked={checked} onChange={() => actions.toggleClinic(clinic.id)} className="h-4 w-4 accent-slate-900" />
                  </label>
                );
              })}
            </div>
          </div>
          <input value={state.form.email} onChange={(e) => actions.handleFormChange("email", e.target.value)} placeholder="Correo" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input value={state.form.firstName} onChange={(e) => actions.handleFormChange("firstName", e.target.value)} placeholder="Nombre" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input value={state.form.lastName} onChange={(e) => actions.handleFormChange("lastName", e.target.value)} placeholder="Apellido" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <input value={state.form.rut} onChange={(e) => actions.handleFormChange("rut", e.target.value)} placeholder="RUN" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Guardar</button>
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
