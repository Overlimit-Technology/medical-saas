"use client";

import { useEffect, useState } from "react";

type Doctor = {
  id: string;
  email: string;
  profile?: { firstName: string; lastName: string } | null;
  doctorProfile?: { rut: string; specialty?: string | null } | null;
};

export default function DoctorsPage() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    rut: "",
    specialty: "",
  });

  const load = async () => {
    const res = await fetch("/api/doctors");
    const data = await res.json();
    if (data.ok) setItems(data.items);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.ok) {
      setForm({ email: "", password: "", firstName: "", lastName: "", rut: "", specialty: "" });
      load();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Doctores</h1>
        <p className="text-sm text-slate-500">Asignados a la sede actual.</p>

        <div className="mt-6 space-y-3">
          {items.map((doctor) => (
            <div key={doctor.id} className="rounded-xl border border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {doctor.profile?.firstName} {doctor.profile?.lastName}
              </p>
              <p className="text-xs text-slate-500">{doctor.email}</p>
              <p className="text-xs text-slate-400">{doctor.doctorProfile?.rut}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Nuevo doctor</h2>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <input
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="Correo"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="Password"
            type="password"
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
            placeholder="RUT"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.specialty}
            onChange={(event) => setForm({ ...form, specialty: event.target.value })}
            placeholder="Especialidad"
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
