"use client";

import { useEffect, useMemo, useState } from "react";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
};

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    secondLastName: "",
    run: "",
    email: "",
    phone: "",
  });

  const loadPatients = async (q?: string) => {
    setLoading(true);
    const res = await fetch(`/api/patients?q=${encodeURIComponent(q ?? "")}`);
    const data = await res.json();
    if (data.ok) {
      setItems(data.items);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selected) {
      setForm({
        firstName: selected.firstName,
        lastName: selected.lastName,
        secondLastName: selected.secondLastName ?? "",
        run: selected.run,
        email: selected.email ?? "",
        phone: selected.phone ?? "",
      });
    } else {
      setForm({
        firstName: "",
        lastName: "",
        secondLastName: "",
        run: "",
        email: "",
        phone: "",
      });
    }
  }, [selected]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) =>
      `${item.firstName} ${item.lastName} ${item.run}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      ...form,
    };

    if (selected) {
      const res = await fetch(`/api/patients/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        await loadPatients(query);
      }
    } else {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        await loadPatients(query);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Lista de pacientes</p>
            <h1 className="text-xl font-semibold text-slate-900">Pacientes</h1>
          </div>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              loadPatients(event.target.value);
            }}
            placeholder="Buscar"
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">RUN</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={3}>
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={3}>
                    Sin resultados
                  </td>
                </tr>
              )}
              {filteredItems.map((patient) => (
                <tr
                  key={patient.id}
                  className={`cursor-pointer border-t border-slate-100 ${
                    selected?.id === patient.id ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
                  onClick={() => setSelected(patient)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{patient.run}</td>
                  <td className="px-4 py-3 text-slate-500">{patient.phone ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Formulario</p>
            <h2 className="text-lg font-semibold">
              {selected ? "Editar paciente" : "Nuevo paciente"}
            </h2>
          </div>
          {selected && (
            <button
              className="text-xs text-slate-500 hover:text-slate-900"
              onClick={() => setSelected(null)}
            >
              Limpiar
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
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
            value={form.secondLastName}
            onChange={(event) => setForm({ ...form, secondLastName: event.target.value })}
            placeholder="Segundo apellido"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.run}
            onChange={(event) => setForm({ ...form, run: event.target.value })}
            placeholder="RUN"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="Correo"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="Telefono"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
