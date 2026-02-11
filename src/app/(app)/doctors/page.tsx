"use client";

import { useEffect, useState } from "react";

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
    clinicId: "",
  });

  const loadUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (data.ok) setItems(data.items);
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
        clinicId: current.clinicId || preferredClinicId,
      }));
    }
  };

  useEffect(() => {
    loadUsers();
    loadClinics();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      email: form.email,
      role: form.role,
      firstName: form.firstName,
      lastName: form.lastName,
      rut: form.rut,
      clinicId: form.clinicId || undefined,
    };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
      setForm({
        email: "",
        role: "DOCTOR",
        firstName: "",
        lastName: "",
        rut: "",
        clinicId: form.clinicId,
      });
      loadUsers();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-500">Asignados a la sede actual.</p>

        <div className="mt-6 space-y-3">
          {items.map((user) => (
            <div key={user.id} className="rounded-xl border border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {user.profile?.firstName} {user.profile?.lastName}
              </p>
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
          <div className="grid grid-cols-2 gap-3">
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
            <select
              value={form.clinicId}
              onChange={(event) => setForm({ ...form, clinicId: event.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {clinics.length === 0 && <option value="">Sede</option>}
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name} - {clinic.city}
                </option>
              ))}
            </select>
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
    </div>
  );
}
