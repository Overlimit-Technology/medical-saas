"use client";

import { useProfileViewModel, getInitials } from "./ProfileViewModel";

export default function Profile() {
  const { state, actions } = useProfileViewModel();
  const { form, clinicLabel, loading, saving, uploading, error, success, fullName } = state;
  const { setForm, submit, handleFileUpload } = actions;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Configuracion personal</p>
        <h1 className="text-2xl font-semibold text-slate-900">Mi perfil</h1>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {form.image ? (
              <img
                src={form.image}
                alt={fullName}
                className="h-28 w-28 rounded-[28px] object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-slate-900 text-3xl font-semibold text-white">
                {getInitials(form.firstName, form.lastName, form.email)}
              </div>
            )}
            <h2 className="mt-4 text-xl font-semibold text-slate-900">{fullName}</h2>
            <p className="mt-1 text-sm text-slate-500">{form.email}</p>
            <div className="mt-4 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              {clinicLabel}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Nombre</span>
                <input
                  value={form.firstName}
                  onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Apellido</span>
                <input
                  value={form.lastName}
                  onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-slate-600">
              <span>Correo</span>
              <input
                value={form.email}
                disabled
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Telefono</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Rol</span>
                <input
                  value={form.role}
                  disabled
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                />
              </label>
            </div>

            <div className="grid gap-3">
              <span className="text-sm text-slate-600">Foto de perfil</span>
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-slate-100">
                <span>{uploading ? "Subiendo imagen..." : "Seleccionar imagen"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {form.image ? (
                <input
                  value={form.image}
                  onChange={(event) => setForm({ ...form, image: event.target.value })}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <button
                type="submit"
                disabled={loading || saving || uploading}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {success && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {success}
        </div>
      )}
    </div>
  );
}
