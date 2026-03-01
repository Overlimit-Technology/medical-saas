"use client";

import { useEffect, useState } from "react";
import { DeleteIconButton } from "@/presentation/common/DeleteIconButton";

type UserRole = "DOCTOR" | "SECRETARY";

type Clinic = {
  id: string;
  name: string;
  city: string;
};

type User = {
  id: string;
  email: string;
  role: UserRole;
  profile?: { firstName: string; lastName: string; rut?: string | null } | null;
  doctorProfile?: { rut: string; specialty?: string | null } | null;
};

export default function DoctorsPage() {
  const [items, setItems] = useState<User[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [form, setForm] = useState({
    email: "",
    role: "DOCTOR" as UserRole,
    firstName: "",
    lastName: "",
    rut: "",
    clinicIds: [] as string[],
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setApiError(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.ok) {
        setItems(data.items ?? []);
        return;
      }
      setApiError(data.error ?? "No se pudieron cargar los usuarios.");
    } catch {
      setApiError("No se pudieron cargar los usuarios.");
    }
  };

  const loadClinics = async () => {
    const res = await fetch("/api/clinics/my");
    const data = await res.json();
    if (!data.ok) return;

    setClinics(data.items ?? []);

    const preferredClinicId =
      data.activeClinicId ?? (data.items && data.items.length > 0 ? data.items[0].id : "");
    if (preferredClinicId) {
      setForm((current) => ({
        ...current,
        clinicIds: current.clinicIds.length > 0 ? current.clinicIds : [preferredClinicId],
      }));
    }
  };

  useEffect(() => {
    loadUsers();
    loadClinics();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError(null);
    const payload = {
      email: form.email,
      role: form.role,
      firstName: form.firstName,
      lastName: form.lastName,
      rut: form.rut,
      clinicIds: form.clinicIds.length > 0 ? form.clinicIds : undefined,
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo crear el usuario.");
        return;
      }
      setForm({
        email: "",
        role: "DOCTOR",
        firstName: "",
        lastName: "",
        rut: "",
        clinicIds: form.clinicIds,
      });
      setSuccessMessage("Usuario creado.");
      await loadUsers();
    } catch {
      setApiError("No se pudo crear el usuario.");
    }
  };

  const handleDelete = async (user: User) => {
    const displayName = `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim();
    const label = displayName || user.email;
    const confirmed = window.confirm(
      `Confirma eliminar al usuario "${label}". Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setApiError(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo eliminar el usuario.");
        return;
      }

      setSuccessMessage(
        data.softDeleted
          ? "Usuario desactivado porque tiene citas futuras."
          : "Usuario eliminado."
      );
      await loadUsers();
    } catch {
      setApiError("No se pudo eliminar el usuario.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleClinic = (clinicId: string) => {
    setForm((current) => {
      const isSelected = current.clinicIds.includes(clinicId);
      return {
        ...current,
        clinicIds: isSelected
          ? current.clinicIds.filter((id) => id !== clinicId)
          : [...current.clinicIds, clinicId],
      };
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-500">Asignados a la sede actual.</p>
        {apiError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {apiError}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {items.map((user) => (
            <div key={user.id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                  {user.profile?.firstName} {user.profile?.lastName}
                </p>
                <DeleteIconButton
                  ariaLabel={`Eliminar ${user.profile?.firstName ?? "usuario"}`}
                  disabled={Boolean(deletingId)}
                  className={deletingId === user.id ? "animate-pulse" : ""}
                  onClick={() => handleDelete(user)}
                />
              </div>
              <p className="text-xs text-slate-500">{user.email}</p>
              <p className="text-xs text-slate-500">
                {user.role === "DOCTOR" ? "Doctor" : "Secretaria"}
              </p>
              <p className="text-xs text-slate-400">
                {user.doctorProfile?.rut ?? user.profile?.rut}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Nuevo usuario</h2>
        <p className="mt-1 text-xs text-slate-500">
          La contrasena se genera automaticamente y se envia al correo.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <select
            value={form.role}
            onChange={(event) =>
              setForm({ ...form, role: event.target.value as UserRole })
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="DOCTOR">Doctor</option>
            <option value="SECRETARY">Secretaria</option>
          </select>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sedes
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Selecciona una o mas sedes para este usuario.
            </p>
            <div className="mt-3 grid gap-2">
              {clinics.length === 0 && (
                <p className="text-xs text-slate-400">Sin sedes disponibles.</p>
              )}
              {clinics.map((clinic) => {
                const checked = form.clinicIds.includes(clinic.id);
                return (
                  <label
                    key={clinic.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <span>
                      {clinic.name} - {clinic.city}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleClinic(clinic.id)}
                      className="h-4 w-4 accent-slate-900"
                    />
                  </label>
                );
              })}
            </div>
          </div>
          <input
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="Correo"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              placeholder="Nombre"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              placeholder="Apellido"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <input
            value={form.rut}
            onChange={(event) => setForm({ ...form, rut: event.target.value })}
            placeholder="RUN"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Guardar
          </button>
        </form>
      </div>

      {successMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {successMessage}
        </div>
      )}
    </div>
  );
}
